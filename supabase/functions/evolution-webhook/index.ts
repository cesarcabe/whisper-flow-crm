import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getHeader(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

function safeString(x: any): string | null {
  if (x === null || x === undefined) return null;
  if (typeof x === "string") return x;
  try {
    return String(x);
  } catch {
    return null;
  }
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

function extractEvent(body: any) {
  const eventType = body?.event ?? body?.type ?? body?.hook?.event ?? body?.webhook?.event ?? null;

  const instanceName = body?.instance ?? body?.instanceName ?? body?.data?.instance ?? body?.data?.instanceName ?? null;

  const data = body?.data ?? body;

  return {
    eventType: safeString(eventType),
    instanceName: safeString(instanceName),
    data,
  };
}

function normalizeEventType(ev: string | null) {
  if (!ev) return null;
  const e = ev.trim();

  // Evolution (UPPERCASE)
  if (e === "CONNECTION_UPDATE") return "connection.update";
  if (e === "MESSAGES_UPSERT") return "messages.upsert";
  if (e === "MESSAGES_UPDATE") return "messages.update";
  if (e === "QRCODE_UPDATED") return "qrcode.updated";

  // já no formato antigo
  return e;
}

async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeDeliveryKey(
  provider: string,
  eventType: string | null,
  instanceName: string | null,
  bodyText: string,
  providerEventId?: string | null,
) {
  const base = `${provider}:${eventType ?? "unknown"}:${instanceName ?? "unknown"}:`;
  if (providerEventId) return base + providerEventId;
  return base + (await sha256Hex(bodyText));
}

Deno.serve(async (req: Request) => {
  // Health check
  if (req.method === "GET") return json({ ok: true });

  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Segurança por Workspace API Key
  const apiKey = getHeader(req, "x-api-key");
  if (!apiKey) return json({ code: 401, message: "Missing x-api-key" }, 401);

  const bodyText = await req.text();
  let body: any;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  const extracted = extractEvent(body);
  const eventType = normalizeEventType(extracted.eventType);
  const instanceName = extracted.instanceName;
  const data = extracted.data;

  // resolve workspace_id pela api key
  const { data: wsKey, error: keyErr } = await supabase
    .from("workspace_api_keys")
    .select("workspace_id, is_active")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (keyErr) return json({ code: 500, message: "Key lookup failed", details: keyErr.message }, 500);
  if (!wsKey?.workspace_id) return json({ code: 401, message: "Invalid API key" }, 401);

  const workspaceId = wsKey.workspace_id as string;

  // 2) provider_event_id (se existir)
  const providerEventId =
    safeString(data?.id) ??
    safeString(data?.messageId) ??
    safeString(data?.key?.id) ??
    safeString(data?.message?.key?.id) ??
    null;

  // 3) Idempotência via webhook_deliveries
  const deliveryKey = await makeDeliveryKey("evolution", eventType, instanceName, bodyText, providerEventId);

  // tenta inserir; se já existe, retorna 200
  const { data: deliveryRow, error: deliveryErr } = await supabase
    .from("webhook_deliveries")
    .insert({
      workspace_id: workspaceId,
      provider: "evolution",
      event_type: eventType ?? "unknown",
      instance_name: instanceName,
      delivery_key: deliveryKey,
      payload: body,
      headers: Object.fromEntries(req.headers.entries()),
      status: "received",
      attempt_count: 1,
    })
    .select("id")
    .maybeSingle();

  if (deliveryErr) {
    const msg = (deliveryErr.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("conflict")) {
      return json({ ok: true, idempotent: true });
    }
    return json({ code: 500, message: "Failed to insert webhook_deliveries", details: deliveryErr.message }, 500);
  }

  const deliveryId = deliveryRow?.id;

  async function markDelivery(status: string, errorMessage?: string) {
    if (!deliveryId) return;
    await supabase
      .from("webhook_deliveries")
      .update({
        status,
        processed_at: new Date().toISOString(),
        error_message: errorMessage ?? null,
      })
      .eq("id", deliveryId);
  }

  // helper: resolve/create whatsapp_numbers por workspace+instance_name
  async function ensureWhatsappNumber() {
    if (!instanceName) return null;

    const { data: wa, error } = await supabase
      .from("whatsapp_numbers")
      .upsert(
        {
          workspace_id: workspaceId,
          instance_name: instanceName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,instance_name" },
      )
      .select("id, instance_name")
      .single();

    if (error) throw new Error("Failed to upsert whatsapp_numbers: " + error.message);
    return wa;
  }

  // helper: upsert contato por workspace+phone
  async function upsertContact(phone: string) {
    const { data: c, error } = await supabase
      .from("contacts")
      .upsert(
        {
          workspace_id: workspaceId,
          phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,phone" },
      )
      .select("id")
      .single();

    if (error) throw new Error("Failed to upsert contact: " + error.message);
    return c.id as string;
  }

  // helper: upsert conversa 1:1 workspace+contact+whatsapp_number
  async function upsertConversation(contactId: string, whatsappNumberId: string) {
    const { data: conv, error } = await supabase
      .from("conversations")
      .upsert(
        {
          workspace_id: workspaceId,
          contact_id: contactId,
          whatsapp_number_id: whatsappNumberId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,contact_id,whatsapp_number_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error("Failed to upsert conversation: " + error.message);
    return conv.id as string;
  }

  // 4) Processamento dos eventos
  try {
    // --- connection.update ---
    if (eventType === "connection.update") {
      const wa = await ensureWhatsappNumber();
      if (!wa) {
        await markDelivery("ignored", "Missing instanceName");
        return json({ ok: true, ignored: true });
      }

      const status = safeString(data?.state ?? data?.status ?? data?.connection ?? null) ?? "unknown";
      const phone = normalizePhone(safeString(data?.phone_number ?? data?.number ?? data?.me?.id ?? null));
      const lastQr = safeString(data?.qr ?? data?.last_qr ?? null);

      await supabase
        .from("whatsapp_numbers")
        .update({
          status,
          phone_number: phone,
          last_qr: lastQr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wa.id);

      await markDelivery("processed");
      return json({ ok: true });
    }

    // --- messages.* ---
    if (eventType === "messages.upsert" || eventType === "messages.update") {
      const wa = await ensureWhatsappNumber();
      if (!wa) {
        await markDelivery("failed", "Missing instanceName for message event");
        return json({ ok: false, message: "Missing instanceName" }, 422);
      }

      // Extrair o "remoteJid" / from / sender
      const remoteJid = safeString(
        data?.key?.remoteJid ?? data?.remoteJid ?? data?.from ?? data?.sender ?? data?.message?.key?.remoteJid ?? null,
      );

      const phone = normalizePhone(remoteJid);
      if (!phone) {
        await markDelivery("ignored", "Could not extract phone from payload");
        return json({ ok: true, ignored: true });
      }

      const contactId = await upsertContact(phone);
      const conversationId = await upsertConversation(contactId, wa.id);

      // Auditoria (event log)
      await supabase.from("conversation_events").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        provider: "evolution",
        event_type: eventType,
        provider_event_id: providerEventId,
        instance_name: instanceName,
        metadata: { raw: data },
      });

      // messages.update: só status/metadata (mensagem imutável)
      if (eventType === "messages.update") {
        const newStatus =
          safeString(data?.status ?? data?.ack ?? data?.message?.status ?? data?.update?.status ?? null) ?? null;

        if (providerEventId) {
          await supabase
            .from("messages")
            .update({
              status: newStatus,
              metadata: data,
              updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", workspaceId)
            .eq("whatsapp_number_id", wa.id)
            .eq("external_id", providerEventId);
        }

        await markDelivery("processed");
        return json({ ok: true });
      }

      // messages.upsert: inserir mensagem (idempotente pela uq de external_id)
      const text =
        safeString(
          data?.message?.conversation ??
            data?.message?.text ??
            data?.text ??
            data?.body ??
            data?.message?.extendedTextMessage?.text ??
            null,
        ) ?? "";

      const direction =
        safeString(data?.direction ?? (data?.key?.fromMe ? "out" : "in")) ?? (data?.key?.fromMe ? "out" : "in");

      // insert: se existir unique e der conflito, a função não pode quebrar
      const { error: msgErr } = await supabase.from("messages").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        whatsapp_number_id: wa.id,
        external_id: providerEventId, // pode ser null; ideal ter id
        direction,
        body: text,
        metadata: data,
        status: "received",
        created_at: new Date().toISOString(),
      });

      if (msgErr) {
        const m = (msgErr.message ?? "").toLowerCase();
        if (!(m.includes("duplicate") || m.includes("unique") || m.includes("conflict"))) {
          throw new Error("Failed to insert message: " + msgErr.message);
        }
      }

      // Atualiza “last message” (se suas colunas existirem; se não, não quebra)
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: text.slice(0, 140),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await markDelivery("processed");
      return json({ ok: true });
    }

    // evento desconhecido: não quebra
    await markDelivery("ignored", `Unhandled eventType: ${eventType ?? "null"}`);
    return json({ ok: true, ignored: true });
  } catch (e: any) {
    await markDelivery("failed", e?.message ?? "Unknown error");
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
});
