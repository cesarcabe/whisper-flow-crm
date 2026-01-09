export function getHeader(req: Request, name: string): string | null {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

export function safeString(x: unknown): string | null {
  if (x === null || x === undefined) return null;
  if (typeof x === "string") return x;
  try {
    return String(x);
  } catch {
    return null;
  }
}

export function extractEvent(body: Record<string, unknown>) {
  const eventType = body?.event ?? body?.type ?? 
    (body?.hook as Record<string, unknown>)?.event ?? 
    (body?.webhook as Record<string, unknown>)?.event ?? null;

  const data = body?.data ?? body;
  const instanceName = body?.instance ?? body?.instanceName ?? 
    (data as Record<string, unknown>)?.instance ?? 
    (data as Record<string, unknown>)?.instanceName ?? null;

  return {
    eventType: safeString(eventType),
    instanceName: safeString(instanceName),
    data,
  };
}
