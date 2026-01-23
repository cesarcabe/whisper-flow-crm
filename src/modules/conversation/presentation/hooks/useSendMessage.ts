/**
 * useSendMessage - Hook para envio de mensagens
 * 
 * Permite envio de múltiplas mensagens em paralelo sem bloqueio.
 * Usa optimistic updates para feedback instantâneo na UI.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalWebSocketContext } from '../../infrastructure/websocket/WebSocketContext';
import { useOptimisticMessages, createClientMessageId } from './useOptimisticMessages';

interface SendMessageInput {
  conversationId: string;
  message: string;
  replyToId?: string | null;
  /** ID do cliente (gerado automaticamente se não fornecido) */
  clientMessageId?: string;
}

type SendMessageResult = 
  | { success: true; clientMessageId: string } 
  | { success: false; error: Error; clientMessageId: string };

interface UseSendMessageReturn {
  /**
   * Envia uma mensagem de texto.
   * NÃO bloqueia - múltiplas mensagens podem ser enviadas em paralelo.
   * A mensagem aparece imediatamente na UI com status 'sending'.
   */
  sendMessage: (input: SendMessageInput) => Promise<SendMessageResult>;
  
  /**
   * Reenvia uma mensagem que falhou.
   * @param clientMessageId - ID do cliente da mensagem que falhou
   */
  retrySend: (clientMessageId: string) => Promise<SendMessageResult | null>;
  
  /**
   * Hook de mensagens otimistas (para acesso direto se necessário)
   */
  optimistic: ReturnType<typeof useOptimisticMessages>;
}

export function useSendMessage(): UseSendMessageReturn {
  const websocketContext = useOptionalWebSocketContext();
  const client = websocketContext?.client ?? null;
  const isWebSocketEnabled = websocketContext?.isEnabled ?? false;
  const optimistic = useOptimisticMessages();

  /**
   * Executa o envio real da mensagem (WebSocket ou Edge Function)
   */
  const executeRealSend = useCallback(async (
    conversationId: string,
    content: string,
    clientMessageId: string,
    replyToId?: string | null
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      // Tentar WebSocket primeiro
      if (isWebSocketEnabled && client?.isConnected()) {
        client.sendMessage({
          conversationId,
          content,
          messageId: clientMessageId,
          replyToMessageId: replyToId ?? undefined,
        });
        return { success: true };
      }

      // Fallback para Edge Function
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId,
          message: content,
          clientMessageId,
          replyToId: replyToId ?? undefined,
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
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Erro ao enviar mensagem') 
      };
    }
  }, [client, isWebSocketEnabled]);

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

    // 1. Adicionar mensagem otimista IMEDIATAMENTE (antes de enviar)
    optimistic.addOptimisticMessage({
      clientId: clientMessageId,
      conversationId: input.conversationId,
      content,
      type: 'text',
      replyToId: input.replyToId,
    });

    // 2. Enviar em background (não bloqueia)
    // Não usamos await aqui para não travar - fire and forget com tratamento
    executeRealSend(
      input.conversationId,
      content,
      clientMessageId,
      input.replyToId
    ).then(result => {
      if (result.success) {
        // Marcar como enviada - será removida quando a mensagem real chegar
        optimistic.confirmMessage(clientMessageId);
      } else {
        // Marcar como falha
        optimistic.failMessage(clientMessageId, result.error?.message || 'Erro ao enviar');
      }
    }).catch(err => {
      optimistic.failMessage(clientMessageId, err.message || 'Erro ao enviar');
    });

    // 3. Retornar sucesso imediato (optimistic)
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

    // Reenviar a mensagem
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
