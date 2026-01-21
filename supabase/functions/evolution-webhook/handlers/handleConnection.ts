import type { WebhookContext } from "../types.ts";
import { json } from "../utils/response.ts";
import { safeString } from "../utils/extract.ts";
import { normalizePhone, normalizeConnectionStatus } from "../utils/normalize.ts";
import { ensureWhatsappNumber } from "../services/whatsappService.ts";
import { markDelivery } from "../services/deliveryService.ts";

export async function handleConnection(ctx: WebhookContext): Promise<Response> {
  const { supabase, workspaceId, instanceName, data, deliveryId } = ctx;

  const wa = await ensureWhatsappNumber(supabase, workspaceId, instanceName);
  if (!wa) {
    await markDelivery(supabase, deliveryId, "ignored", "Missing instanceName or instance not found");
    return json({ ok: true, ignored: true });
  }

  const rawStatus = safeString(data?.state ?? data?.status ?? data?.connection ?? null) ?? "unknown";
  const normalizedStatus = normalizeConnectionStatus(rawStatus);
  const phone = normalizePhone(safeString(data?.phone_number ?? data?.number ?? (data?.me as Record<string, unknown>)?.id ?? null));
  const lastQr = safeString(data?.qr ?? data?.last_qr ?? null);

  console.log('[Edge:evolution-webhook] connection_update', { 
    instanceName, 
    rawStatus,
    normalizedStatus,
    oldStatus: wa.status
  });

  const updates: Record<string, unknown> = {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };

  if (phone) updates.phone_number = phone;
  if (lastQr) updates.last_qr = lastQr;

  if (normalizedStatus === 'connected') {
    updates.last_connected_at = new Date().toISOString();
    updates.is_active = true;
  }
  
  if (normalizedStatus === 'disconnected' || normalizedStatus === 'error') {
    updates.is_active = false;
  }

  await supabase
    .from("whatsapp_numbers")
    .update(updates)
    .eq("id", wa.id);

  console.log('[Edge:evolution-webhook] status_updated', { 
    instanceName, 
    status: normalizedStatus,
    updatedFields: Object.keys(updates)
  });

  await markDelivery(supabase, deliveryId, "processed");
  return json({ ok: true, status: normalizedStatus });
}
