import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversation } from '../contexts/ConversationContext';
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext';
import { WebSocketMessage, WebSocketMessageStatus } from '../../infrastructure/websocket/types';
import { Message as CoreMessage } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';
import { MessageTypeValue } from '@/core/domain/value-objects/MessageType';
import { Tables } from '@/integrations/supabase/types';
import { useOptimisticMessages } from './useOptimisticMessages';

type MessageRow = Tables<'messages'>;

const PAGE_SIZE = 50;

/**
 * Maps module Message entity to core Message entity for compatibility
 */
function mapModuleToCoreMessage(m: CoreMessage): CoreMessage {
  return MessageMapper.fromPartial({
    id: m.id,
    conversation_id: m.conversationId,
    workspace_id: m.workspaceId,
    body: m.body,
    type: m.type.getValue(),
    is_outgoing: m.isOutgoing,
    status: m.status,
    external_id: m.externalId,
    media_url: m.mediaUrl,
    reply_to_id: m.replyToId,
    quoted_message: m.quotedMessage as unknown as null,
    sent_by_user_id: m.sentByUserId,
    whatsapp_number_id: m.whatsappNumberId,
    error_message: m.errorMessage,
    created_at: m.createdAt.toISOString(),
  });
}

/**
 * Maps WebSocket message to core Message entity
 */
function mapWebSocketToCoreMessage(wsMessage: WebSocketMessage, workspaceId: string): CoreMessage {
  // Determine if message is outgoing
  // In ChatEngine, if senderId is not a phone number (JID), it's likely outgoing
  // Common patterns: 'me', 'system', user IDs (UUIDs)
  // Phone numbers typically look like: '5511999999999@s.whatsapp.net' or just '5511999999999'
  const isPhoneNumber = /^\+?[1-9]\d{10,14}(@s\.whatsapp\.net)?$/.test(wsMessage.senderId);
  const isOutgoing = !isPhoneNumber || wsMessage.senderId === 'me' || wsMessage.senderId === 'system';
  
  // Map status from WebSocket to CoreMessage status
  let status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' = 'sent';
  if (wsMessage.status === 'pending') status = 'sending';
  else if (wsMessage.status === 'sent') status = 'sent';
  else if (wsMessage.status === 'delivered') status = 'delivered';
  else if (wsMessage.status === 'read') status = 'read';
  else if (wsMessage.status === 'failed') status = 'failed';

  // Map type - WebSocket uses 'file', CoreMessage uses 'document'
  const messageType: MessageTypeValue = wsMessage.type === 'file' ? 'document' : wsMessage.type;

  // Get media URL from attachments if available
  const mediaUrl = wsMessage.attachments?.[0]?.url || null;

  return MessageMapper.fromPartial({
    id: wsMessage.id,
    conversation_id: wsMessage.conversationId,
    workspace_id: workspaceId,
    body: wsMessage.content,
    type: messageType,
    is_outgoing: isOutgoing,
    status: status,
    external_id: wsMessage.metadata?.providerMessageId || null,
    media_url: mediaUrl,
    reply_to_id: wsMessage.replyToMessageId || null,
    quoted_message: null, // WebSocket doesn't send quoted message details
    sent_by_user_id: isOutgoing ? (wsMessage.senderId !== 'me' && wsMessage.senderId !== 'system' ? wsMessage.senderId : null) : null,
    whatsapp_number_id: null, // Will be set from conversation context if needed
    error_message: null,
    created_at: wsMessage.createdAt,
  });
}

/**
 * useMessages hook - Supabase-based with Realtime updates
 * 
 * Features:
 * - Uses Supabase for data fetching (offset-based pagination)
 * - Supabase realtime for live updates
 * - Backwards compatible interface for existing components
 * - Optimistic updates for instant UI feedback
 */
