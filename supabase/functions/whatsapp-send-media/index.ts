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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  console.log('[Edge:whatsapp-send-media] start');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ ok: false, message: "Missing authorization" }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.log('[Edge:whatsapp-send-media] auth_error', { error: authError?.message });
    return json({ ok: false, message: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

    const {
    conversationId,
    clientMessageId,
    mediaType,
    caption,
    mediaUrl,
    storagePath,
      thumbnailPath,
    mimeType,
    sizeBytes,
    durationMs,
    thumbnailUrl,
    replyToId,
    quotedMessage: clientQuoted,
    isVoiceNote,
  } = body;

  if (!conversationId || !mediaType) {
    return json({ ok: false, message: "Missing conversationId or mediaType" }, 400);
  }

    if (!storagePath && !mediaUrl) {
    return json({ ok: false, message: "Missing storagePath or mediaUrl" }, 400);
  }

  console.log('[Edge:whatsapp-send-media] sending', { conversationId, mediaType });

  try {
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
      console.log('[Edge:whatsapp-send-media] conversation_not_found', { error: convError?.message });
      return json({ ok: false, message: "Conversation not found" }, 404);
    }

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

    const remoteJid = conversation.remote_jid || `${contact?.phone}@s.whatsapp.net`;

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

    const fallbackBody = mediaType === 'image'
      ? '📷 Imagem'
      : mediaType === 'video'
      ? '🎬 Vídeo'
      : '🎤 Áudio';

    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        workspace_id: conversation.workspace_id,
        conversation_id: conversationId,
        whatsapp_number_id: conversation.whatsapp_number_id,
        client_id: clientMessageId ?? null,
        body: caption || fallbackBody,
        type: mediaType,
        media_type: mediaType,
        media_path: storagePath ?? null,
        mime_type: mimeType ?? null,
        size_bytes: sizeBytes ?? null,
        duration_ms: durationMs ?? null,
        thumbnail_url: thumbnailUrl ?? null,
        thumbnail_path: thumbnailPath ?? null,
        media_url: mediaUrl ?? null,
        is_outgoing: true,
        status: 'sending',
        sent_by_user_id: user.id,
        reply_to_id: replyToId ?? null,
        provider_reply_id: providerReplyId,
        quoted_message: quotedMessage,
      })
      .select('id')
      .single();

    if (insertError) {
      console.log('[Edge:whatsapp-send-media] insert_error', { error: insertError.message });
      return json({ ok: false, message: "Failed to create message" }, 500);
    }

    const messageId = insertedMessage.id;

    let base64Media: string | null = null;
    if (storagePath) {
      const { data: stored, error: downloadError } = await supabase.storage
        .from('media')
        .download(storagePath);

      if (downloadError || !stored) {
        console.log('[Edge:whatsapp-send-media] download_error', { error: downloadError?.message });
        await supabase.from('messages').update({
          status: 'failed',
          error_message: downloadError?.message || 'Failed to download media',
        }).eq('id', messageId);
        return json({ ok: false, message: "Failed to download media", messageId }, 500);
      }

      base64Media = await blobToBase64(stored);
    } else if (mediaUrl) {
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        await supabase.from('messages').update({
          status: 'failed',
          error_message: 'Failed to download media URL',
        }).eq('id', messageId);
        return json({ ok: false, message: "Failed to download media URL", messageId }, 500);
      }
      const blob = await response.blob();
      base64Media = await blobToBase64(blob);
    }

    if (!base64Media) {
      await supabase.from('messages').update({
        status: 'failed',
        error_message: 'Media not available for sending',
      }).eq('id', messageId);
      return json({ ok: false, message: "Media not available for sending", messageId }, 500);
    }

    const baseUrl = EVOLUTION_BASE_URL.replace(/\/+$/, '');
    const payload: Record<string, unknown> = {
      number: remoteJid,
    };

    let evolutionUrl = '';
    if (mediaType === 'audio') {
      evolutionUrl = `${baseUrl}/message/sendWhatsAppAudio/${whatsappNumber.instance_name}`;
      payload.audio = base64Media;
      payload.encoding = true;
      payload.ptt = Boolean(isVoiceNote);
    } else {
      evolutionUrl = `${baseUrl}/message/sendMedia/${whatsappNumber.instance_name}`;
      payload.mediatype = mediaType;
      payload.media = base64Media;
      payload.caption = caption || '';
      payload.fileName = `media-${Date.now()}`;
    }

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

    const evolutionData = await evolutionResponse.json().catch(() => ({}));

    if (!evolutionResponse.ok) {
      console.log('[Edge:whatsapp-send-media] evolution_error', { 
        status: evolutionResponse.status,
        data: evolutionData 
      });

      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_message: evolutionData?.message || 'Failed to send media',
        })
        .eq('id', messageId);

      return json({ 
        ok: false, 
        message: evolutionData?.message || "Evolution API error",
        messageId 
      }, 500);
    }

    const externalId = evolutionData?.key?.id || evolutionData?.messageId || evolutionData?.id || null;

    await supabase
      .from('messages')
      .update({
        status: 'sent',
        external_id: externalId,
      })
      .eq('id', messageId);

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    console.log('[Edge:whatsapp-send-media] success', { messageId, externalId, mediaUrl });

    return json({ 
      ok: true, 
      messageId,
      externalId,
      mediaUrl,
    });
  } catch (error: any) {
    console.log('[Edge:whatsapp-send-media] error', { error: error.message });
    return json({ ok: false, message: error.message || "Internal error" }, 500);
  }
});
