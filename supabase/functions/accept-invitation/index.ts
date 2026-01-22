import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[accept-invitation] Starting accept process...");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[accept-invitation] No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[accept-invitation] User error:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[accept-invitation] User authenticated:", user.id, user.email);

    const { token }: AcceptRequest = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find invitation by token using admin client (to bypass RLS)
    const { data: invitation, error: inviteError } = await adminClient
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError || !invitation) {
      console.error("[accept-invitation] Invitation not found:", inviteError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado ou já foi aceito" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[accept-invitation] Invitation found:", invitation.id);

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          error: `Este convite foi enviado para ${invitation.email}. Faça login com esse email para aceitar.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted
      await adminClient
        .from("workspace_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: true, message: "Você já é membro deste workspace" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add user to workspace using admin client
    const { error: memberError } = await adminClient
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      console.error("[accept-invitation] Error adding member:", memberError);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar ao workspace: " + memberError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invitation as accepted
    await adminClient
      .from("workspace_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    console.log("[accept-invitation] Member added successfully");

    // Get workspace info
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", invitation.workspace_id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        workspace: workspace,
        message: `Você agora faz parte do workspace ${workspace?.name}!` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[accept-invitation] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
