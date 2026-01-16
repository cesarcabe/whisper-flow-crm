import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT secret
    const jwtSecret = Deno.env.get("CHATENGINE_JWT_SECRET");
    if (!jwtSecret) {
      console.error("CHATENGINE_JWT_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user via Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace_id from request body or user's first workspace
    const body = await req.json().catch(() => ({}));
    let workspaceId = body.workspace_id;

    if (!workspaceId) {
      // Get user's first workspace
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (membershipError || !membership) {
        console.error("Workspace error:", membershipError);
        return new Response(
          JSON.stringify({ error: "No workspace found for user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      workspaceId = membership.workspace_id;
    }

    // Verify user has access to the workspace
    const { data: hasAccess, error: accessError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (accessError || !hasAccess) {
      console.error("Access denied to workspace:", workspaceId);
      return new Response(
        JSON.stringify({ error: "Access denied to workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate JWT token for ChatEngine
    const secret = new TextEncoder().encode(jwtSecret);
    
    const token = await new SignJWT({
      workspace_id: workspaceId,
      sub: user.id,
      user_id: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("lovable-crm")
      .setAudience("chatengine-api")
      .setExpirationTime("1h") // Token expires in 1 hour
      .sign(secret);

    console.log("Generated ChatEngine JWT for user:", user.id, "workspace:", workspaceId);

    return new Response(
      JSON.stringify({ 
        token,
        expires_in: 3600,
        workspace_id: workspaceId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error generating token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