export function useMessages(conversationId: string | null) {
  const { workspaceId } = useWorkspace();
  const { service: conversationService } = useConversation();
  const { client: wsClient, isEnabled: isWebSocketEnabled } = useWebSocketContext();
  const [serverMessages, setServerMessages] = useState<CoreMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Offset-based pagination
  const offsetRef = useRef<number>(0);
  
  // Track which conversationId was last fetched to detect changes
  const lastFetchedConversationIdRef = useRef<string | null>(null);
  
  // Optimistic messages hook - extrair funções estáveis
  const {
    clearConfirmed,
    reconcileWithServer,
    isProcessed,
    confirmMessage,
    failMessage,
    getOptimisticAsMessages,
  } = useOptimisticMessages();

  /**
   * Fetch messages using offset-based pagination
   */
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!workspaceId || !conversationId) {
      setServerMessages([]);
      setLoading(false);
      return;
    }

    if (!loadMore) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const offset = loadMore ? offsetRef.current : 0;

      const result = await conversationService.getMessages(
        conversationId, 
        PAGE_SIZE, 
        offset
      );
      
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      const moduleMessages = result.value;
      const domainMessages = moduleMessages.map(mapModuleToCoreMessage);
      
      // Update offset for next page
      if (moduleMessages.length > 0) {
        offsetRef.current += moduleMessages.length;
      }
      
      setHasMore(domainMessages.length === PAGE_SIZE);

      if (loadMore) {
        setServerMessages(prev => [...prev, ...domainMessages]);
      } else {
        setServerMessages(domainMessages);
      }
      
      // Limpar mensagens otimistas confirmadas após carregar do servidor
      clearConfirmed(conversationId);
    } catch (err: unknown) {
      console.error('[useMessages] fetch_error', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, conversationId, conversationService, clearConfirmed]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMessages(true);
    }
  }, [fetchMessages, loadingMore, hasMore]);

  // WebSocket listeners for real-time updates (primary)
  useEffect(() => {
    if (!isWebSocketEnabled || !wsClient || !conversationId || !workspaceId) {
      return;
    }

    const handleMessage = (wsMessage: WebSocketMessage) => {
      // Only process messages for current conversation
      if (wsMessage.conversationId !== conversationId) {
        return;
      }

      try {
        const domainMessage = mapWebSocketToCoreMessage(wsMessage, workspaceId);
        
        // Tentar reconciliar com mensagem otimista
        // O clientMessageId vem na metadata quando o envio é via webhook
        const clientMessageId = wsMessage.metadata?.clientMessageId;
        reconcileWithServer(
          conversationId,
          domainMessage.id,
          clientMessageId ?? undefined
        );
        
        setServerMessages((prev) => {
          // Avoid duplicates by id or external_id
          const existingIndex = prev.findIndex((m) =>
            m.id === domainMessage.id ||
            (m.externalId && domainMessage.externalId && m.externalId === domainMessage.externalId) ||
            (domainMessage.externalId && m.id === domainMessage.externalId)
          );
          if (existingIndex >= 0) {
            return prev;
          }

          // Verificar se já foi processado via optimistic
          if (isProcessed(domainMessage.id)) {
            // Já reconciliado, apenas adicionar à lista real
          }

          return [domainMessage, ...prev];
        });
      } catch (e) {
        console.warn('[useMessages] Failed to map WebSocket message:', e);
      }
    };

    const handleStatus = (data: WebSocketMessageStatus) => {
      // Primeiro, tentar atualizar na lista de mensagens otimistas
      if (data.status === 'sent' || data.status === 'delivered' || data.status === 'read') {
        confirmMessage(data.messageId);
      } else if (data.status === 'failed') {
        failMessage(data.messageId, 'Falha no envio');
      }
      
      // Também atualizar na lista de mensagens do servidor
      setServerMessages((prev) =>
        prev.map((msg) => {
          const matches = msg.id === data.messageId || msg.externalId === data.messageId;
          if (matches) {
            // Map WebSocket status to CoreMessage status
            let newStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' = 'sent';
            if (data.status === 'pending') newStatus = 'sending';
            else if (data.status === 'sent') newStatus = 'sent';
            else if (data.status === 'delivered') newStatus = 'delivered';
            else if (data.status === 'read') newStatus = 'read';
            else if (data.status === 'failed') newStatus = 'failed';
            
            // Update status by creating new message with updated status
            return MessageMapper.fromPartial({
              id: msg.id,
              conversation_id: msg.conversationId,
              workspace_id: msg.workspaceId,
              whatsapp_number_id: msg.whatsappNumberId,
              sent_by_user_id: msg.sentByUserId,
              body: msg.body,
              type: msg.type.getValue(),
              status: newStatus,
              is_outgoing: msg.isOutgoing,
              media_url: msg.mediaUrl,
              external_id: msg.externalId,
              error_message: msg.errorMessage,
              reply_to_id: msg.replyToId,
              quoted_message: msg.quotedMessage as unknown as null,
              created_at: msg.createdAt.toISOString(),
            });
          }
          return msg;
        })
      );
    };

    wsClient.on('message', handleMessage);
    wsClient.on('messageStatus', handleStatus);

    return () => {
      wsClient.off('message', handleMessage);
      wsClient.off('messageStatus', handleStatus);
    };
  }, [wsClient, isWebSocketEnabled, conversationId, workspaceId, reconcileWithServer, isProcessed, confirmMessage, failMessage]);

  // Supabase Realtime subscription (used for persistence updates)
  useEffect(() => {
    if (!workspaceId || !conversationId) {
      return;
    }

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newRow = payload.new as MessageRow;
          
          try {
            const newMessage = MessageMapper.toDomain(newRow);
            
            // Tentar reconciliar com mensagem otimista (clientMessageId em external_id)
            reconcileWithServer(conversationId, newMessage.id, newMessage.externalId ?? undefined);
            
            setServerMessages((prev) => {
              // Avoid duplicates by id or external_id
              const existingIndex = prev.findIndex((m) => 
                m.id === newMessage.id ||
                (m.externalId && newMessage.externalId && m.externalId === newMessage.externalId) ||
                (newMessage.externalId && m.id === newMessage.externalId)
              );

              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = newMessage;
                return next;
              }

              return [newMessage, ...prev];
            });
          } catch (e) {
            console.warn('[useMessages] Failed to map realtime message:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedRow = payload.new as MessageRow;
          
          try {
            const updatedMessage = MessageMapper.toDomain(updatedRow);
            setServerMessages((prev) => 
              prev.map((m) => {
                const matches =
                  m.id === updatedMessage.id ||
                  (m.externalId && updatedMessage.externalId && m.externalId === updatedMessage.externalId);
                return matches ? updatedMessage : m;
              })
            );
          } catch (e) {
            console.warn('[useMessages] Failed to map realtime update:', e);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, conversationId, reconcileWithServer]);

  // Initial fetch - refetch when conversationId changes
  useEffect(() => {
    if (!conversationId || !workspaceId) {
      lastFetchedConversationIdRef.current = null;
      offsetRef.current = 0;
      setHasMore(true);
      setServerMessages([]);
      setLoading(false);
      return;
    }
    
    // Fetch if conversationId changed (or first load)
    if (lastFetchedConversationIdRef.current !== conversationId) {
      lastFetchedConversationIdRef.current = conversationId;
      offsetRef.current = 0;
      setHasMore(true);
      fetchMessages(false);
    }
  }, [conversationId, workspaceId, fetchMessages]);

  // Combinar mensagens do servidor com mensagens otimistas
  // Mensagens otimistas aparecem no final (mais recentes)
  const messages = useMemo(() => {
    if (!conversationId || !workspaceId) return serverMessages;
    
    const optimisticMessages = getOptimisticAsMessages(conversationId, workspaceId);
    
    if (optimisticMessages.length === 0) {
      return serverMessages;
    }
    
    // Filtrar mensagens otimistas que já estão na lista do servidor
    const serverIds = new Set(serverMessages.map(m => m.id));
    const uniqueOptimistic = optimisticMessages.filter(m => !serverIds.has(m.id));
    
    // Mensagens otimistas vão no início (são as mais recentes)
    return [...uniqueOptimistic, ...serverMessages];
  }, [serverMessages, conversationId, workspaceId, getOptimisticAsMessages]);

  return {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchMessages(false),
  };
}
