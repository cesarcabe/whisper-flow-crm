import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

function requireAuthUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

  console.log(`Creating workspace "${workspaceName}" for user ${userId}`);

  // 2) cria workspace
  const { data: ws, error: wsErr } = await supabaseAdmin
    .from("workspaces")
    .insert({ name: workspaceName })
    .select("id")
    .single();

  if (wsErr) {
    console.error("Error creating workspace:", wsErr);
    return json({ ok: false, error: wsErr.message }, 500);
  }
  const workspaceId = ws.id;

  // 3) cria membership
  const { error: memberErr } = await supabaseAdmin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });

  if (memberErr) {
    console.error("Error creating membership:", memberErr);
  }

  // 4) cria API key ativa
  const apiKey = crypto.getRandomValues(new Uint8Array(32));
  const apiKeyHex = Array.from(apiKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { error: apiKeyErr } = await supabaseAdmin.from("workspace_api_keys").insert({
    workspace_id: workspaceId,
    api_key: apiKeyHex,
    is_active: true,
    name: "primary",
  });

  if (apiKeyErr) {
    console.error("Error creating API key:", apiKeyErr);
  }

  // 5) seed mínimo de pipeline/stages
  const { data: pipe, error: pipelineErr } = await supabaseAdmin
    .from("pipelines")
    .insert({ workspace_id: workspaceId, name: "Entrada" })
    .select("id")
    .single();

  if (pipelineErr) {
    console.error("Error creating pipeline:", pipelineErr);
  } else if (pipe?.id) {
    const { error: stagesErr } = await supabaseAdmin.from("stages").insert([
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Novo", position: 1 },
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Em atendimento", position: 2 },
      { workspace_id: workspaceId, pipeline_id: pipe.id, name: "Fechado", position: 3 },
    ]);

    if (stagesErr) {
      console.error("Error creating stages:", stagesErr);
    }
  }

  console.log(`Workspace ${workspaceId} created successfully`);

  return json({ ok: true, workspace_id: workspaceId });
});
