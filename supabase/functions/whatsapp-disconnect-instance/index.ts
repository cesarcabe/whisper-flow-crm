import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: whatsapp-disconnect-instance
 * Disconnects a WhatsApp instance from Evolution API without deleting data
 * 
 * Secrets required:
 * - EVOLUTION_BASE_URL
 * - EVOLUTION_API_KEY
 * - EVOLUTION_AUTH_HEADER
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EVO_BASE = (Deno.env.get("EVOLUTION_BASE_URL") ?? "").replace(/\/$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const EVO_AUTH_HEADER = Deno.env.get("EVOLUTION_AUTH_HEADER") ?? "apikey";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function authHeader() {
  return { [EVO_AUTH_HEADER]: EVO_KEY };
}

async function safeJson(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  console.log('[Edge:whatsapp-disconnect-instance] start');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let body: { whatsapp_number_id?: string; workspace_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    console.error('[Edge:whatsapp-disconnect-instance] invalid_json');
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const whatsappNumberId = body.whatsapp_number_id;
  const workspaceId = body.workspace_id;

  if (!whatsappNumberId) {
    console.error('[Edge:whatsapp-disconnect-instance] missing_whatsapp_number_id');
    return json({ ok: false, message: "whatsapp_number_id is required" }, 400);
  }

  console.log('[Edge:whatsapp-disconnect-instance] fetching_record', { whatsappNumberId });

  // 1) Fetch the whatsapp_number record to get instance_name
  const { data: record, error: fetchError } = await supabase
    .from("whatsapp_numbers")
    .select("id, instance_name, workspace_id, status")
    .eq("id", whatsappNumberId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Edge:whatsapp-disconnect-instance] fetch_error', fetchError.message);
    return json({ ok: false, message: fetchError.message }, 500);
  }

  if (!record) {
    console.log('[Edge:whatsapp-disconnect-instance] record_not_found', { whatsappNumberId });
    return json({ ok: false, message: "Conexão não encontrada" }, 404);
  }

  // Verify workspace ownership if provided
  if (workspaceId && record.workspace_id !== workspaceId) {
    console.error('[Edge:whatsapp-disconnect-instance] workspace_mismatch', { 
      expected: workspaceId, 
      actual: record.workspace_id 
    });
    return json({ ok: false, message: "Workspace mismatch" }, 403);
  }

  const instanceName = record.instance_name;
  console.log('[Edge:whatsapp-disconnect-instance] instance_found', { instanceName, status: record.status });

  // 2) Try to logout from Evolution API (if configured)
  let evolutionLoggedOut = false;
  let evolutionError: string | null = null;

  if (EVO_BASE && EVO_KEY && instanceName) {
    console.log('[Edge:whatsapp-disconnect-instance] calling_evolution_logout', { instanceName });
    
    try {
      const logoutUrl = `${EVO_BASE}/instance/logout/${encodeURIComponent(instanceName)}`;
      console.log('[Edge:whatsapp-disconnect-instance] logout_attempt', { url: logoutUrl });
      
      const logoutResp = await fetch(logoutUrl, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      
      const logoutPayload = await safeJson(logoutResp);
      console.log('[Edge:whatsapp-disconnect-instance] logout_response', { 
        status: logoutResp.status, 
        ok: logoutResp.ok,
        response: logoutPayload 
      });

      // Consider success if:
      // - 200/204 OK
      // - 404 (instance already doesn't exist or disconnected)
      if (logoutResp.ok || logoutResp.status === 404) {
        evolutionLoggedOut = true;
      } else if (logoutPayload?.message?.includes?.('not found') || 
                 logoutPayload?.raw?.includes?.('not found')) {
        evolutionLoggedOut = true;
        console.log('[Edge:whatsapp-disconnect-instance] instance_not_found_in_evolution');
      } else {
        evolutionError = logoutPayload?.message || logoutPayload?.raw || `Status ${logoutResp.status}`;
        console.error('[Edge:whatsapp-disconnect-instance] evolution_logout_failed', { 
          status: logoutResp.status, 
          error: evolutionError 
        });
      }
    } catch (err) {
      evolutionError = err instanceof Error ? err.message : String(err);
      console.error('[Edge:whatsapp-disconnect-instance] evolution_request_error', evolutionError);
      // Continue to update DB anyway - Evolution might be temporarily unavailable
    }
  } else {
    console.log('[Edge:whatsapp-disconnect-instance] evolution_not_configured', { 
      hasBase: !!EVO_BASE, 
      hasKey: !!EVO_KEY, 
      hasInstanceName: !!instanceName 
    });
    evolutionLoggedOut = true; // No Evolution configured, skip
  }

  // 3) Update status in database to 'disconnected'
  console.log('[Edge:whatsapp-disconnect-instance] updating_status', { whatsappNumberId });

  const { error: updateError } = await supabase
    .from("whatsapp_numbers")
    .update({ 
      status: 'disconnected',
      last_qr: null, // Clear QR code
    })
    .eq("id", whatsappNumberId);

  if (updateError) {
    console.error('[Edge:whatsapp-disconnect-instance] db_update_error', updateError.message);
    return json({ 
      ok: false, 
      message: `Erro ao atualizar status: ${updateError.message}`,
      evolution_logged_out: evolutionLoggedOut,
      evolution_error: evolutionError,
    }, 500);
  }

  console.log('[Edge:whatsapp-disconnect-instance] success', { 
    whatsappNumberId, 
    instanceName,
    evolutionLoggedOut,
    evolutionError 
  });

  return json({
    ok: true,
    whatsapp_number_id: whatsappNumberId,
    instance_name: instanceName,
    evolution_logged_out: evolutionLoggedOut,
    evolution_error: evolutionError,
    message: evolutionError 
      ? "Conexão desconectada. Aviso: não foi possível desconectar do Evolution API."
      : "Conexão desconectada com sucesso.",
  });
});
