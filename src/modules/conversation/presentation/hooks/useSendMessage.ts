import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SendMessageInput {
  conversationId: string;
  message: string;
  replyToId?: string | null;
}

type SendMessageResult = { success: true } | { success: false; error: Error };

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (input: SendMessageInput): Promise<SendMessageResult> => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: input.conversationId,
          message: input.message,
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
  }, []);

  return {
    sendMessage,
    isSending,
  };
}
