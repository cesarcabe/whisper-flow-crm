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

// Upload base64 audio to Supabase storage and return public URL
async function uploadToStorage(
  supabase: any,
  base64Data: string,
  mimeType: string,
  workspaceId: string
): Promise<{ publicUrl: string; path: string } | null> {
  try {
    // Decode base64 to Uint8Array
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Determine file extension from mime type
    let ext = 'ogg';
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a';
    
    const fileName = `${workspaceId}/audio/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    
    console.log('[Edge:whatsapp-send-audio] uploading_to_storage', { fileName, size: binaryData.length, mimeType });
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, binaryData, {
        contentType: mimeType || 'audio/ogg',
        upsert: false,
      });
    
    if (uploadError) {
      console.log('[Edge:whatsapp-send-audio] storage_upload_error', { error: uploadError.message });
      return null;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);
    
    console.log('[Edge:whatsapp-send-audio] storage_upload_success', { url: publicUrlData.publicUrl });
    return { publicUrl: publicUrlData.publicUrl, path: fileName };
  } catch (error: any) {
    console.log('[Edge:whatsapp-send-audio] storage_upload_exception', { error: error.message });
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

  console.log('[Edge:whatsapp-send-audio] start');

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
    console.log('[Edge:whatsapp-send-audio] auth_error', { error: authError?.message });
    return json({ ok: false, message: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const { conversationId, audioBase64, storagePath, mimeType, clientMessageId, replyToId, quotedMessage: clientQuoted, isVoiceNote } = body;

  if (!conversationId || (!audioBase64 && !storagePath)) {
    return json({ ok: false, message: "Missing conversationId or audioBase64/storagePath" }, 400);
  }

  console.log('[Edge:whatsapp-send-audio] sending', { 
    conversationId, 
    audioSize: audioBase64.length,
    mimeType 
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
      console.log('[Edge:whatsapp-send-audio] conversation_not_found', { error: convError?.message });
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

    // Upload audio to storage first (if not already uploaded)
    let stored: { publicUrl: string; path: string } | null = null;
    let finalBase64: string = audioBase64 || '';
    
    if (storagePath) {
      // File already uploaded, download and convert to base64
      const { data: downloaded, error: downloadError } = await supabase.storage
        .from('media')
        .download(storagePath);
      
      if (downloadError || !downloaded) {
        console.log('[Edge:whatsapp-send-audio] download_error', { error: downloadError?.message });
        return json({ ok: false, message: "Failed to download media from storage" }, 500);
      }
      
      // Convert blob to base64
      const buffer = new Uint8Array(await downloaded.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buffer.length; i += 1) {
        binary += String.fromCharCode(buffer[i]);
      }
      finalBase64 = btoa(binary);
      
      // Get public URL for storage path
      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath);
      stored = { publicUrl: publicUrlData.publicUrl, path: storagePath };
    } else if (audioBase64) {
      // Upload base64 to storage
      stored = await uploadToStorage(
        supabase, 
        audioBase64, 
        mimeType || 'audio/ogg',
        conversation.workspace_id
      );
      finalBase64 = audioBase64;
    }

    // Determine destination
    const remoteJid = conversation.remote_jid || `${contact?.phone}@s.whatsapp.net`;

    // Load quoted message (if replying)
    let quotedMessage: { id: string; body: string; type: string; is_outgoing: boolean; media_url?: string | null; thumbnail_url?: string | null } | null = null;
    let providerReplyId: string | null = null;
    if (replyToId) {
      const { data: quotedRow } = await supabase
        .from('messages')
        .select('id, body, type, is_outgoing, media_url, thumbnail_url, media_path, thumbnail_path, external_id')
        .eq('id', replyToId)
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (quotedRow) {
        quotedMessage = {
          id: quotedRow.id,
          body: quotedRow.body ?? '',
          type: quotedRow.type ?? 'text',
          is_outgoing: quotedRow.is_outgoing ?? false,
          media_url: quotedRow.media_url ?? null,
          thumbnail_url: quotedRow.thumbnail_url ?? null,
          media_path: quotedRow.media_path ?? null,
          thumbnail_path: quotedRow.thumbnail_path ?? null,
        };
        providerReplyId = quotedRow.external_id ?? null;
      }
    }

    if (!quotedMessage && clientQuoted && typeof clientQuoted === 'object') {
      quotedMessage = {
        id: String(clientQuoted.id ?? ''),
        body: String(clientQuoted.body ?? ''),
        type: String(clientQuoted.type ?? 'text'),
        is_outgoing: Boolean(clientQuoted.isOutgoing ?? false),
        media_url: clientQuoted.mediaUrl ? String(clientQuoted.mediaUrl) : null,
        thumbnail_url: clientQuoted.thumbnailUrl ? String(clientQuoted.thumbnailUrl) : null,
      };
    }

    // Insert message with 'sending' status and storage URL
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        workspace_id: conversation.workspace_id,
        conversation_id: conversationId,
        whatsapp_number_id: conversation.whatsapp_number_id,
        client_id: clientMessageId ?? null,
        body: '🎤 Áudio',
        type: 'audio',
        media_type: 'audio',
        mime_type: mimeType ?? 'audio/ogg',
        is_outgoing: true,
        status: 'sending',
        sent_by_user_id: user.id,
        media_url: stored?.publicUrl ?? null, // Compatibilidade
        media_path: stored?.path ?? null,
        reply_to_id: replyToId ?? null,
        provider_reply_id: providerReplyId,
        quoted_message: quotedMessage,
      })
      .select('id')
      .single();

    if (insertError) {
      console.log('[Edge:whatsapp-send-audio] insert_error', { error: insertError.message });
      return json({ ok: false, message: "Failed to create message" }, 500);
    }

    const messageId = insertedMessage.id;

    // Send via Evolution API - using sendWhatsAppAudio endpoint
    const evolutionUrl = `${EVOLUTION_BASE_URL}/message/sendWhatsAppAudio/${whatsappNumber.instance_name}`;
    
    console.log('[Edge:whatsapp-send-audio] calling_evolution', { 
      instance: whatsappNumber.instance_name,
      remoteJid 
    });

    const payload: Record<string, unknown> = {
      number: remoteJid,
      audio: finalBase64,
      encoding: true,
      ptt: Boolean(isVoiceNote),
    };

    if (providerReplyId) {
      payload.quotedMessageId = providerReplyId;
      payload.quoted = { key: { id: providerReplyId, remoteJid } };
    }

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.log('[Edge:whatsapp-send-audio] evolution_error', { 
        status: evolutionResponse.status,
        data: evolutionData 
      });

      // Update message status to failed
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_message: evolutionData?.message || 'Failed to send audio',
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

    // Update message with success status (keep our storage URL)
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

    console.log('[Edge:whatsapp-send-audio] success', { messageId, externalId, storedMediaUrl: stored?.publicUrl });

    return json({ 
      ok: true, 
      messageId,
      externalId,
      mediaUrl: stored?.publicUrl,
    });

  } catch (error: any) {
    console.log('[Edge:whatsapp-send-audio] error', { error: error.message });
    return json({ ok: false, message: error.message || "Internal error" }, 500);
  }
});
