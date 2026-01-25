/**
 * Handler para messages.upsert
 * 
 * Processa novas mensagens recebidas:
 * - Normaliza envelope para extrair JIDs corretamente
 * - Resolve contato baseado em sender (participant em grupos)
 * - Resolve conversa com suporte a aliases PN/LID
 * - Salva mensagem com sender_jid
 */

import type { WebhookContext } from "../types.ts";
import { json } from "../utils/response.ts";
import { normalizeEvolutionEnvelope } from "../utils/envelopeNormalizer.ts";
import { ensureWhatsappNumber } from "../services/whatsappService.ts";
import { markDelivery } from "../services/deliveryService.ts";
import { resolveContact, fetchProfilePicture } from "../services/contactService.ts";
import { resolveConversation } from "../services/conversationService.ts";
import { detectMediaType, downloadAndStoreMedia } from "../services/mediaService.ts";

export async function handleMessageUpsert(ctx: WebhookContext): Promise<Response> {
  const { 
    supabase, eventType, instanceName, data, 
    deliveryId, providerEventId, evolutionBaseUrl, evolutionApiKey 
  } = ctx;
  
  console.log('[Edge:evolution-webhook] handleMessageUpsert start');
  
  // 1) Garantir instância WhatsApp
  const wa = await ensureWhatsappNumber(supabase, instanceName);
  if (!wa) {
    console.log('[Edge:evolution-webhook] handleMessageUpsert: instance not found', { 
      instanceName 
    });
    await markDelivery(supabase, deliveryId, "failed", "Instance not found");
    return json({ ok: false, message: "Instance not found" }, 422);
  }
  
  const workspaceId = wa.workspace_id;
  
  // 2) Normalizar envelope
  const envelope = normalizeEvolutionEnvelope(data);
  if (!envelope) {
    console.log('[Edge:evolution-webhook] handleMessageUpsert: failed to normalize envelope');
    await markDelivery(supabase, deliveryId, "ignored", "Could not parse envelope");
    return json({ ok: true, ignored: true });
  }
  
  console.log('[Edge:evolution-webhook] handleMessageUpsert: envelope parsed', {
    conversationType: envelope.conversationType,
    conversationJid: envelope.conversationJid,
    senderJid: envelope.senderJid,
    senderPhone: envelope.senderPhone,
    hasAlt: !!envelope.remoteJidAlt,
    messageType: envelope.messageType,
    fromMe: envelope.fromMe,
  });
  
  // 3) Resolver contato (baseado no sender, não no conversation jid)
  let avatarUrl: string | null = null;
  
  // Buscar avatar apenas para DMs com phone válido
  if (envelope.conversationType === 'dm' && envelope.senderPhone && instanceName && !envelope.fromMe) {
    avatarUrl = await fetchProfilePicture(
      evolutionBaseUrl, 
      evolutionApiKey, 
      instanceName, 
      envelope.senderPhone
    );
  }
  
  const contactId = await resolveContact(
    supabase,
    workspaceId,
    envelope.senderPhone,
    envelope.senderJid,
    envelope.pushName,
    avatarUrl,
    envelope.conversationType === 'group',
  );
  
  console.log('[Edge:evolution-webhook] handleMessageUpsert: contact resolved', { 
    contactId,
    senderJid: envelope.senderJid 
  });
  
  // 4) Resolver conversa com suporte a aliases
  const { conversationId, isNew } = await resolveConversation(
    supabase,
    workspaceId,
    contactId,
    wa.id,
    envelope.conversationJid,
    envelope.remoteJidAlt,
    envelope.conversationType === 'group',
  );
  
  console.log('[Edge:evolution-webhook] handleMessageUpsert: conversation resolved', { 
    conversationId,
    isNew,
    conversationJid: envelope.conversationJid 
  });
  
  // 5) Registrar evento
  await supabase.from("conversation_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    provider: "evolution",
    event_type: eventType,
    provider_event_id: providerEventId,
    metadata: { 
      senderJid: envelope.senderJid,
      conversationType: envelope.conversationType,
    },
  });
  
  // 6) Processar mídia
  const key = data?.key as Record<string, unknown> | undefined;
  const mediaResult = detectMediaType(data as Record<string, unknown>);
  let messageType = mediaResult.type;
  let bodyText = mediaResult.type === "text" ? envelope.text : mediaResult.text;
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
        workspaceId
      );
      if (storedUrl) {
        mediaUrl = storedUrl;
        console.log('[Edge:evolution-webhook] handleMessageUpsert: media stored', { 
          messageType, 
          url: storedUrl 
        });
      }
    } catch (mediaError: unknown) {
      const errorMessage = mediaError instanceof Error ? mediaError.message : String(mediaError);
      console.log('[Edge:evolution-webhook] handleMessageUpsert: media download error', { 
        error: errorMessage 
      });
    }
  }
  
  // 7) Inserir mensagem com sender_jid
  const { error: msgErr } = await supabase.from("messages").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    whatsapp_number_id: wa.id,
    external_id: envelope.providerMessageId ?? providerEventId,
    is_outgoing: envelope.fromMe,
    body: bodyText,
    type: messageType,
    media_url: mediaUrl,
    status: envelope.fromMe ? "sent" : "delivered",
    sender_jid: envelope.senderJid, // NOVO: salvar JID do autor real
  });
  
  if (msgErr) {
    const m = (msgErr.message ?? "").toLowerCase();
    if (!(m.includes("duplicate") || m.includes("unique") || m.includes("conflict"))) {
      console.log('[Edge:evolution-webhook] handleMessageUpsert: insert error', { 
        error: msgErr.message 
      });
      throw new Error("Failed to insert message: " + msgErr.message);
    }
    console.log('[Edge:evolution-webhook] handleMessageUpsert: duplicate message ignored');
  }
  
  // 8) Atualizar timestamp da conversa
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  
  console.log('[Edge:evolution-webhook] handleMessageUpsert: success', { 
    conversationId,
    messageType 
  });
  
  await markDelivery(supabase, deliveryId, "processed");
  return json({ ok: true });
}
