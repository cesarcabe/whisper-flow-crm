import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EVO_BASE = (Deno.env.get("EVOLUTION_BASE_URL") ?? "").replace(/\/$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const EVO_AUTH_HEADER = Deno.env.get("EVOLUTION_AUTH_HEADER") ?? "apikey";

const PATH_GET_QR = Deno.env.get("EVOLUTION_GET_QR_PATH") ?? "/instance/connect/{instanceName}";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function authHeader() {
  return { [EVO_AUTH_HEADER]: EVO_KEY };
}

function applyTemplate(path: string, instanceName: string) {
  return path.replace("{instanceName}", encodeURIComponent(instanceName));
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return json({ ok: true });

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace_id");
  if (!workspaceId) return json({ code: 400, message: "workspace_id is required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: wa, error } = await supabase
    .from("whatsapp_numbers")
    .select("id, instance_name")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!wa?.instance_name) return json({ ok: false, message: "No instance_name for workspace" }, 422);

  const qrPath = applyTemplate(PATH_GET_QR, wa.instance_name);
  const resp = await fetch(`${EVO_BASE}${qrPath}`, { headers: { ...authHeader() } });

  const payload = await resp.json().catch(async () => ({ raw: await resp.text() }));
  if (!resp.ok) return json({ ok: false, step: "get_qr", status: resp.status, response: payload }, 500);

  // Salva último QR (você decide se guarda code inteiro ou só o "code")
  const qrCode = payload?.code ?? null;

  await supabase
    .from("whatsapp_numbers")
    .update({ last_qr: qrCode ? String(qrCode) : null, updated_at: new Date().toISOString() })
    .eq("id", wa.id);

  return json({
    ok: true,
    instance_name: wa.instance_name,
    pairingCode: payload?.pairingCode ?? null,
    code: payload?.code ?? null,
    count: payload?.count ?? null,
  });
});
