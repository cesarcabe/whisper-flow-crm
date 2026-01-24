import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type DebugEntry = {
  id: string;
  event: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

export function ChatDebugPanel() {
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  useEffect(() => {
    const handler = (evt: Event) => {
      const custom = evt as CustomEvent<{ event: string; timestamp: string; payload?: Record<string, unknown> }>;
      const detail = custom.detail;
      if (!detail) return;

      setEntries((prev) => [
        {
          id: `${detail.event}-${detail.timestamp}-${Math.random().toString(16).slice(2, 8)}`,
          event: detail.event,
          timestamp: detail.timestamp,
          payload: detail.payload,
        },
        ...prev.slice(0, 49),
      ]);
    };

    window.addEventListener('chat-debug', handler as EventListener);
    return () => window.removeEventListener('chat-debug', handler as EventListener);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
        Debug ativo. Aguardando eventos...
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-auto border-t bg-muted/30 px-3 py-2 text-xs">
      <div className="font-medium text-muted-foreground mb-2">Chat Debug</div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className={cn('rounded bg-background/70 p-2 border')}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{entry.event}</span>
              <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            {entry.payload && (
              <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-muted-foreground">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
