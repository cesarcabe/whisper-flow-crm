import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Utils
import { json, corsHeaders } from "./utils/response.ts";
import { getHeader, extractEvent, safeString } from "./utils/extract.ts";
import { normalizeEventType } from "./utils/normalize.ts";
import { makeDeliveryKey } from "./utils/crypto.ts";

// Services
import { insertDelivery, markDelivery } from "./services/deliveryService.ts";

// Handlers
import { handleConnection } from "./handlers/handleConnection.ts";
import { handleQrCode } from "./handlers/handleQrCode.ts";
import { handleMessage } from "./handlers/handleMessage.ts";

// Types
import type { WebhookContext } from "./types.ts";

// Environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_BASE_URL = Deno.env.get("EVOLUTION_BASE_URL") ?? null;
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? null;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") return json({ ok: true });

  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  console.log('[Edge:evolution-webhook] start', { method: req.method });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Security: Workspace API Key validation
  const apiKey = getHeader(req, "x-api-key");
  if (!apiKey) {
    console.log('[Edge:evolution-webhook] missing_api_key');
    return json({ code: 401, message: "Missing x-api-key" }, 401);
  }

  const bodyText = await req.text();
  let body: Record<string, unknown>;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  const extracted = extractEvent(body);
  const eventType = normalizeEventType(extracted.eventType);
  const instanceName = extracted.instanceName;
  const data = extracted.data as Record<string, unknown>;

  console.log('[Edge:evolution-webhook] event_received', { 
    eventType, 
    instanceName,
    hasApiKey: !!apiKey 
  });

  // Resolve workspace_id by api key
  const { data: wsKey, error: keyErr } = await supabase
    .from("workspace_api_keys")
    .select("workspace_id, is_active")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (keyErr) {
    console.log('[Edge:evolution-webhook] key_lookup_error', { error: keyErr.message });
    return json({ code: 500, message: "Key lookup failed", details: keyErr.message }, 500);
  }
  if (!wsKey?.workspace_id) {
    console.log('[Edge:evolution-webhook] invalid_api_key');
    return json({ code: 401, message: "Invalid API key" }, 401);
  }

  const workspaceId = wsKey.workspace_id as string;

  // 2) Extract provider_event_id
  const providerEventId =
    safeString(data?.id) ??
    safeString(data?.messageId) ??
    safeString((data?.key as Record<string, unknown>)?.id) ??
    safeString((data?.message as Record<string, unknown>)?.key) ??
    null;

  // 3) Idempotency via webhook_deliveries
  const deliveryKey = await makeDeliveryKey("evolution", eventType, instanceName, bodyText, providerEventId);

  let deliveryId: string | null = null;
  try {
    const deliveryResult = await insertDelivery(
      supabase,
      workspaceId,
      eventType,
      instanceName,
      deliveryKey,
      body,
      Object.fromEntries(req.headers.entries()),
    );

    if (deliveryResult.duplicate) {
      console.log('[Edge:evolution-webhook] idempotent_skip', { deliveryKey });
      return json({ ok: true, idempotent: true });
    }

    deliveryId = deliveryResult.id;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[Edge:evolution-webhook] delivery_insert_error', { error: errorMessage });
    return json({ code: 500, message: "Failed to insert webhook_deliveries", details: errorMessage }, 500);
  }

  // Build context for handlers
  const ctx: WebhookContext = {
    supabase,
    workspaceId,
    eventType,
    instanceName,
    data,
    deliveryId,
    providerEventId,
    evolutionBaseUrl: EVOLUTION_BASE_URL,
    evolutionApiKey: EVOLUTION_API_KEY,
  };

  // 4) Route to handlers
  try {
    switch (eventType) {
      case "connection.update":
        return await handleConnection(ctx);
      
      case "qrcode.updated":
        return await handleQrCode(ctx);
      
      case "messages.upsert":
      case "messages.update":
        return await handleMessage(ctx);
      
      default:
        console.log('[Edge:evolution-webhook] unhandled_event', { eventType });
        await markDelivery(supabase, deliveryId, "ignored", `Unhandled eventType: ${eventType ?? "null"}`);
        return json({ ok: true, ignored: true });
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log('[Edge:evolution-webhook] error', { error: errorMessage });
    await markDelivery(supabase, deliveryId, "failed", errorMessage ?? "Unknown error");
    return json({ ok: false, error: errorMessage ?? "Unknown error" }, 500);
  }
});
