/**
 * useOptimisticMessages - Hook para gerenciar mensagens otimistas (pendentes)
 * 
 * Permite enviar múltiplas mensagens em sequência sem esperar confirmação.
 * Cada mensagem tem um clientId único para reconciliação com a resposta do servidor.
 */

import { useState, useCallback, useRef } from 'react';
import { Message } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';

export type OptimisticMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface OptimisticMessage {
  /** Client-generated ID (usado para reconciliação) */
  clientId: string;
  /** ID real do servidor (quando confirmado) */
  serverId?: string;
  /** ID da conversa */
  conversationId: string;
  /** Conteúdo da mensagem */
  content: string;
  /** Tipo da mensagem */
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  /** Status atual */
  status: OptimisticMessageStatus;
  /** Timestamp de criação (local) */
  createdAt: Date;
  /** ID da mensagem sendo respondida */
  replyToId?: string | null;
  /** Erro (se falhou) */
  error?: string;
  /** Número de tentativas de envio */
  retryCount: number;
}

interface UseOptimisticMessagesReturn {
  /** Lista de mensagens pendentes para uma conversa */
  getPendingMessages: (conversationId: string) => OptimisticMessage[];
  /** Adiciona uma mensagem otimista */
  addOptimisticMessage: (message: Omit<OptimisticMessage, 'status' | 'createdAt' | 'retryCount'>) => OptimisticMessage;
  /** Marca mensagem como enviada com sucesso */
  confirmMessage: (clientId: string, serverId?: string) => void;
  /** Marca mensagem como falha */
  failMessage: (clientId: string, error: string) => void;
  /** Remove uma mensagem (quando já está na lista real) */
  removeOptimisticMessage: (clientId: string) => void;
  /** Reconcilia com mensagem do servidor (para evitar duplicação) */
  reconcileWithServer: (conversationId: string, serverMessageId: string, clientId?: string) => boolean;
  /** Retorna todas as mensagens pendentes como entities Message para exibição */
  getOptimisticAsMessages: (conversationId: string, workspaceId: string) => Message[];
  /** Limpa mensagens confirmadas de uma conversa */
  clearConfirmed: (conversationId: string) => void;
  /** Permite reenviar uma mensagem que falhou */
  retryMessage: (clientId: string) => OptimisticMessage | null;
  /** Verifica se um clientId ou serverId já foi processado */
  isProcessed: (id: string) => boolean;
}

// Store global para mensagens otimistas (por conversa)
const optimisticMessagesStore = new Map<string, Map<string, OptimisticMessage>>();
// Cache de IDs já processados para evitar duplicação
const processedIds = new Set<string>();

