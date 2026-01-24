/**
 * useOptimisticMessages - Hook para gerenciar mensagens otimistas (pendentes)
 * 
 * Permite enviar múltiplas mensagens em sequência sem esperar confirmação.
 * Cada mensagem tem um clientId único para reconciliação com a resposta do servidor.
 */

import { useCallback, useSyncExternalStore } from 'react';
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

// ============================================
// Store Global (Singleton)
// ============================================

type Listener = () => void;

class OptimisticMessagesStore {
  private messages = new Map<string, Map<string, OptimisticMessage>>();
  private processedIds = new Set<string>();
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  getSnapshot(): number {
    // Retorna um "version" que muda quando o store muda
    let count = 0;
    for (const [, store] of this.messages) {
      count += store.size;
    }
    return count;
  }

  private getConversationStore(conversationId: string): Map<string, OptimisticMessage> {
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, new Map());
    }
    return this.messages.get(conversationId)!;
  }

  getPendingMessages(conversationId: string): OptimisticMessage[] {
    const store = this.getConversationStore(conversationId);
    return Array.from(store.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  addOptimisticMessage(
    message: Omit<OptimisticMessage, 'status' | 'createdAt' | 'retryCount'>
  ): OptimisticMessage {
    const store = this.getConversationStore(message.conversationId);
    
    const optimisticMessage: OptimisticMessage = {
      ...message,
      status: 'sending',
      createdAt: new Date(),
      retryCount: 0,
    };
    
    store.set(message.clientId, optimisticMessage);
    this.processedIds.add(message.clientId);
    this.notify();
    
    return optimisticMessage;
  }

  confirmMessage(clientId: string, serverId?: string): void {
    for (const [, store] of this.messages) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        message.status = 'sent';
        if (serverId) {
          message.serverId = serverId;
          this.processedIds.add(serverId);
        }
        this.notify();
        return;
      }
    }
  }

  failMessage(clientId: string, error: string): void {
    for (const [, store] of this.messages) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        message.status = 'failed';
        message.error = error;
        this.notify();
        return;
      }
    }
  }

  removeOptimisticMessage(clientId: string): void {
    for (const [, store] of this.messages) {
      if (store.has(clientId)) {
        store.delete(clientId);
        this.notify();
        return;
      }
    }
  }

  reconcileWithServer(
    conversationId: string, 
    serverMessageId: string, 
    clientId?: string
  ): boolean {
    const store = this.getConversationStore(conversationId);
    
    // Se já processamos esse ID do servidor, ignorar
    if (this.processedIds.has(serverMessageId)) {
      return true;
    }
    
    // Se temos o clientId, usamos diretamente
    if (clientId && store.has(clientId)) {
      const message = store.get(clientId)!;
      message.serverId = serverMessageId;
      message.status = 'sent';
      this.processedIds.add(serverMessageId);
      // Remover da lista otimista pois agora está na lista real
      store.delete(clientId);
      this.notify();
      return true;
    }
    
    // Procurar por serverId
    for (const [key, message] of store) {
      if (message.serverId === serverMessageId) {
        store.delete(key);
        this.notify();
        return true;
      }
    }
    
    this.processedIds.add(serverMessageId);
    return false;
  }

  getOptimisticAsMessages(conversationId: string, workspaceId: string): Message[] {
    const store = this.getConversationStore(conversationId);
    const messages: Message[] = [];
    
    for (const opt of store.values()) {
      // Só mostrar mensagens que ainda estão pendentes ou falharam
      if (opt.status === 'sending' || opt.status === 'failed') {
        try {
          const message = MessageMapper.fromPartial({
            id: opt.clientId,
            conversation_id: opt.conversationId,
            workspace_id: workspaceId,
            body: opt.content,
            type: opt.type,
            is_outgoing: true,
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
          console.error('[OptimisticStore] Failed to create Message entity:', e);
        }
      }
    }
    
    return messages;
  }

  clearConfirmed(conversationId: string): void {
    const store = this.getConversationStore(conversationId);
    const toDelete: string[] = [];
    
    for (const [key, message] of store) {
      if (message.status === 'sent' || message.status === 'delivered' || message.status === 'read') {
        toDelete.push(key);
      }
    }
    
    if (toDelete.length > 0) {
      toDelete.forEach(key => store.delete(key));
      this.notify();
    }
  }

  retryMessage(clientId: string): OptimisticMessage | null {
    for (const [, store] of this.messages) {
      if (store.has(clientId)) {
        const message = store.get(clientId)!;
        if (message.status === 'failed') {
          message.status = 'sending';
          message.error = undefined;
          message.retryCount += 1;
          this.notify();
          return message;
        }
        return null;
      }
    }
    return null;
  }

  isProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }
}

// Singleton instance
const store = new OptimisticMessagesStore();

// ============================================
// Hook
// ============================================

interface UseOptimisticMessagesReturn {
  getPendingMessages: (conversationId: string) => OptimisticMessage[];
  addOptimisticMessage: (message: Omit<OptimisticMessage, 'status' | 'createdAt' | 'retryCount'>) => OptimisticMessage;
  confirmMessage: (clientId: string, serverId?: string) => void;
  failMessage: (clientId: string, error: string) => void;
  removeOptimisticMessage: (clientId: string) => void;
  reconcileWithServer: (conversationId: string, serverMessageId: string, clientId?: string) => boolean;
  getOptimisticAsMessages: (conversationId: string, workspaceId: string) => Message[];
  clearConfirmed: (conversationId: string) => void;
  retryMessage: (clientId: string) => OptimisticMessage | null;
  isProcessed: (id: string) => boolean;
}

export function useOptimisticMessages(): UseOptimisticMessagesReturn {
  // Subscribe to store changes - triggers re-render when store changes
  useSyncExternalStore(
    useCallback((onStoreChange) => store.subscribe(onStoreChange), []),
    useCallback(() => store.getSnapshot(), [])
  );

  // Return stable function references
  return {
    getPendingMessages: useCallback((conversationId: string) => 
      store.getPendingMessages(conversationId), []),
    
    addOptimisticMessage: useCallback((message: Omit<OptimisticMessage, 'status' | 'createdAt' | 'retryCount'>) => 
      store.addOptimisticMessage(message), []),
    
    confirmMessage: useCallback((clientId: string, serverId?: string) => 
      store.confirmMessage(clientId, serverId), []),
    
    failMessage: useCallback((clientId: string, error: string) => 
      store.failMessage(clientId, error), []),
    
    removeOptimisticMessage: useCallback((clientId: string) => 
      store.removeOptimisticMessage(clientId), []),
    
    reconcileWithServer: useCallback((conversationId: string, serverMessageId: string, clientId?: string) => 
      store.reconcileWithServer(conversationId, serverMessageId, clientId), []),
    
    getOptimisticAsMessages: useCallback((conversationId: string, workspaceId: string) => 
      store.getOptimisticAsMessages(conversationId, workspaceId), []),
    
    clearConfirmed: useCallback((conversationId: string) => 
      store.clearConfirmed(conversationId), []),
    
    retryMessage: useCallback((clientId: string) => 
      store.retryMessage(clientId), []),
    
    isProcessed: useCallback((id: string) => 
      store.isProcessed(id), []),
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
