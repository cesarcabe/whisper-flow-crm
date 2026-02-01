/**
 * useSendMessage - Hook para envio de mensagens
 *
 * Usa o IWhatsAppProvider (via EvolutionAPIAdapter) em vez de chamar
 * supabase.functions.invoke diretamente. Mantém optimistic updates.
 */

import { useCallback } from 'react';
import { getContainer } from '@/config/di-container';
import { useOptimisticMessages, createClientMessageId } from './useOptimisticMessages';

interface SendMessageInput {
  conversationId: string;
  message: string;
  replyToId?: string | null;
  clientMessageId?: string;
}

type SendMessageResult =
  | { success: true; clientMessageId: string }
  | { success: false; error: Error; clientMessageId: string };

interface UseSendMessageReturn {
  sendMessage: (input: SendMessageInput) => Promise<SendMessageResult>;
  retrySend: (clientMessageId: string) => Promise<SendMessageResult | null>;
  optimistic: ReturnType<typeof useOptimisticMessages>;
}

export function useSendMessage(): UseSendMessageReturn {
  const optimistic = useOptimisticMessages();

  const executeRealSend = useCallback(async (
    conversationId: string,
    content: string,
    clientMessageId: string,
    replyToId?: string | null
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { whatsAppProvider } = getContainer();
      const result = await whatsAppProvider.sendText({
        conversationId,
        message: content,
        clientMessageId,
        replyToId: replyToId ?? undefined,
      });

      if (!result.ok) {
        return { success: false, error: new Error(result.error.message) };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Erro ao enviar mensagem')
      };
    }
  }, []);

  const sendMessage = useCallback(async (input: SendMessageInput): Promise<SendMessageResult> => {
    const clientMessageId = input.clientMessageId ?? createClientMessageId();
    const content = input.message.trim();

    if (!content) {
      return {
        success: false,
        error: new Error('Mensagem vazia'),
        clientMessageId,
      };
    }

    // 1. Add optimistic message immediately
    optimistic.addOptimisticMessage({
      clientId: clientMessageId,
      conversationId: input.conversationId,
      content,
      type: 'text',
      replyToId: input.replyToId,
    });

    // 2. Send in background (fire and forget with error handling)
    executeRealSend(
      input.conversationId,
      content,
      clientMessageId,
      input.replyToId
    ).then(result => {
      if (result.success) {
        optimistic.confirmMessage(clientMessageId);
      } else {
        optimistic.failMessage(clientMessageId, result.error?.message || 'Erro ao enviar');
      }
    }).catch(err => {
      optimistic.failMessage(clientMessageId, err.message || 'Erro ao enviar');
    });

    // 3. Return immediate optimistic success
    return {
      success: true,
      clientMessageId,
    };
  }, [optimistic, executeRealSend]);

  const retrySend = useCallback(async (clientMessageId: string): Promise<SendMessageResult | null> => {
    const message = optimistic.retryMessage(clientMessageId);
    if (!message) {
      return null;
    }

    const result = await executeRealSend(
      message.conversationId,
      message.content,
      message.clientId,
      message.replyToId
    );

    if (result.success) {
      optimistic.confirmMessage(clientMessageId);
      return { success: true, clientMessageId };
    } else {
      optimistic.failMessage(clientMessageId, result.error?.message || 'Erro ao reenviar');
      return {
        success: false,
        error: result.error || new Error('Erro ao reenviar'),
        clientMessageId
      };
    }
  }, [optimistic, executeRealSend]);

  return {
    sendMessage,
    retrySend,
    optimistic,
  };
}
