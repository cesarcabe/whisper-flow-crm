import { useEffect, useMemo, useState } from 'react';
import { CHATENGINE_BASE_URL } from '../../infrastructure/chatengine/config';

const JWT_SECRET = import.meta.env.VITE_CHATENGINE_JWT_SECRET ?? '';
const JWT_TTL_SECONDS = Number(import.meta.env.VITE_CHATENGINE_JWT_TTL_SECONDS ?? 3600);

interface ChatEngineJwtState {
  token: string | null;
  isLoading: boolean;
  isConfigured: boolean;
}

export function useChatEngineJwt(workspaceId: string | null): ChatEngineJwtState {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => {
    return Boolean(CHATENGINE_BASE_URL && JWT_SECRET);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!workspaceId || !isConfigured) {
      setToken(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    createJwt(workspaceId, JWT_SECRET, JWT_TTL_SECONDS)
      .then((jwt) => {
        if (isActive) {
          setToken(jwt);
        }
      })
      .catch((error) => {
        console.error('[useChatEngineJwt] Failed to generate token:', error);
        if (isActive) {
          setToken(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [workspaceId, isConfigured]);

  return {
    token,
    isLoading,
    isConfigured,
  };
}

async function createJwt(workspaceId: string, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: workspaceId,
    workspaceId,
    iat: now,
    exp: now + ttlSeconds,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = await signHmacSha256(data, secret);

  return `${data}.${signature}`;
}

async function signHmacSha256(data: string, secret: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signatureBuffer));
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
