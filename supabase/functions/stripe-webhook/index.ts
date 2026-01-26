import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Mapeamento de price_id para tier
const PRICE_TO_TIER: Record<string, string> = {
  "price_1RTv8VE5SkMoSFzluQRDJfqE": "starter",      // R$ 49,90/mês
  "price_1RTv99E5SkMoSFzlPo5o22YI": "professional", // R$ 79,90/mês
  "price_1RTv9lE5SkMoSFzlyB1WCX2B": "enterprise",   // R$ 129,90/mês
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Ler o body como texto para verificação de assinatura
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("AVISO: Sem assinatura Stripe - processando mesmo assim para desenvolvimento");
    }

    // Parse do evento
    let event: Stripe.Event;
    try {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Evento parseado", { type: event.type, id: event.id });
    } catch (parseError) {
      logStep("Erro ao parsear evento", { error: String(parseError) });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Processar apenas checkout.session.completed
    if (event.type !== "checkout.session.completed") {
      logStep("Evento ignorado", { type: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    logStep("Checkout session completed", {
      sessionId: session.id,
      customerId: session.customer,
      customerEmail: session.customer_email,
      subscriptionId: session.subscription,
    });

    // Validar dados necessários
    const customerEmail = session.customer_email || session.customer_details?.email;
    if (!customerEmail) {
      throw new Error("Email do cliente não encontrado na sessão");
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
      throw new Error("Subscription ID não encontrado");
    }

    // Buscar detalhes da subscription para obter o price_id
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] || "starter";

    logStep("Subscription details", { priceId, tier });

    // Inicializar Supabase Admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verificar se já existe usuário com este email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    let userId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      logStep("Usuário existente encontrado", { userId, email: customerEmail });
    } else {
      // Criar novo usuário com senha temporária
      tempPassword = generateTempPassword();
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          full_name: session.customer_details?.name || customerEmail.split("@")[0],
          stripe_customer_id: customerId,
        },
      });

      if (createUserError) {
        logStep("Erro ao criar usuário", { error: createUserError.message });
        throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("Novo usuário criado", { userId, email: customerEmail });
    }

    // Verificar se usuário já tem workspace
    const { data: existingMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .maybeSingle();

    let workspaceId: string;

    if (existingMembership?.workspace_id) {
      // Atualizar workspace existente com dados do Stripe
      workspaceId = existingMembership.workspace_id;
      
      const { error: updateError } = await supabaseAdmin
        .from("workspaces")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          tier: tier,
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("id", workspaceId);

      if (updateError) {
        logStep("Erro ao atualizar workspace", { error: updateError.message });
      }

      logStep("Workspace existente atualizado", { workspaceId, tier });
    } else {
      // Criar novo workspace
      const workspaceName = session.customer_details?.name || `Workspace ${customerEmail.split("@")[0]}`;
      
      const { data: newWorkspace, error: wsError } = await supabaseAdmin
        .from("workspaces")
        .insert({
          name: workspaceName,
          owner_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          tier: tier,
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (wsError) {
        logStep("Erro ao criar workspace", { error: wsError.message });
        throw new Error(`Erro ao criar workspace: ${wsError.message}`);
      }

      workspaceId = newWorkspace.id;

      // Adicionar usuário como owner
      const { error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        logStep("Erro ao criar membership", { error: memberError.message });
      }

      // Criar API key
      const apiKeyHex = generateApiKey();
      await supabaseAdmin.from("workspace_api_keys").insert({
        workspace_id: workspaceId,
        api_key: apiKeyHex,
        is_active: true,
        name: "primary",
      });

      // Criar pipeline padrão
      const { data: pipeline } = await supabaseAdmin
        .from("pipelines")
        .insert({
          workspace_id: workspaceId,
          name: "Vendas",
          owner_user_id: userId,
        })
        .select("id")
        .single();

      if (pipeline?.id) {
        await supabaseAdmin.from("stages").insert([
          { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Novo", position: 1 },
          { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Em atendimento", position: 2 },
          { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Fechado", position: 3 },
        ]);
      }

      logStep("Novo workspace criado", { workspaceId, tier });
    }

    // Enviar email de boas-vindas se for novo usuário
    if (isNewUser && tempPassword) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const response = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            email: customerEmail,
            name: session.customer_details?.name || customerEmail.split("@")[0],
            tempPassword: tempPassword,
            tier: tier,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logStep("Erro ao enviar email", { status: response.status, error: errorText });
        } else {
          logStep("Email de boas-vindas enviado", { email: customerEmail });
        }
      } catch (emailError) {
        logStep("Exceção ao enviar email", { error: String(emailError) });
      }
    }

    logStep("Webhook processado com sucesso", {
      userId,
      workspaceId,
      tier,
      isNewUser,
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        workspaceId,
        tier,
        isNewUser,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Gerar senha temporária segura
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

// Gerar API key
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
