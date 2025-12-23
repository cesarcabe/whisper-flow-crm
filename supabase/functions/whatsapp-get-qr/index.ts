import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EVO_BASE = (Deno.env.get("EVOLUTION_BASE_URL") ?? "").replace(/\/$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const EVO_AUTH_HEADER = Deno.env.get("EVOLUTION_AUTH_HEADER") ?? "apikey";

const PATH_GET_QR = Deno.env.get("EVOLUTION_GET_QR_PATH") ?? "/instance/connect/{instanceName}";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

function authHeader() {
  return { [EVO_AUTH_HEADER]: EVO_KEY };
}

function applyTemplate(path: string, instanceName: string) {
  return path.replace("{instanceName}", encodeURIComponent(instanceName));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Edge:whatsapp-get-qr] start', { method: req.method });

  // Accept both GET (query params) and POST (body)
  let workspaceId: string | null = null;
  let whatsappNumberId: string | null = null;

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    workspaceId = body?.workspace_id || null;
    whatsappNumberId = body?.whatsapp_number_id || null;
  } else {
    const url = new URL(req.url);
    workspaceId = url.searchParams.get("workspace_id");
    whatsappNumberId = url.searchParams.get("whatsapp_number_id");
  }

  if (!workspaceId) {
    console.error('[Edge:whatsapp-get-qr] missing workspace_id');
    return json({ ok: false, message: "workspace_id is required" }, 400);
  }

  console.log('[Edge:whatsapp-get-qr] params', { workspaceId, whatsappNumberId });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // If whatsappNumberId provided, get that specific instance
  // Otherwise, get the most recent one for the workspace
  let query = supabase
    .from("whatsapp_numbers")
    .select("id, instance_name")
    .eq("workspace_id", workspaceId);

  if (whatsappNumberId) {
    query = query.eq("id", whatsappNumberId);
  } else {
    query = query.order("created_at", { ascending: false }).limit(1);
  }

  const { data: wa, error } = await query.maybeSingle();

  if (error) {
    console.error('[Edge:whatsapp-get-qr] db error', error.message);
    return json({ ok: false, error: error.message }, 500);
  }

  if (!wa?.instance_name) {
    console.error('[Edge:whatsapp-get-qr] no instance found');
    return json({ ok: false, message: "Nenhuma instância WhatsApp encontrada" }, 422);
  }

  console.log('[Edge:whatsapp-get-qr] found instance', { instanceName: wa.instance_name });

  const qrPath = applyTemplate(PATH_GET_QR, wa.instance_name);
  console.log('[Edge:whatsapp-get-qr] fetching QR', { url: `${EVO_BASE}${qrPath}` });

  const resp = await fetch(`${EVO_BASE}${qrPath}`, { headers: { ...authHeader() } });

  const payload = await resp.json().catch(async () => ({ raw: await resp.text() }));
  
  console.log('[Edge:whatsapp-get-qr] evolution response', { ok: resp.ok, status: resp.status });

  if (!resp.ok) {
    console.error('[Edge:whatsapp-get-qr] evolution error', payload);
    return json({ ok: false, step: "get_qr", status: resp.status, response: payload }, 500);
  }

  // Save last QR
  const qrCode = payload?.code ?? null;

  await supabase
    .from("whatsapp_numbers")
    .update({ last_qr: qrCode ? String(qrCode) : null, updated_at: new Date().toISOString() })
    .eq("id", wa.id);

  console.log('[Edge:whatsapp-get-qr] success', { hasQr: !!qrCode, hasPairingCode: !!payload?.pairingCode });

  return json({
    ok: true,
    instance_name: wa.instance_name,
    pairingCode: payload?.pairingCode ?? null,
    code: payload?.code ?? null,
    count: payload?.count ?? null,
  });
});
