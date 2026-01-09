export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeDeliveryKey(
  provider: string,
  eventType: string | null,
  instanceName: string | null,
  bodyText: string,
  providerEventId?: string | null,
): Promise<string> {
  const base = `${provider}:${eventType ?? "unknown"}:${instanceName ?? "unknown"}:`;
  if (providerEventId) return base + providerEventId;
  return base + (await sha256Hex(bodyText));
}
