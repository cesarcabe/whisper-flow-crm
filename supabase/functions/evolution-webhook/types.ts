import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface WhatsappNumber {
  id: string;
  instance_name: string | null;
  status: string | null;
  workspace_id: string;
}

export interface WebhookContext {
  supabase: SupabaseClient;
  workspaceId: string;
  eventType: string | null;
  instanceName: string | null;
  data: Record<string, unknown>;
  deliveryId: string | null;
  providerEventId: string | null;
  evolutionBaseUrl: string | null;
  evolutionApiKey: string | null;
}
