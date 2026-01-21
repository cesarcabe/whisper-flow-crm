import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { WhatsappNumber } from "../types.ts";

/**
 * Busca um whatsapp_number pelo instance_name.
 * IMPORTANTE: Busca apenas pelo instance_name (que é único globalmente)
 * para suportar transferência de conexões entre workspaces.
 */
export async function ensureWhatsappNumber(
  supabase: SupabaseClient,
  _workspaceId: string, // Mantido para compatibilidade, mas não usado na busca
  instanceName: string | null,
): Promise<(WhatsappNumber & { workspace_id: string }) | null> {
  if (!instanceName) return null;

  const { data: existing } = await supabase
    .from("whatsapp_numbers")
    .select("id, instance_name, status, workspace_id")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (existing) return existing as WhatsappNumber & { workspace_id: string };

  console.log('[Edge:evolution-webhook] instance_not_found', { instanceName });
  return null;
}