export function useOptimisticMessages(): UseOptimisticMessagesReturn {
  // Força re-render quando o store muda
  const [, forceUpdate] = useState({});
  const updateTrigger = useCallback(() => forceUpdate({}), []);

  const getConversationStore = useCallback((conversationId: string): Map<string, OptimisticMessage> => {
    if (!optimisticMessagesStore.has(conversationId)) {
      optimisticMessagesStore.set(conversationId, new Map());
    }
    return optimisticMessagesStore.get(conversationId)!;
  }, []);

  const getPendingMessages = useCallback((conversationId: string): OptimisticMessage[] => {
    const store = getConversationStore(conversationId);
    return Array.from(store.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [getConversationStore]);

  const addOptimisticMessage = useCallback((
    message: Omit<OptimisticMessage, 'status' | 'createdAt' | 'retryCount'>
  ): OptimisticMessage => {
    const store = getConversationStore(message.conversationId);
    
    const optimisticMessage: OptimisticMessage = {
      ...message,
      status: 'sending',
      createdAt: new Date(),
      retryCount: 0,
    };
    
    store.set(message.clientId, optimisticMessage);
    processedIds.add(message.clientId);
    updateTrigger();
    
    return optimisticMessage;
  }, [getConversationStore, updateTrigger]);

  const confirmMessage = useCallback((clientId: string, serverId?: string) => {
    // Encontrar a mensagem em qualquer conversa
    for (const [, store] of optimisticMessagesStore) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        message.status = 'sent';
        if (serverId) {
          message.serverId = serverId;
          processedIds.add(serverId);
        }
        updateTrigger();
        return;
      }
    }
  }, [updateTrigger]);

  const failMessage = useCallback((clientId: string, error: string) => {
    for (const [, store] of optimisticMessagesStore) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        message.status = 'failed';
        message.error = error;
        updateTrigger();
        return;
      }
    }
  }, [updateTrigger]);

  const removeOptimisticMessage = useCallback((clientId: string) => {
    for (const [, store] of optimisticMessagesStore) {
      if (store.has(clientId)) {
        store.delete(clientId);
        updateTrigger();
        return;
      }
    }
  }, [updateTrigger]);

  const reconcileWithServer = useCallback((
    conversationId: string, 
    serverMessageId: string, 
    clientId?: string
  ): boolean => {
    const store = getConversationStore(conversationId);
    
    // Se já processamos esse ID do servidor, ignorar
    if (processedIds.has(serverMessageId)) {
      return true;
    }
    
    // Se temos o clientId, usamos diretamente
    if (clientId && store.has(clientId)) {
      const message = store.get(clientId)!;
      message.serverId = serverMessageId;
      message.status = 'sent';
      processedIds.add(serverMessageId);
      // Remover da lista otimista pois agora está na lista real
      store.delete(clientId);
      updateTrigger();
      return true;
    }
    
    // Procurar por serverId
    for (const [key, message] of store) {
      if (message.serverId === serverMessageId) {
        store.delete(key);
        updateTrigger();
        return true;
      }
    }
    
    processedIds.add(serverMessageId);
    return false;
  }, [getConversationStore, updateTrigger]);

  const getOptimisticAsMessages = useCallback((conversationId: string, workspaceId: string): Message[] => {
    const store = getConversationStore(conversationId);
    const messages: Message[] = [];
    
    for (const opt of store.values()) {
      // Só mostrar mensagens que ainda estão pendentes ou falharam
      if (opt.status === 'sending' || opt.status === 'failed') {
        try {
          const message = MessageMapper.toDomain({
            id: opt.clientId, // Usar clientId como ID temporário
            conversation_id: opt.conversationId,
            workspace_id: workspaceId,
            body: opt.content,
            type: opt.type,
            is_outgoing: true, // Mensagens otimistas são sempre enviadas pelo usuário
            status: opt.status,
            external_id: null,
            media_url: null,
            reply_to_id: opt.replyToId ?? null,
            quoted_message: null,
            sent_by_user_id: null,
            whatsapp_number_id: null,
            error_message: opt.error ?? null,
            created_at: opt.createdAt.toISOString(),
          });
          messages.push(message);
        } catch (e) {
          console.error('[useOptimisticMessages] Failed to create Message entity:', e);
        }
      }
    }
    
    return messages;
  }, [getConversationStore]);

  const clearConfirmed = useCallback((conversationId: string) => {
    const store = getConversationStore(conversationId);
    const toDelete: string[] = [];
    
    for (const [key, message] of store) {
      if (message.status === 'sent' || message.status === 'delivered' || message.status === 'read') {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => store.delete(key));
    if (toDelete.length > 0) {
      updateTrigger();
    }
  }, [getConversationStore, updateTrigger]);

  const retryMessage = useCallback((clientId: string): OptimisticMessage | null => {
    for (const [, store] of optimisticMessagesStore) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        if (message.status === 'failed') {
          message.status = 'sending';
          message.error = undefined;
          message.retryCount += 1;
          updateTrigger();
          return message;
        }
        return null;
      }
    }
    return null;
  }, [updateTrigger]);

  const isProcessed = useCallback((id: string): boolean => {
    return processedIds.has(id);
  }, []);

  return {
    getPendingMessages,
    addOptimisticMessage,
    confirmMessage,
    failMessage,
    removeOptimisticMessage,
    reconcileWithServer,
    getOptimisticAsMessages,
    clearConfirmed,
    retryMessage,
    isProcessed,
  };
}

/**
 * Gera um ID único para mensagem do cliente
 */
export function createClientMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `opt_${crypto.randomUUID()}`;
  }
  return `opt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
