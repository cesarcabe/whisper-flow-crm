import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: whatsapp-create-instance
 * - Verify JWT: OFF
 *
 * Secrets required:
 * - EVOLUTION_BASE_URL=https://evo.newflow.me
 * - EVOLUTION_API_KEY=...
 * - EVOLUTION_AUTH_HEADER=apikey
 * - EVOLUTION_CREATE_INSTANCE_PATH=/instance/create
 * - EVOLUTION_SET_WEBHOOK_PATH=/webhook/set/{instanceName}
 * - EVOLUTION_WEBHOOK_URL=https://<project>.supabase.co/functions/v1/evolution-webhook
 *
 * DB tables used:
 * - workspace_api_keys (workspace_id, api_key, is_active)
 * - whatsapp_numbers (workspace_id, instance_name, phone_number, status, updated_at, created_at)
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EVO_BASE = (Deno.env.get("EVOLUTION_BASE_URL") ?? "").replace(/\/$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const EVO_AUTH_HEADER = Deno.env.get("EVOLUTION_AUTH_HEADER") ?? "apikey";

const PATH_CREATE = Deno.env.get("EVOLUTION_CREATE_INSTANCE_PATH") ?? "/instance/create";
const PATH_SET_WEBHOOK = Deno.env.get("EVOLUTION_SET_WEBHOOK_PATH") ?? "/webhook/set/{instanceName}";
const WEBHOOK_URL = Deno.env.get("EVOLUTION_WEBHOOK_URL") ?? "";

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...extraHeaders 
    },
  });
}

function authHeader() {
  return { [EVO_AUTH_HEADER]: EVO_KEY };
}

function makeInstanceName(workspaceId: string) {
  const short = workspaceId.replace(/-/g, "").slice(0, 10);
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const r = Array.from(rand)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ws_${short}_${r}`;
}

function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeDigitsPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.length ? d : "";
}

function toJid(phoneDigits: string) {
  return `${phoneDigits}@s.whatsapp.net`;
}

function applyTemplate(path: string, instanceName: string) {
  return path.replace("{instanceName}", encodeURIComponent(instanceName));
}

async function safeJson(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  console.log('[Edge:whatsapp-create-instance] start');

  // Basic config guards
  if (!EVO_BASE || !EVO_KEY) {
    console.error('[Edge:whatsapp-create-instance] missing secrets: EVO_BASE or EVO_KEY');
    return new Response(JSON.stringify({ ok: false, message: "Configuração incompleta. Verifique as secrets da Evolution API." }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
  if (!WEBHOOK_URL) {
    console.error('[Edge:whatsapp-create-instance] missing secret: WEBHOOK_URL');
    return new Response(JSON.stringify({ ok: false, message: "Webhook URL não configurada. Verifique EVOLUTION_WEBHOOK_URL." }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const workspaceId = String(body?.workspace_id ?? "");
  if (!workspaceId) return json({ code: 400, message: "workspace_id is required" }, 400);

  // Optional phone_number (UX wants QR only; keep as fallback)
  const phoneDigits = body?.phone_number ? normalizeDigitsPhone(String(body.phone_number)) : "";
  const numberJid = phoneDigits ? toJid(phoneDigits) : null;

  // Workspace API key (to sign incoming webhooks)
  const { data: wsKey, error: keyErr } = await supabase
    .from("workspace_api_keys")
    .select("api_key")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (keyErr) return json({ ok: false, error: keyErr.message }, 500);
  if (!wsKey?.api_key) return json({ ok: false, message: "No active api key for workspace" }, 422);

  const instanceName = body?.instance_name ? String(body.instance_name) : makeInstanceName(workspaceId);
  const token = body?.instance_token ? String(body.instance_token) : makeToken();

  // 1) CREATE INSTANCE (Evolution 2.2.3 requires integration; number optional)
  const createBody: Record<string, unknown> = {
    instanceName,
    token,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };
  if (numberJid) createBody.number = numberJid;

  const createResp = await fetch(`${EVO_BASE}${PATH_CREATE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(createBody),
  });

  const createPayload = await safeJson(createResp);
  if (!createResp.ok) {
    return json(
      {
        ok: false,
        step: "create_instance",
        status: createResp.status,
        response: createPayload,
        sent: {
          ...createBody,
          token: "***",
        },
      },
      500,
    );
  }

  // Extract QR code from creation response (prefer image base64 when available)
  const qrImage = createPayload?.qrcode?.base64 ?? createPayload?.base64 ?? null;
  const qrToken = createPayload?.qrcode?.code ?? createPayload?.code ?? null;
  const qrCode = qrImage ?? qrToken ?? null;
  const pairingCode = createPayload?.qrcode?.pairingCode ?? createPayload?.pairingCode ?? null;
  
  console.log('[Edge:whatsapp-create-instance] creation response', { 
    hasQr: !!qrCode, 
    hasPairingCode: !!pairingCode,
    responseKeys: Object.keys(createPayload || {})
  });

  // 2) Persist mapping in Supabase and get the record ID
  console.log('[Edge:whatsapp-create-instance] inserting whatsapp_number', { workspaceId, instanceName });
  
  const { data: insertData, error: insertError } = await supabase.from("whatsapp_numbers").insert({
    workspace_id: workspaceId,
    instance_name: instanceName,
    internal_name: body?.internal_name || instanceName,
    phone_number: phoneDigits || "",
    status: "disconnected",
    user_id: body?.user_id,
    last_qr: qrCode ? String(qrCode) : null,
  }).select('id').single();

  if (insertError) {
    console.error('[Edge:whatsapp-create-instance] insert error', insertError.message);
    return json({ ok: false, message: `Erro ao salvar conexão: ${insertError.message}` }, 500);
  }

  const whatsappNumberId = insertData?.id;
  console.log('[Edge:whatsapp-create-instance] inserted', { whatsappNumberId });

  // 3) SET WEBHOOK (Evolution requires object "webhook" and property "enabled")
  const webhookPath = applyTemplate(PATH_SET_WEBHOOK, instanceName);

  const webhookResp = await fetch(`${EVO_BASE}${webhookPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: WEBHOOK_URL,
        webhook_by_events: true,
        webhook_base64: true,
        events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
        headers: { "x-api-key": wsKey.api_key },
      },
    }),
  });

  const webhookPayload = await safeJson(webhookResp);
  console.log('[Edge:whatsapp-create-instance] webhook set', { ok: webhookResp.ok, status: webhookResp.status });

  return json({
    ok: true,
    workspace_id: workspaceId,
    whatsapp_number_id: whatsappNumberId,
    instance_name: instanceName,
    instance_token: token,
    phone_number: phoneDigits || null,
    // Include QR code from creation response for immediate display
    qr_code: qrCode,
    pairing_code: pairingCode,
    webhook: {
      ok: webhookResp.ok,
      status: webhookResp.status,
      response: webhookPayload,
    },
    evolution_create_response: createPayload,
  });
});
