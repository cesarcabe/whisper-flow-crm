import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  professional: "Profissional",
  enterprise: "Enterprise",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);

    const { email, name, tempPassword, tier } = await req.json();

    if (!email || !tempPassword) {
      throw new Error("Email e senha temporária são obrigatórios");
    }

    logStep("Dados recebidos", { email, name, tier });

    const tierName = TIER_NAMES[tier] || "Starter";
    const loginUrl = "https://whisper-flow-crm.lovable.app/auth";

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao NewFlow CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                🎉 Bem-vindo ao NewFlow CRM!
              </h1>
              <p style="color: #BFDBFE; margin: 10px 0 0; font-size: 16px;">
                Plano ${tierName}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Olá <strong>${name || "Cliente"}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Sua conta foi criada com sucesso! Abaixo estão suas credenciais de acesso:
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6B7280; font-size: 14px;">Email:</span><br>
                          <span style="color: #111827; font-size: 16px; font-weight: 600;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6B7280; font-size: 14px;">Senha temporária:</span><br>
                          <code style="color: #111827; font-size: 18px; font-weight: 700; background-color: #E5E7EB; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px;">${tempPassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Acessar minha conta →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; margin: 25px 0;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0;">
                      <strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha após o primeiro acesso.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0;">
                Se tiver qualquer dúvida, responda este email que teremos prazer em ajudar.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 25px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © 2025 NewFlow CRM. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "NewFlow CRM <noreply@newflow.me>",
      to: [email],
      subject: `🎉 Bem-vindo ao NewFlow CRM - Plano ${tierName}`,
      html: emailHtml,
    });

    logStep("Email enviado com sucesso", { response: emailResponse });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO ao enviar email", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
