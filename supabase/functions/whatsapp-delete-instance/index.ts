import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: whatsapp-delete-instance
 * Deletes a WhatsApp instance from Evolution API and removes from database
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

  console.log('[Edge:whatsapp-delete-instance] start');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let body: { whatsapp_number_id?: string; workspace_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    console.error('[Edge:whatsapp-delete-instance] invalid_json');
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const whatsappNumberId = body.whatsapp_number_id;
  const workspaceId = body.workspace_id;

  if (!whatsappNumberId) {
    console.error('[Edge:whatsapp-delete-instance] missing_whatsapp_number_id');
    return json({ ok: false, message: "whatsapp_number_id is required" }, 400);
  }

  console.log('[Edge:whatsapp-delete-instance] fetching_record', { whatsappNumberId });

  // 1) Fetch the whatsapp_number record to get instance_name
  const { data: record, error: fetchError } = await supabase
    .from("whatsapp_numbers")
    .select("id, instance_name, workspace_id, status")
    .eq("id", whatsappNumberId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Edge:whatsapp-delete-instance] fetch_error', fetchError.message);
    return json({ ok: false, message: fetchError.message }, 500);
  }

  if (!record) {
    console.log('[Edge:whatsapp-delete-instance] record_not_found', { whatsappNumberId });
    // Record already deleted, consider success
    return json({ ok: true, message: "Record already deleted", already_deleted: true });
  }

  // Verify workspace ownership if provided
  if (workspaceId && record.workspace_id !== workspaceId) {
    console.error('[Edge:whatsapp-delete-instance] workspace_mismatch', { 
      expected: workspaceId, 
      actual: record.workspace_id 
    });
    return json({ ok: false, message: "Workspace mismatch" }, 403);
  }

  const instanceName = record.instance_name;
  console.log('[Edge:whatsapp-delete-instance] instance_found', { instanceName, status: record.status });

  // 2) Try to delete from Evolution API (if configured)
  let evolutionDeleted = false;
  let evolutionError: string | null = null;

  if (EVO_BASE && EVO_KEY && instanceName) {
    console.log('[Edge:whatsapp-delete-instance] calling_evolution_delete', { instanceName });
    
    try {
      // First, try to logout/disconnect the instance
      const logoutUrl = `${EVO_BASE}/instance/logout/${encodeURIComponent(instanceName)}`;
      console.log('[Edge:whatsapp-delete-instance] logout_attempt', { url: logoutUrl });
      
      const logoutResp = await fetch(logoutUrl, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      
      const logoutPayload = await safeJson(logoutResp);
      console.log('[Edge:whatsapp-delete-instance] logout_response', { 
        status: logoutResp.status, 
        ok: logoutResp.ok,
        response: logoutPayload 
      });

      // Then delete the instance
      const deleteUrl = `${EVO_BASE}/instance/delete/${encodeURIComponent(instanceName)}`;
      console.log('[Edge:whatsapp-delete-instance] delete_attempt', { url: deleteUrl });
      
      const deleteResp = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { ...authHeader() },
      });

      const deletePayload = await safeJson(deleteResp);
      console.log('[Edge:whatsapp-delete-instance] delete_response', { 
        status: deleteResp.status, 
        ok: deleteResp.ok,
        response: deletePayload 
      });

      // Consider success if:
      // - 200/204 OK
      // - 404 (instance already doesn't exist)
      // - Response indicates instance not found
      if (deleteResp.ok || deleteResp.status === 404) {
        evolutionDeleted = true;
      } else if (deletePayload?.message?.includes?.('not found') || 
                 deletePayload?.raw?.includes?.('not found')) {
        evolutionDeleted = true;
        console.log('[Edge:whatsapp-delete-instance] instance_not_found_in_evolution');
      } else {
        evolutionError = deletePayload?.message || deletePayload?.raw || `Status ${deleteResp.status}`;
        console.error('[Edge:whatsapp-delete-instance] evolution_delete_failed', { 
          status: deleteResp.status, 
          error: evolutionError 
        });
      }
    } catch (err) {
      evolutionError = err instanceof Error ? err.message : String(err);
      console.error('[Edge:whatsapp-delete-instance] evolution_request_error', evolutionError);
      // Continue to delete from DB anyway - Evolution might be temporarily unavailable
    }
  } else {
    console.log('[Edge:whatsapp-delete-instance] evolution_not_configured', { 
      hasBase: !!EVO_BASE, 
      hasKey: !!EVO_KEY, 
      hasInstanceName: !!instanceName 
    });
    evolutionDeleted = true; // No Evolution configured, skip
  }

  // 3) Delete related data from database (in correct order due to foreign keys)
  console.log('[Edge:whatsapp-delete-instance] deleting_related_data', { whatsappNumberId });

  // 3a) Delete messages associated with this whatsapp_number
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("whatsapp_number_id", whatsappNumberId);

  if (messagesError) {
    console.error('[Edge:whatsapp-delete-instance] messages_delete_error', messagesError.message);
    // Continue anyway - messages might not exist or have different FK
  } else {
    console.log('[Edge:whatsapp-delete-instance] messages_deleted');
  }

  // 3b) Delete conversations associated with this whatsapp_number
  const { error: conversationsError } = await supabase
    .from("conversations")
    .delete()
    .eq("whatsapp_number_id", whatsappNumberId);

  if (conversationsError) {
    console.error('[Edge:whatsapp-delete-instance] conversations_delete_error', conversationsError.message);
    return json({ 
      ok: false, 
      message: `Erro ao excluir conversas: ${conversationsError.message}`,
      evolution_deleted: evolutionDeleted,
      evolution_error: evolutionError,
    }, 500);
  } else {
    console.log('[Edge:whatsapp-delete-instance] conversations_deleted');
  }

  // 3c) Finally delete the whatsapp_number record
  console.log('[Edge:whatsapp-delete-instance] deleting_whatsapp_number', { whatsappNumberId });

  const { error: deleteError } = await supabase
    .from("whatsapp_numbers")
    .delete()
    .eq("id", whatsappNumberId);

  if (deleteError) {
    console.error('[Edge:whatsapp-delete-instance] db_delete_error', deleteError.message);
    return json({ 
      ok: false, 
      message: `Erro ao excluir do banco: ${deleteError.message}`,
      evolution_deleted: evolutionDeleted,
      evolution_error: evolutionError,
    }, 500);
  }

  console.log('[Edge:whatsapp-delete-instance] success', { 
    whatsappNumberId, 
    instanceName,
    evolutionDeleted,
    evolutionError 
  });

  return json({
    ok: true,
    whatsapp_number_id: whatsappNumberId,
    instance_name: instanceName,
    evolution_deleted: evolutionDeleted,
    evolution_error: evolutionError,
    message: evolutionError 
      ? "Conexão removida do sistema. Aviso: não foi possível remover do Evolution API."
      : "Conexão excluída com sucesso.",
  });
});
