import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Mapeamento de price_id para tier
const PRICE_TO_TIER: Record<string, string> = {
  "price_1RTv8VE5SkMoSFzluQRDJfqE": "starter",      // Essencial - R$ 49,90/mês - 3 membros
  "price_1RTv99E5SkMoSFzlPo5o22YI": "professional", // Avançado - R$ 79,90/mês - 6 membros
  "price_1RTv9lE5SkMoSFzlyB1WCX2B": "enterprise",   // Premium - R$ 129,90/mês - ilimitado
};

// Nomes amigáveis dos tiers
const TIER_DISPLAY_NAMES: Record<string, string> = {
  starter: "Essencial",
  professional: "Avançado",
  enterprise: "Premium",
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

    // Eventos de assinatura suportados
    const supportedEvents = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
      "customer.subscription.pending_update_applied",
      "customer.subscription.pending_update_expired",
      "customer.subscription.trial_will_end",
    ];

    if (!supportedEvents.includes(event.type)) {
      logStep("Evento ignorado", { type: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] || "starter";
    const subscriptionStatus = subscription.status;

    logStep("Subscription event", {
      eventType: event.type,
      subscriptionId,
      customerId,
      priceId,
      tier,
      status: subscriptionStatus,
    });

    // Buscar email do cliente no Stripe
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      throw new Error("Email do cliente não encontrado no Stripe");
    }

    logStep("Customer details", { customerId, email: customerEmail, name: customer.name });

    // Inicializar Supabase Admin para eventos que precisam atualizar dados
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Mapear status do Stripe para status interno
    const mapSubscriptionStatus = (stripeStatus: string, eventType: string): string => {
      if (eventType === "customer.subscription.deleted") return "canceled";
      if (eventType === "customer.subscription.paused") return "paused";
      if (eventType === "customer.subscription.resumed") return "active";
      
      switch (stripeStatus) {
        case "active": return "active";
        case "past_due": return "past_due";
        case "canceled": return "canceled";
        case "unpaid": return "unpaid";
        case "trialing": return "trialing";
        case "paused": return "paused";
        default: return stripeStatus;
      }
    };

    // Eventos que apenas atualizam status (não criam usuário/workspace)
    const statusOnlyEvents = [
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
      "customer.subscription.pending_update_applied",
      "customer.subscription.pending_update_expired",
      "customer.subscription.trial_will_end",
    ];

    if (statusOnlyEvents.includes(event.type)) {
      const newStatus = mapSubscriptionStatus(subscriptionStatus, event.type);
      
      const { error: updateError } = await supabaseAdmin
        .from("workspaces")
        .update({
          subscription_status: newStatus,
          tier: tier,
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);

      if (updateError) {
        logStep("Erro ao atualizar workspace", { error: updateError.message });
      }

      logStep(`Subscription ${event.type}`, { subscriptionId, newStatus });
      return new Response(JSON.stringify({ success: true, action: event.type, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase Admin já foi inicializado acima

    // Verificar se já existe usuário com este email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      logStep("Usuário existente encontrado", { userId, email: customerEmail });
    } else {
      // Criar novo usuário SEM senha (usará Magic Link)
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          full_name: customer.name || customerEmail.split("@")[0],
          stripe_customer_id: customerId,
        },
      });

      if (createUserError) {
        logStep("Erro ao criar usuário", { error: createUserError.message });
        throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("Novo usuário criado (Magic Link)", { userId, email: customerEmail });
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
      const workspaceName = customer.name || `Workspace ${customerEmail.split("@")[0]}`;
      
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
    if (isNewUser) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const tierDisplayName = TIER_DISPLAY_NAMES[tier] || "Essencial";
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            email: customerEmail,
            name: customer.name || customerEmail.split("@")[0],
            tier: tier,
            tierDisplayName: tierDisplayName,
            useMagicLink: true, // Indica para usar Magic Link
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logStep("Erro ao enviar email", { status: response.status, error: errorText });
        } else {
          logStep("Email de boas-vindas enviado (Magic Link)", { email: customerEmail });
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

// Gerar API key
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
