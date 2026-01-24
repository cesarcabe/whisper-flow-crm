import type { WebhookContext } from "../types.ts";
import { json } from "../utils/response.ts";
import { safeString } from "../utils/extract.ts";
import { normalizePhone } from "../utils/normalize.ts";
import { ensureWhatsappNumber } from "../services/whatsappService.ts";
import { markDelivery } from "../services/deliveryService.ts";
import { fetchProfilePicture, upsertContact } from "../services/contactService.ts";
import { upsertConversation } from "../services/conversationService.ts";
import { detectMediaType, downloadAndStoreMedia } from "../services/mediaService.ts";

export async function handleMessage(ctx: WebhookContext): Promise<Response> {
  const { 
    supabase, eventType, instanceName, data, 
    deliveryId, providerEventId, evolutionBaseUrl, evolutionApiKey 
  } = ctx;

  const wa = await ensureWhatsappNumber(supabase, instanceName);
  if (!wa) {
    await markDelivery(supabase, deliveryId, "failed", "Instance not found");
    return json({ ok: false, message: "Instance not found" }, 422);
  }

  // Usar workspace_id da instância (não da API key)
  const workspaceId = wa.workspace_id;

  const key = data?.key as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;
  
  const remoteJid = safeString(
    key?.remoteJid ?? data?.remoteJid ?? data?.from ?? data?.sender ?? 
    (message?.key as Record<string, unknown>)?.remoteJid ?? null,
  );

  const phone = normalizePhone(remoteJid);
  if (!phone) {
    await markDelivery(supabase, deliveryId, "ignored", "Could not extract phone from payload");
    return json({ ok: true, ignored: true });
  }

  const isFromMe = key?.fromMe === true;

  const pushName = isFromMe ? null : safeString(
    data?.pushName ?? 
    message?.pushName ?? 
    (data?.contact as Record<string, unknown>)?.name ?? 
    (data?.contact as Record<string, unknown>)?.pushname ?? 
    null
  );

  console.log('[Edge:evolution-webhook] message_contact_info', { 
    phone, 
    pushName,
    remoteJid 
  });

  let avatarUrl: string | null = null;
  if (instanceName && !remoteJid?.endsWith('@g.us')) {
    avatarUrl = await fetchProfilePicture(evolutionBaseUrl, evolutionApiKey, instanceName, phone);
  }

  const contactId = await upsertContact(supabase, workspaceId, phone, pushName, avatarUrl);
  const conversationId = await upsertConversation(supabase, workspaceId, contactId, wa.id, remoteJid);

  await supabase.from("conversation_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    provider: "evolution",
    event_type: eventType,
    provider_event_id: providerEventId,
    metadata: { raw: data },
  });

  // messages.update: só status/metadata
  if (eventType === "messages.update") {
    const update = data?.update as Record<string, unknown> | undefined;
    const newStatus = safeString(
      data?.status ?? data?.ack ?? message?.status ?? update?.status ?? null
    ) ?? null;

    if (providerEventId) {
      await supabase
        .from("messages")
        .update({ status: newStatus })
        .eq("workspace_id", workspaceId)
        .eq("whatsapp_number_id", wa.id)
        .eq("external_id", providerEventId);
    }

    await markDelivery(supabase, deliveryId, "processed");
    return json({ ok: true });
  }

  // messages.upsert: inserir mensagem
  const extendedText = message?.extendedTextMessage as Record<string, unknown> | undefined;
  const text = safeString(
    message?.conversation ?? message?.text ?? data?.text ?? data?.body ?? extendedText?.text ?? null,
  ) ?? "";

  const mediaResult = detectMediaType(data as Record<string, unknown>);
  let messageType = mediaResult.type;
  let bodyTextFinal = mediaResult.type === "text" ? text : mediaResult.text;
  let mediaUrl: string | null = null;
  let mediaPath: string | null = null;
  let mimeType: string | null = null;
  let sizeBytes: number | null = null;
  let durationMs: number | null = null;
  let thumbnailUrl: string | null = null;

  const contextInfo =
    (message?.extendedTextMessage as Record<string, unknown> | undefined)?.contextInfo ||
    (message?.imageMessage as Record<string, unknown> | undefined)?.contextInfo ||
    (message?.videoMessage as Record<string, unknown> | undefined)?.contextInfo ||
    (message?.audioMessage as Record<string, unknown> | undefined)?.contextInfo ||
    (message?.documentMessage as Record<string, unknown> | undefined)?.contextInfo ||
    (message?.stickerMessage as Record<string, unknown> | undefined)?.contextInfo ||
    null;

  const providerReplyId = safeString(
    (contextInfo as Record<string, unknown> | undefined)?.stanzaId ??
    (contextInfo as Record<string, unknown> | undefined)?.quotedMessageId ??
    (contextInfo as Record<string, unknown> | undefined)?.quotedStanzaId ??
    null
  );

  let replyToId: string | null = null;
  let quotedMessage: Record<string, unknown> | null = null;

  if (providerReplyId) {
    const { data: quotedRow } = await supabase
      .from("messages")
      .select("id, body, type, is_outgoing, media_url, thumbnail_url, media_path, thumbnail_path")
      .eq("conversation_id", conversationId)
      .eq("external_id", providerReplyId)
      .maybeSingle();

    if (quotedRow) {
      replyToId = quotedRow.id;
      quotedMessage = {
        id: quotedRow.id,
        body: quotedRow.body ?? "",
        type: quotedRow.type ?? "text",
        is_outgoing: quotedRow.is_outgoing ?? false,
        media_url: quotedRow.media_url ?? null,
        thumbnail_url: quotedRow.thumbnail_url ?? null,
        media_path: quotedRow.media_path ?? null,
        thumbnail_path: quotedRow.thumbnail_path ?? null,
      };
    }
  }

  if (!quotedMessage && contextInfo && (contextInfo as Record<string, unknown>).quotedMessage) {
    const quoted = (contextInfo as Record<string, unknown>).quotedMessage as Record<string, unknown>;
    const quotedDetect = detectMediaType({ message: quoted });
    const quotedText =
      safeString(
        (quoted.conversation as string | undefined) ??
        (quoted.text as string | undefined) ??
        (quoted.extendedTextMessage as Record<string, unknown> | undefined)?.text ??
        null
      ) ?? quotedDetect.text;

    quotedMessage = {
      id: providerReplyId ?? crypto.randomUUID(),
      body: quotedText || quotedDetect.text,
      type: quotedDetect.type,
      is_outgoing: false,
    };
  }

  if (mediaResult.needsDownload && instanceName && key) {
    try {
      const stored = await downloadAndStoreMedia(
        supabase,
        evolutionBaseUrl,
        evolutionApiKey,
        instanceName,
        key,
        messageType,
        workspaceId
      );
      if (stored) {
        mediaUrl = stored.url;
        mediaPath = stored.path;
        mimeType = stored.mimeType;
        sizeBytes = stored.sizeBytes;
        console.log('[Edge:evolution-webhook] media_stored', { messageType, url: stored.url });
      } else {
        console.log('[Edge:evolution-webhook] media_storage_failed', { messageType });
      }
    } catch (mediaError: unknown) {
      const errorMessage = mediaError instanceof Error ? mediaError.message : String(mediaError);
      console.log('[Edge:evolution-webhook] media_download_error', { error: errorMessage });
    }
  }

  console.log('[Edge:evolution-webhook] message_parsed', { 
    messageType, 
    hasMediaUrl: !!mediaUrl,
    bodyLength: bodyTextFinal.length 
  });

  const audioSeconds = (message?.audioMessage as Record<string, unknown> | undefined)?.seconds;
  const videoSeconds = (message?.videoMessage as Record<string, unknown> | undefined)?.seconds;
  const durationSeconds = Number(audioSeconds ?? videoSeconds ?? null);
  if (!Number.isNaN(durationSeconds) && durationSeconds > 0) {
    durationMs = Math.floor(durationSeconds * 1000);
  }

  const imageMime = (message?.imageMessage as Record<string, unknown> | undefined)?.mimetype;
  const videoMime = (message?.videoMessage as Record<string, unknown> | undefined)?.mimetype;
  const audioMime = (message?.audioMessage as Record<string, unknown> | undefined)?.mimetype;
  const docMime = (message?.documentMessage as Record<string, unknown> | undefined)?.mimetype;
  if (!mimeType) {
    mimeType = safeString(imageMime ?? videoMime ?? audioMime ?? docMime ?? null);
  }

  const videoThumb = (message?.videoMessage as Record<string, unknown> | undefined)?.jpegThumbnail;
  let thumbnailPath: string | null = null;
  if (videoThumb && typeof videoThumb === 'string') {
    try {
      const binaryData = Uint8Array.from(atob(videoThumb), c => c.charCodeAt(0));
      const fileName = `${workspaceId}/thumbnails/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const { error: thumbError } = await supabase.storage
        .from('media')
        .upload(fileName, binaryData, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (!thumbError) {
        const { data: publicUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        thumbnailUrl = publicUrlData.publicUrl;
        thumbnailPath = fileName;
      }
    } catch (e: unknown) {
      console.log('[Edge:evolution-webhook] thumbnail_error', { error: String(e) });
    }
  }

  const { error: msgErr } = await supabase.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    whatsapp_number_id: wa.id,
    external_id: providerEventId,
    is_outgoing: isFromMe,
    body: bodyTextFinal,
    type: messageType,
    media_type: messageType !== 'text' ? messageType : null,
    media_url: mediaUrl,
    media_path: mediaPath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    duration_ms: durationMs,
    thumbnail_url: thumbnailUrl,
    thumbnail_path: thumbnailPath,
    reply_to_id: replyToId,
    provider_reply_id: providerReplyId,
    quoted_message: quotedMessage,
    status: isFromMe ? "sent" : "delivered",
  });

  if (msgErr) {
    const m = (msgErr.message ?? "").toLowerCase();
    if (!(m.includes("duplicate") || m.includes("unique") || m.includes("conflict"))) {
      throw new Error("Failed to insert message: " + msgErr.message);
    }
  }

  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  await markDelivery(supabase, deliveryId, "processed");
  return json({ ok: true });
}
