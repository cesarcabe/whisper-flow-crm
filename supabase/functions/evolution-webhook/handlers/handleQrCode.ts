import type { WebhookContext } from "../types.ts";
import { json } from "../utils/response.ts";
import { safeString } from "../utils/extract.ts";
import { ensureWhatsappNumber } from "../services/whatsappService.ts";
import { markDelivery } from "../services/deliveryService.ts";

export async function handleQrCode(ctx: WebhookContext): Promise<Response> {
  const { supabase, workspaceId, instanceName, data, deliveryId } = ctx;

  const wa = await ensureWhatsappNumber(supabase, workspaceId, instanceName);
  if (!wa) {
    await markDelivery(supabase, deliveryId, "ignored", "Missing instanceName or instance not found");
    return json({ ok: true, ignored: true });
  }

  const qrcode = data?.qrcode as Record<string, unknown> | undefined;
  const qrBase64 = safeString(qrcode?.base64 ?? data?.base64 ?? null);
  const qrCode = safeString(qrcode?.code ?? data?.code ?? null);
  
  const qrValue = qrBase64 || qrCode;
  
  console.log('[Edge:evolution-webhook] qrcode_updated', { 
    instanceName, 
    hasBase64: !!qrBase64,
    hasCode: !!qrCode 
  });

  if (qrValue) {
    await supabase
      .from("whatsapp_numbers")
      .update({
        last_qr: qrValue,
        status: 'pairing',
        updated_at: new Date().toISOString(),
      })
      .eq("id", wa.id);
  }

  await markDelivery(supabase, deliveryId, "processed");
  return json({ ok: true });
}
