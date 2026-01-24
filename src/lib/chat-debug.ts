export type ChatDebugEvent =
  | 'media:select'
  | 'media:upload:start'
  | 'media:upload:progress'
  | 'media:upload:success'
  | 'media:upload:error'
  | 'media:send:success'
  | 'media:send:error'
  | 'reply:set'
  | 'reply:clear'
  | 'reply:send'
  | 'signedUrl:resolve'
  | 'signedUrl:error';

type ChatDebugDetail = {
  event: ChatDebugEvent;
  payload?: Record<string, unknown>;
  timestamp: string;
};

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('debugChat') === '1' || localStorage.getItem('chat_debug') === '1';
  } catch {
    return false;
  }
}

export function emitChatDebug(event: ChatDebugEvent, payload?: Record<string, unknown>): void {
  if (!isDebugEnabled()) return;
  if (typeof window === 'undefined') return;

  const detail: ChatDebugDetail = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('chat-debug', { detail }));
  // Also log to console for quick inspection
  // eslint-disable-next-line no-console
  console.log(`[CHAT_DEBUG] ${event}`, payload ?? {});
}
