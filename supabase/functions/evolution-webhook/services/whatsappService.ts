import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { WhatsappNumber } from "../types.ts";

export async function ensureWhatsappNumber(
  supabase: SupabaseClient,
  workspaceId: string,
  instanceName: string | null,
): Promise<WhatsappNumber | null> {
  if (!instanceName) return null;

  const { data: existing } = await supabase
    .from("whatsapp_numbers")
    .select("id, instance_name, status")
    .eq("workspace_id", workspaceId)
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (existing) return existing as WhatsappNumber;

  console.log('[Edge:evolution-webhook] instance_not_found', { instanceName, workspaceId });
  return null;
}
