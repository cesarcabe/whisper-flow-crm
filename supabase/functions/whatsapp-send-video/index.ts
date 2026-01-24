import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_BASE_URL = Deno.env.get("EVOLUTION_BASE_URL")!;
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Upload base64 video to Supabase storage and return public URL
async function uploadToStorage(
  supabase: any,
  base64Data: string,
  mimeType: string,
  workspaceId: string
): Promise<string | null> {
  try {
    // Decode base64 to Uint8Array
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Determine file extension from mime type
    const ext = mimeType.split('/')[1] || 'mp4';
    const fileName = `${workspaceId}/videos/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    
    console.log('[Edge:whatsapp-send-video] uploading_to_storage', { fileName, size: binaryData.length });
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, binaryData, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (uploadError) {
      console.log('[Edge:whatsapp-send-video] storage_upload_error', { error: uploadError.message });
      return null;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);
    
    console.log('[Edge:whatsapp-send-video] storage_upload_success', { url: publicUrlData.publicUrl });
    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.log('[Edge:whatsapp-send-video] storage_upload_exception', { error: error.message });
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  console.log('[Edge:whatsapp-send-video] start');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Get auth token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ ok: false, message: "Missing authorization" }, 401);
  }

  // Verify user
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.log('[Edge:whatsapp-send-video] auth_error', { error: authError?.message });
    return json({ ok: false, message: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const { conversationId, videoBase64, mimeType, caption } = body;

  if (!conversationId || !videoBase64) {
    return json({ ok: false, message: "Missing conversationId or videoBase64" }, 400);
  }

  console.log('[Edge:whatsapp-send-video] sending', { 
    conversationId, 
    videoSize: videoBase64.length,
    mimeType,
    hasCaption: !!caption
  });

  try {
    // Get conversation with contact and whatsapp number info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        workspace_id,
        contact_id,
        whatsapp_number_id,
        remote_jid,
        is_group,
        contacts!conversations_contact_id_fkey (
          id,
          phone
        ),
        whatsapp_numbers!conversations_whatsapp_number_id_fkey (
          id,
          instance_name,
          api_key,
          status
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.log('[Edge:whatsapp-send-video] conversation_not_found', { error: convError?.message });
      return json({ ok: false, message: "Conversation not found" }, 404);
    }

    // Check if user is a workspace member
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', conversation.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return json({ ok: false, message: "Not a workspace member" }, 403);
    }

    const whatsappNumber = conversation.whatsapp_numbers as any;
    const contact = conversation.contacts as any;

    if (!whatsappNumber?.instance_name) {
      return json({ ok: false, message: "WhatsApp instance not configured" }, 400);
    }

    if (whatsappNumber.status !== 'connected') {
      return json({ ok: false, message: "WhatsApp not connected" }, 400);
    }

    // Upload video to storage first
    const storedMediaUrl = await uploadToStorage(
      supabase, 
      videoBase64, 
      mimeType || 'video/mp4',
      conversation.workspace_id
    );

    // Determine destination
    const remoteJid = conversation.remote_jid || `${contact?.phone}@s.whatsapp.net`;

    // Insert message with 'sending' status and storage URL
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        workspace_id: conversation.workspace_id,
        conversation_id: conversationId,
        whatsapp_number_id: conversation.whatsapp_number_id,
        body: caption || '🎬 Vídeo',
        type: 'video',
        is_outgoing: true,
        status: 'sending',
        sent_by_user_id: user.id,
        media_url: storedMediaUrl, // Set immediately for preview
      })
      .select('id')
      .single();

    if (insertError) {
      console.log('[Edge:whatsapp-send-video] insert_error', { error: insertError.message });
      return json({ ok: false, message: "Failed to create message" }, 500);
    }

    const messageId = insertedMessage.id;

    // Send via Evolution API - using sendMedia endpoint
    const baseUrl = EVOLUTION_BASE_URL.replace(/\/+$/, ''); // Remove trailing slashes
    const evolutionUrl = `${baseUrl}/message/sendMedia/${whatsappNumber.instance_name}`;
    
    console.log('[Edge:whatsapp-send-video] calling_evolution', { 
      instance: whatsappNumber.instance_name,
      remoteJid 
    });

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'video',
        media: videoBase64,
        caption: caption || '',
        fileName: `video-${Date.now()}.mp4`,
      }),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.log('[Edge:whatsapp-send-video] evolution_error', { 
        status: evolutionResponse.status,
        data: evolutionData 
      });

      // Update message status to failed
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_message: evolutionData?.message || 'Failed to send video',
        })
        .eq('id', messageId);

      return json({ 
        ok: false, 
        message: evolutionData?.message || "Evolution API error",
        messageId 
      }, 500);
    }

    // Extract external message ID from Evolution response
    const externalId = evolutionData?.key?.id || evolutionData?.messageId || evolutionData?.id || null;

    // Update message with success status (keep our storage URL, not Evolution's temporary one)
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        external_id: externalId,
      })
      .eq('id', messageId);

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    console.log('[Edge:whatsapp-send-video] success', { messageId, externalId, storedMediaUrl });

    return json({ 
      ok: true, 
      messageId,
      externalId,
      mediaUrl: storedMediaUrl,
    });

  } catch (error: any) {
    console.log('[Edge:whatsapp-send-video] error', { error: error.message });
    return json({ ok: false, message: error.message || "Internal error" }, 500);
  }
});
