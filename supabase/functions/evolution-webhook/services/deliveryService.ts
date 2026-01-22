import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface InsertDeliveryResult {
  id: string | null;
  duplicate: boolean;
}

export async function insertDelivery(
  supabase: SupabaseClient,
  workspaceId: string,
  eventType: string | null,
  instanceName: string | null,
  deliveryKey: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<InsertDeliveryResult> {
  const { data: deliveryRow, error: deliveryErr } = await supabase
    .from("webhook_deliveries")
    .insert({
      workspace_id: workspaceId,
      provider: "evolution",
      event_type: eventType ?? "unknown",
      instance_name: instanceName,
      delivery_key: deliveryKey,
      payload,
      headers,
      status: "received",
    })
    .select("id")
    .maybeSingle();

  if (deliveryErr) {
    const msg = (deliveryErr.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("conflict")) {
      return { id: null, duplicate: true };
    }
    throw new Error("Failed to insert webhook_deliveries: " + deliveryErr.message);
  }

  return { id: deliveryRow?.id ?? null, duplicate: false };
}

export async function markDelivery(
  supabase: SupabaseClient,
  deliveryId: string | null,
  status: string,
  errorMessage?: string,
): Promise<void> {
  if (!deliveryId) return;
  await supabase
    .from("webhook_deliveries")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
    })
    .eq("id", deliveryId);
}
