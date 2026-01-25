/**
 * Handler para messages.update
 * 
 * Atualiza status de mensagens existentes SEM depender de:
 * - Normalização de phone
 * - Upsert de contato
 * - Upsert de conversa
 * 
 * Busca diretamente por external_id (providerMessageId)
 */

import type { WebhookContext } from "../types.ts";
import { json } from "../utils/response.ts";
import { normalizeStatusUpdate } from "../utils/envelopeNormalizer.ts";
import { ensureWhatsappNumber } from "../services/whatsappService.ts";
import { markDelivery } from "../services/deliveryService.ts";

export async function handleMessageUpdate(ctx: WebhookContext): Promise<Response> {
  const { supabase, data, deliveryId, providerEventId } = ctx;
  
  console.log('[Edge:evolution-webhook] handleMessageUpdate start');
  
  // 1) Garantir instância WhatsApp
  const wa = await ensureWhatsappNumber(supabase, ctx.instanceName);
  if (!wa) {
    console.log('[Edge:evolution-webhook] handleMessageUpdate: instance not found', { 
      instanceName: ctx.instanceName 
    });
    await markDelivery(supabase, deliveryId, "failed", "Instance not found");
    return json({ ok: false, message: "Instance not found" }, 422);
  }
  
  // 2) Normalizar payload de status
  const statusUpdate = normalizeStatusUpdate(data);
  
  // Usar providerEventId do contexto ou do payload
  const messageId = statusUpdate?.providerMessageId ?? providerEventId;
  
  if (!messageId) {
    console.log('[Edge:evolution-webhook] handleMessageUpdate: no messageId', { 
      hasStatusUpdate: !!statusUpdate,
      hasProviderEventId: !!providerEventId 
    });
    await markDelivery(supabase, deliveryId, "ignored", "No messageId for status update");
    return json({ ok: true, ignored: true });
  }
  
  const newStatus = statusUpdate?.newStatus;
  
  console.log('[Edge:evolution-webhook] handleMessageUpdate: updating', { 
    messageId,
    newStatus,
    workspaceId: wa.workspace_id,
    whatsappNumberId: wa.id 
  });
  
  // 3) UPDATE direto por external_id
  // NÃO depende de phone/contact/conversation resolution
  const { data: updated, error } = await supabase
    .from("messages")
    .update({ 
      status: newStatus,
      // Não atualizar updated_at para não interferir em ordenação
    })
    .eq("workspace_id", wa.workspace_id)
    .eq("whatsapp_number_id", wa.id)
    .eq("external_id", messageId)
    .select("id, status")
    .maybeSingle();
  
  if (error) {
    console.log('[Edge:evolution-webhook] handleMessageUpdate: update error', { 
      error: error.message,
      messageId 
    });
    // Não falhar - registrar e continuar
  }
  
  if (!updated) {
    // Mensagem não encontrada - pode ser antiga ou de outra instância
    console.log('[Edge:evolution-webhook] handleMessageUpdate: message not found', { 
      messageId,
      remoteJid: statusUpdate?.remoteJid 
    });
    await markDelivery(supabase, deliveryId, "processed", "Message not found for status update");
    return json({ ok: true, messageNotFound: true });
  }
  
  console.log('[Edge:evolution-webhook] handleMessageUpdate: success', { 
    messageId: updated.id,
    newStatus: updated.status 
  });
  
  await markDelivery(supabase, deliveryId, "processed");
  return json({ ok: true, updated: true });
}
