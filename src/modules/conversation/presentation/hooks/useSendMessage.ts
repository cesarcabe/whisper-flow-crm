import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalWebSocketContext } from '../../infrastructure/websocket/WebSocketContext';

interface SendMessageInput {
  conversationId: string;
  message: string;
  replyToId?: string | null;
  clientMessageId?: string;
}

type SendMessageResult = { success: true } | { success: false; error: Error };

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false);
  const websocketContext = useOptionalWebSocketContext();
  const client = websocketContext?.client ?? null;
  const isWebSocketEnabled = websocketContext?.isEnabled ?? false;

  const sendMessage = useCallback(async (input: SendMessageInput): Promise<SendMessageResult> => {
    try {
      const clientMessageId = input.clientMessageId ?? createClientMessageId();

      if (isWebSocketEnabled && client?.isConnected()) {
        client.sendMessage({
          conversationId: input.conversationId,
          content: input.message,
          messageId: clientMessageId,
          replyToMessageId: input.replyToId ?? undefined,
        });

        return { success: true };
      }

      setIsSending(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: input.conversationId,
          message: input.message,
          clientMessageId,
          replyToId: input.replyToId ?? undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar mensagem');
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao enviar mensagem');
      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  }, [client, isWebSocketEnabled]);

  return {
    sendMessage,
    isSending,
  };
}

function createClientMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
