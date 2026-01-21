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
    supabase, workspaceId, eventType, instanceName, data, 
    deliveryId, providerEventId, evolutionBaseUrl, evolutionApiKey 
  } = ctx;

  const wa = await ensureWhatsappNumber(supabase, workspaceId, instanceName);
  if (!wa) {
    await markDelivery(supabase, deliveryId, "failed", "Missing instanceName or instance not found");
    return json({ ok: false, message: "Missing instanceName" }, 422);
  }

  // Usar o workspace_id real da conexão (pode ter sido transferida)
  const realWorkspaceId = wa.workspace_id;

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

  const contactId = await upsertContact(supabase, realWorkspaceId, phone, pushName, avatarUrl);
  const conversationId = await upsertConversation(supabase, realWorkspaceId, contactId, wa.id, remoteJid);

  await supabase.from("conversation_events").insert({
    workspace_id: realWorkspaceId,
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
        .eq("workspace_id", realWorkspaceId)
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

  if (mediaResult.needsDownload && instanceName && key) {
    try {
      const storedUrl = await downloadAndStoreMedia(
        supabase,
        evolutionBaseUrl,
        evolutionApiKey,
        instanceName,
        key,
        messageType,
        realWorkspaceId
      );
      if (storedUrl) {
        mediaUrl = storedUrl;
        console.log('[Edge:evolution-webhook] media_stored', { messageType, url: storedUrl });
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

  const { error: msgErr } = await supabase.from("messages").insert({
    workspace_id: realWorkspaceId,
    conversation_id: conversationId,
    whatsapp_number_id: wa.id,
    external_id: providerEventId,
    is_outgoing: isFromMe,
    body: bodyTextFinal,
    type: messageType,
    media_url: mediaUrl,
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
