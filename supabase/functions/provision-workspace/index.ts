import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function requireAuthUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });

  const jwt = requireAuthUser(req);
  if (!jwt) return json({ code: 401, message: "Missing Authorization Bearer JWT" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  // 1) quem é o user?
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user?.id) return json({ code: 401, message: "Invalid user JWT" }, 401);
  const userId = userRes.user.id;

  // payload opcional
  const body = await req.json().catch(() => ({}));
  const workspaceName = (body?.name ?? "Meu Workspace").toString();

  // 2) cria workspace
  const { data: ws, error: wsErr } = await supabaseAdmin
    .from("workspaces")
    .insert({ name: workspaceName })
    .select("id")
    .single();

  if (wsErr) return json({ ok: false, error: wsErr.message }, 500);
  const workspaceId = ws.id;

  // 3) cria membership (ajuste o nome da sua tabela se for diferente)
  await supabaseAdmin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });

  // 4) cria API key ativa (workspace_api_keys)
  const apiKey = crypto.getRandomValues(new Uint8Array(32));
  const apiKeyHex = Array.from(apiKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabaseAdmin.from("workspace_api_keys").insert({
    workspace_id: workspaceId,
    api_key: apiKeyHex,
    is_active: true,
    name: "primary",
  });

  // 5) seed mínimo de pipeline/stages (ajuste tabelas/colunas se necessário)
  const { data: pipe } = await supabaseAdmin
    .from("pipelines")
    .insert({ workspace_id: workspaceId, name: "Entrada" })
    .select("id")
    .single();

  if (pipe?.id) {
    await supabaseAdmin.from("stages").insert([
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Novo", position: 1 },
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Em atendimento", position: 2 },
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Fechado", position: 3 },
    ]);
  }

  return json({ ok: true, workspace_id: workspaceId });
});
