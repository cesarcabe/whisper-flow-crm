import "jsr:@supabase/functions-js@2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_BASE_URL = Deno.env.get("EVOLUTION_BASE_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

// Normalize Evolution status to internal status
function normalizeConnectionStatus(evolutionStatus: string | undefined | null): string {
  if (!evolutionStatus) return 'disconnected';
  
  const s = evolutionStatus.toLowerCase().trim();
  
  // Connected states
  if (s === 'open' || s === 'connected' || s === 'authenticated') {
    return 'connected';
  }
  
  // Pairing/connecting states  
  if (s === 'connecting' || s === 'qrcode' || s === 'qr' || s === 'waiting' || s === 'pairing') {
    return 'pairing';
  }
  
  // Disconnected states
  if (s === 'close' || s === 'closed' || s === 'logout' || s === 'disconnected') {
    return 'disconnected';
  }
  
  // Error states
  if (s === 'refused' || s === 'conflict' || s === 'unauthorized' || s === 'error') {
    return 'error';
  }
  
  console.log('[Edge:evolution-webhook] unknown_status', { raw: s });
  return 'disconnected';
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

// Fetch profile picture from Evolution API
async function fetchProfilePicture(instanceName: string, phone: string): Promise<string | null> {
  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
    console.log('[Edge:evolution-webhook] fetchProfilePicture skipped - missing config');
    return null;
  }

  try {
    const url = `${EVOLUTION_BASE_URL}/chat/fetchProfilePictureUrl/${instanceName}`;
    console.log('[Edge:evolution-webhook] fetchProfilePicture', { instanceName, phone });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: phone }),
    });

    if (!response.ok) {
      console.log('[Edge:evolution-webhook] fetchProfilePicture failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return null;
    }

    const result = await response.json();
    const avatarUrl = safeString(result?.profilePictureUrl ?? result?.url ?? result?.picture ?? null);
    
    console.log('[Edge:evolution-webhook] fetchProfilePicture result', { 
      hasAvatar: !!avatarUrl 
    });
    
    return avatarUrl;
  } catch (error: any) {
    console.log('[Edge:evolution-webhook] fetchProfilePicture error', { error: error?.message });
    return null;
  }
}

