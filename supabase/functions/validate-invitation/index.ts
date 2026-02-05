import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[validate-invitation] Validating invitation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { token }: ValidateRequest = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find invitation by token using admin client (bypasses RLS)
    const { data: invitation, error: inviteError } = await adminClient
      .from("workspace_invitations")
      .select("id, email, role, expires_at, workspace_id")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError) {
      console.error("[validate-invitation] Query error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation) {
      console.log("[validate-invitation] Invitation not found or already accepted");
      return new Response(
        JSON.stringify({ error: "Convite não encontrado ou já foi utilizado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log("[validate-invitation] Invitation expired");
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace name
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", invitation.workspace_id)
      .single();

    console.log("[validate-invitation] Invitation valid for:", invitation.email);

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          workspace_name: workspace?.name || "Workspace",
          expires_at: invitation.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[validate-invitation] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
