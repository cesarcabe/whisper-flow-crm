export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function normalizeEventType(ev: string | null): string | null {
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

export function normalizeConnectionStatus(evolutionStatus: string | undefined | null): string {
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
