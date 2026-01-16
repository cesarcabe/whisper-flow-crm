import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversationService } from '../contexts/ConversationContext';
import { Message } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';
import { Tables } from '@/integrations/supabase/types';

type MessageRow = Tables<'messages'>;

const PAGE_SIZE = 50;

/**
 * useMessages hook - Refactored to use ConversationService
 * 
 * Uses ConversationService for data fetching while maintaining:
 * - Supabase realtime for live updates (hybrid approach)
 * - Backwards compatible interface for existing components
 */
export function useMessages(conversationId: string | null) {
  const { workspaceId } = useWorkspace();
  const conversationService = useConversationService();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async (offset = 0, append = false) => {
    if (!workspaceId || !conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      // Use ConversationService for fetching
      const result = await conversationService.getMessages(conversationId, PAGE_SIZE, offset);
      
      if (!result.success) {
        throw (result as { success: false; error: Error }).error;
      }

      // Map module entities to core entities for compatibility
      const domainMessages = result.data.map(m => MessageMapper.toDomain({
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
      }));
      setHasMore(domainMessages.length === PAGE_SIZE);

      if (append) {
        setMessages(prev => [...prev, ...domainMessages]);
      } else {
        setMessages(domainMessages);
      }
    } catch (err: any) {
      console.error('[useMessages]', 'fetch_error', err);
      setError(err.message || 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, conversationId, conversationService]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMessages(messages.length, true);
    }
  }, [fetchMessages, loadingMore, hasMore, messages.length]);

  // Setup realtime subscription - Supabase realtime for now (hybrid approach)
  useEffect(() => {
    if (!workspaceId || !conversationId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[Realtime]', 'subscribed', { workspaceId, conversationId });

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
          console.log('[Realtime]', 'event', { table: 'messages', type: payload.eventType, id: newRow?.id });
          
          try {
            const newMessage = MessageMapper.toDomain(newRow);
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
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
          console.log('[Realtime]', 'event', { table: 'messages', type: payload.eventType, id: updatedRow?.id });
          
          try {
            const updatedMessage = MessageMapper.toDomain(updatedRow);
            setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
          } catch (e) {
            console.warn('[useMessages] Failed to map realtime update:', e);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime]', 'status', { channel: 'messages', status, conversationId });
      });

    return () => {
      if (channelRef.current) {
        console.log('[Realtime]', 'unsubscribed', { workspaceId, conversationId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchMessages(0, false),
  };
}
