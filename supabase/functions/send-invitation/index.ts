import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: "admin" | "agent";
  workspaceId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-invitation] Starting invitation process...");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-invitation] No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[send-invitation] User error:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-invitation] User authenticated:", user.id);

    const { email, role, workspaceId }: InvitationRequest = await req.json();
    
    // Validate input
    if (!email || !role || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Email, role e workspaceId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-invitation] Creating invitation for:", email, "role:", role);

    // Check if user already exists in workspace
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id, profiles(email)")
      .eq("workspace_id", workspaceId)
      .single();

    // Get profile by email to check if user exists
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member
      const { data: memberCheck } = await adminClient
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (memberCheck) {
        return new Response(
          JSON.stringify({ error: "Este usuário já é membro do workspace" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .is("accepted_at", null)
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace name
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invitationError) {
      console.error("[send-invitation] Error creating invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite: " + invitationError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-invitation] Invitation created:", invitation.id);

    // Build invitation URL
    const appUrl = req.headers.get("origin") || "https://tiaojwumxgdnobknlyqp.lovableproject.com";
    const inviteUrl = `${appUrl}/invite/${invitation.token}`;

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Um administrador";
    const workspaceName = workspace?.name || "Workspace";
    const roleLabel = role === "admin" ? "Administrador" : "Agente";

    // Send email
    console.log("[send-invitation] Sending email to:", email);
    
    const { error: emailError } = await resend.emails.send({
      from: "NewFlow CRM <noreply@crm.newflow.me>",
      to: [email],
      subject: `Convite para ${workspaceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px;">Você foi convidado!</h1>
            
            <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
              <strong>${inviterName}</strong> convidou você para fazer parte do workspace <strong>${workspaceName}</strong> como <strong>${roleLabel}</strong>.
            </p>
            
            <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
              Clique no botão abaixo para aceitar o convite e criar sua conta:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Aceitar Convite
              </a>
            </div>
            
            <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
              Se você não esperava este convite, pode ignorar este email.
            </p>
            
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">
              Este convite expira em 7 dias.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("[send-invitation] Error sending email:", emailError);
      // Delete the invitation if email failed
      await supabase.from("workspace_invitations").delete().eq("id", invitation.id);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email: " + emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-invitation] Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-invitation] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
