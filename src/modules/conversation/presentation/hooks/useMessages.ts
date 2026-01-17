import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversation } from '../contexts/ConversationContext';
import { Message as ModuleMessage } from '../../domain/entities/Message';
import { Message as CoreMessage } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';
import { Tables } from '@/integrations/supabase/types';

type MessageRow = Tables<'messages'>;

const PAGE_SIZE = 50;

/**
 * Maps module Message entity to core Message entity for compatibility
 */
function mapModuleToCoreMessage(m: ModuleMessage): CoreMessage {
  return MessageMapper.toDomain({
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
 * useMessages hook - Supabase-based with Realtime updates
 * 
 * Features:
 * - Uses Supabase for data fetching (offset-based pagination)
 * - Supabase realtime for live updates
 * - Backwards compatible interface for existing components
 */
export function useMessages(conversationId: string | null) {
  const { workspaceId } = useWorkspace();
  const { service: conversationService } = useConversation();
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Offset-based pagination
  const offsetRef = useRef<number>(0);

  /**
   * Fetch messages using offset-based pagination
   */
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!workspaceId || !conversationId) {
      setMessages([]);
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
      
      if (!result.success) {
        throw (result as { success: false; error: Error }).error;
      }

      const moduleMessages = result.data;
      const domainMessages = moduleMessages.map(mapModuleToCoreMessage);
      
      // Update offset for next page
      if (moduleMessages.length > 0) {
        offsetRef.current += moduleMessages.length;
      }
      
      setHasMore(domainMessages.length === PAGE_SIZE);

      if (loadMore) {
        setMessages(prev => [...prev, ...domainMessages]);
      } else {
        setMessages(domainMessages);
      }
    } catch (err: any) {
      console.error('[useMessages] fetch_error', err);
      setError(err.message || 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, conversationId, conversationService]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMessages(true);
    }
  }, [fetchMessages, loadingMore, hasMore]);

  // Setup realtime subscription for live updates
  useEffect(() => {
    if (!workspaceId || !conversationId) return;

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
            
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              // Prepend new message at the beginning
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
            setMessages((prev) => 
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
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
  }, [workspaceId, conversationId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages(false);
  }, [fetchMessages]);

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