// Download media from Evolution and upload to Supabase storage
async function downloadAndStoreMedia(
  supabase: any,
  instanceName: string,
  messageKey: any,
  mediaType: string,
  workspaceId: string
): Promise<string | null> {
  if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia skipped - missing config');
    return null;
  }

  try {
    // Use Evolution API to get base64 from media message
    const url = `${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${instanceName}`;
    
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia', { 
      instanceName, 
      messageKey: messageKey?.id,
      mediaType 
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        message: {
          key: messageKey,
        },
        convertToMp4: false,
      }),
    });

    if (!response.ok) {
      console.log('[Edge:evolution-webhook] downloadAndStoreMedia api_failed', { 
        status: response.status 
      });
      return null;
    }

    const result = await response.json();
    const base64Data = result?.base64 ?? result?.data ?? null;
    const mimeType = result?.mimetype ?? result?.mimeType ?? 'application/octet-stream';

    if (!base64Data) {
      console.log('[Edge:evolution-webhook] downloadAndStoreMedia no_base64');
      return null;
    }

    // Determine file extension
    let ext = 'bin';
    if (mediaType === 'audio') ext = 'ogg';
    else if (mediaType === 'image') ext = 'jpg';
    else if (mediaType === 'video') ext = 'mp4';
    else if (mediaType === 'document') ext = 'pdf';
    else if (mediaType === 'sticker') ext = 'webp';

    // Decode and upload to storage
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `${workspaceId}/${mediaType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    console.log('[Edge:evolution-webhook] uploadToStorage', { 
      fileName, 
      size: binaryData.length 
    });

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, binaryData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.log('[Edge:evolution-webhook] storage_upload_error', { error: uploadError.message });
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    console.log('[Edge:evolution-webhook] storage_upload_success', { 
      url: publicUrlData.publicUrl 
    });

    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia error', { error: error?.message });
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") return json({ ok: true });

  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  console.log('[Edge:evolution-webhook] start', { method: req.method });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Segurança por Workspace API Key
  const apiKey = getHeader(req, "x-api-key");
  if (!apiKey) {
    console.log('[Edge:evolution-webhook] missing_api_key');
    return json({ code: 401, message: "Missing x-api-key" }, 401);
  }

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

  console.log('[Edge:evolution-webhook] event_received', { 
    eventType, 
    instanceName,
    hasApiKey: !!apiKey 
  });

  // resolve workspace_id pela api key
  const { data: wsKey, error: keyErr } = await supabase
    .from("workspace_api_keys")
    .select("workspace_id, is_active")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (keyErr) {
    console.log('[Edge:evolution-webhook] key_lookup_error', { error: keyErr.message });
    return json({ code: 500, message: "Key lookup failed", details: keyErr.message }, 500);
  }
  if (!wsKey?.workspace_id) {
    console.log('[Edge:evolution-webhook] invalid_api_key');
    return json({ code: 401, message: "Invalid API key" }, 401);
  }

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
    })
    .select("id")
    .maybeSingle();

  if (deliveryErr) {
    const msg = (deliveryErr.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("conflict")) {
      console.log('[Edge:evolution-webhook] idempotent_skip', { deliveryKey });
      return json({ ok: true, idempotent: true });
    }
    console.log('[Edge:evolution-webhook] delivery_insert_error', { error: deliveryErr.message });
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

    // First try to find existing
    const { data: existing } = await supabase
      .from("whatsapp_numbers")
      .select("id, instance_name, status")
      .eq("workspace_id", workspaceId)
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (existing) return existing;

    // If not found, we can't create without required fields
    console.log('[Edge:evolution-webhook] instance_not_found', { instanceName, workspaceId });
    return null;
  }

  // helper: upsert contato por workspace+phone, usando pushName e avatar
  async function upsertContact(
    phone: string, 
    pushName: string | null = null,
    avatarUrl: string | null = null
  ): Promise<string> {
    console.log('[Edge:evolution-webhook] upsertContact', { 
      phone, 
      pushName, 
      hasAvatar: !!avatarUrl 
    });

    // First check if contact exists
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name, avatar_url")
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      // Update name if pushName is provided and different from current
      // Only update if current name is just the phone number or empty
      const shouldUpdateName = pushName && 
        (existing.name === phone || existing.name === null || existing.name === '');
      
      // Update avatar if we have one and current is null
      const shouldUpdateAvatar = avatarUrl && !existing.avatar_url;
      
      if (shouldUpdateName || shouldUpdateAvatar) {
        const updates: Record<string, unknown> = {};
        if (shouldUpdateName) updates.name = pushName;
        if (shouldUpdateAvatar) updates.avatar_url = avatarUrl;
        
        console.log('[Edge:evolution-webhook] updateContact', { 
          contactId: existing.id, 
          updates 
        });
        
        await supabase
          .from("contacts")
          .update(updates)
          .eq("id", existing.id);
      }
      
      return existing.id as string;
    }

    // Create new contact - need user_id (use a system user or first admin)
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();

    // Use pushName if available, otherwise fallback to phone
    const contactName = pushName || phone;
    
    console.log('[Edge:evolution-webhook] createContact', { 
      phone, 
      name: contactName, 
      hasAvatar: !!avatarUrl 
    });

    const { data: c, error } = await supabase
      .from("contacts")
      .insert({
        workspace_id: workspaceId,
        phone,
        name: contactName,
        avatar_url: avatarUrl,
        user_id: member?.user_id || workspaceId,
      })
      .select("id")
      .single();

    if (error) throw new Error("Failed to create contact: " + error.message);
    return c.id as string;
  }

  // helper: upsert conversa 1:1 workspace+contact+whatsapp_number
  async function upsertConversation(contactId: string, whatsappNumberId: string, remoteJid: string | null) {
    // Detect if it's a group chat
    const isGroup = remoteJid ? remoteJid.endsWith('@g.us') : false;
    
    // First check if conversation exists by remote_jid (more accurate) or contact
    let existing: any = null;
    
    if (remoteJid) {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("whatsapp_number_id", whatsappNumberId)
        .eq("remote_jid", remoteJid)
        .maybeSingle();
      existing = data;
    }
    
    if (!existing) {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .eq("whatsapp_number_id", whatsappNumberId)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      // Update remote_jid and is_group if not set
      if (remoteJid) {
        await supabase
          .from("conversations")
          .update({ remote_jid: remoteJid, is_group: isGroup })
          .eq("id", existing.id)
          .is("remote_jid", null);
      }
      return existing.id as string;
    }

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        whatsapp_number_id: whatsappNumberId,
        remote_jid: remoteJid,
        is_group: isGroup,
      })
      .select("id")
      .single();

    if (error) throw new Error("Failed to create conversation: " + error.message);
    return conv.id as string;
  }

  // 4) Processamento dos eventos
  try {
    // --- connection.update ---
    if (eventType === "connection.update") {
      const wa = await ensureWhatsappNumber();
      if (!wa) {
        await markDelivery("ignored", "Missing instanceName or instance not found");
        return json({ ok: true, ignored: true });
      }

      const rawStatus = safeString(data?.state ?? data?.status ?? data?.connection ?? null) ?? "unknown";
      const normalizedStatus = normalizeConnectionStatus(rawStatus);
      const phone = normalizePhone(safeString(data?.phone_number ?? data?.number ?? data?.me?.id ?? null));
      const lastQr = safeString(data?.qr ?? data?.last_qr ?? null);

      console.log('[Edge:evolution-webhook] connection_update', { 
        instanceName, 
        rawStatus,
        normalizedStatus,
        oldStatus: wa.status
      });

      const updates: Record<string, unknown> = {
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      };

      if (phone) updates.phone_number = phone;
      if (lastQr) updates.last_qr = lastQr;

      // If connected, update last_connected_at and is_active
      if (normalizedStatus === 'connected') {
        updates.last_connected_at = new Date().toISOString();
        updates.is_active = true;
      }
      
      // If disconnected/error, mark as inactive
      if (normalizedStatus === 'disconnected' || normalizedStatus === 'error') {
        updates.is_active = false;
      }

      await supabase
        .from("whatsapp_numbers")
        .update(updates)
        .eq("id", wa.id);

      console.log('[Edge:evolution-webhook] status_updated', { 
        instanceName, 
        status: normalizedStatus,
        updatedFields: Object.keys(updates)
      });

      await markDelivery("processed");
      return json({ ok: true, status: normalizedStatus });
    }

    // --- qrcode.updated ---
    if (eventType === "qrcode.updated") {
      const wa = await ensureWhatsappNumber();
      if (!wa) {
        await markDelivery("ignored", "Missing instanceName or instance not found");
        return json({ ok: true, ignored: true });
      }

      const qrBase64 = safeString(data?.qrcode?.base64 ?? data?.base64 ?? null);
      const qrCode = safeString(data?.qrcode?.code ?? data?.code ?? null);
      
      // Prefer base64 image over code token
      const qrValue = qrBase64 || qrCode;
      
      console.log('[Edge:evolution-webhook] qrcode_updated', { 
        instanceName, 
        hasBase64: !!qrBase64,
        hasCode: !!qrCode 
      });

      if (qrValue) {
        await supabase
          .from("whatsapp_numbers")
          .update({
            last_qr: qrValue,
            status: 'pairing',
            updated_at: new Date().toISOString(),
          })
          .eq("id", wa.id);
      }

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

      // Extract pushName from payload (Evolution API sends this with messages)
      const pushName = safeString(
        data?.pushName ?? 
        data?.message?.pushName ?? 
        data?.contact?.name ?? 
        data?.contact?.pushname ?? 
        null
      );

      console.log('[Edge:evolution-webhook] message_contact_info', { 
        phone, 
        pushName,
        remoteJid 
      });

      // Try to fetch avatar from Evolution API (async, non-blocking for response)
      let avatarUrl: string | null = null;
      if (instanceName && !remoteJid?.endsWith('@g.us')) {
        // Only fetch avatar for individual chats, not groups
        // Do this async to not block the webhook response
        avatarUrl = await fetchProfilePicture(instanceName, phone);
      }

      const contactId = await upsertContact(phone, pushName, avatarUrl);
      const conversationId = await upsertConversation(contactId, wa.id, remoteJid);

      // Auditoria (event log)
      await supabase.from("conversation_events").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        provider: "evolution",
        event_type: eventType,
        provider_event_id: providerEventId,
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

      const isFromMe = data?.key?.fromMe === true;

      // Detect message type and extract media URL
      let messageType = "text";
      let mediaUrl: string | null = null;
      let bodyTextFinal = text;
      let needsMediaDownload = false;

      // Check for audio message
      if (data?.message?.audioMessage) {
        messageType = "audio";
        bodyTextFinal = "🎤 Áudio";
        needsMediaDownload = true;
      }
      // Check for image message
      else if (data?.message?.imageMessage) {
        messageType = "image";
        bodyTextFinal = data?.message?.imageMessage?.caption || "📷 Imagem";
        needsMediaDownload = true;
      }
      // Check for video message
      else if (data?.message?.videoMessage) {
        messageType = "video";
        bodyTextFinal = data?.message?.videoMessage?.caption || "🎥 Vídeo";
        needsMediaDownload = true;
      }
      // Check for document message
      else if (data?.message?.documentMessage) {
        messageType = "document";
        bodyTextFinal = data?.message?.documentMessage?.fileName || "📎 Documento";
        needsMediaDownload = true;
      }
      // Check for sticker message
      else if (data?.message?.stickerMessage) {
        messageType = "sticker";
        bodyTextFinal = "🎨 Sticker";
        needsMediaDownload = true;
      }
      // Check for voice note (ptt - push to talk)
      else if (data?.message?.pttMessage) {
        messageType = "audio";
        bodyTextFinal = "🎤 Áudio";
        needsMediaDownload = true;
      }

      // Download and store media if needed (for received messages only)
      if (needsMediaDownload && !isFromMe && instanceName && data?.key) {
        try {
          const storedUrl = await downloadAndStoreMedia(
            supabase,
            instanceName,
            data.key,
            messageType,
            workspaceId
          );
          if (storedUrl) {
            mediaUrl = storedUrl;
            console.log('[Edge:evolution-webhook] media_stored', { messageType, url: storedUrl });
          } else {
            console.log('[Edge:evolution-webhook] media_storage_failed', { messageType });
          }
        } catch (mediaError: any) {
          console.log('[Edge:evolution-webhook] media_download_error', { error: mediaError?.message });
        }
      }

      console.log('[Edge:evolution-webhook] message_parsed', { 
        messageType, 
        hasMediaUrl: !!mediaUrl,
        bodyLength: bodyTextFinal.length 
      });

      // insert: se existir unique e der conflito, a função não pode quebrar
      const { error: msgErr } = await supabase.from("messages").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        whatsapp_number_id: wa.id,
        external_id: providerEventId,
        is_outgoing: isFromMe,
        body: bodyTextFinal,
        type: messageType,
        media_url: mediaUrl,
        status: isFromMe ? "sent" : "delivered",
      });

      if (msgErr) {
        const m = (msgErr.message ?? "").toLowerCase();
        if (!(m.includes("duplicate") || m.includes("unique") || m.includes("conflict"))) {
          throw new Error("Failed to insert message: " + msgErr.message);
        }
      }

      // Atualiza "last message"
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await markDelivery("processed");
      return json({ ok: true });
    }

    // evento desconhecido: não quebra
    console.log('[Edge:evolution-webhook] unhandled_event', { eventType });
    await markDelivery("ignored", `Unhandled eventType: ${eventType ?? "null"}`);
    return json({ ok: true, ignored: true });
  } catch (e: any) {
    console.log('[Edge:evolution-webhook] error', { error: e?.message });
    await markDelivery("failed", e?.message ?? "Unknown error");
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
});
