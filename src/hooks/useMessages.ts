import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Tables } from '@/integrations/supabase/types';
import { Message } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';

// Re-export domain entity for convenience
export { Message } from '@/core/domain/entities/Message';

type MessageRow = Tables<'messages'>;

const PAGE_SIZE = 50;

export function useMessages(conversationId: string | null) {
  const { workspaceId } = useWorkspace();
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
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const rows = data || [];
      setHasMore(rows.length === PAGE_SIZE);

      // Convert to domain entities
      const domainMessages: Message[] = rows.map(row => {
        try {
          return MessageMapper.toDomain(row);
        } catch (e) {
          console.warn('[useMessages] Failed to map message:', row.id, e);
          // Return a minimal Message object in case of mapping failure
          return MessageMapper.toDomain({
            ...row,
            type: row.type || 'text',
            status: row.status || 'sent',
          });
        }
      });

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
  }, [workspaceId, conversationId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMessages(messages.length, true);
    }
  }, [fetchMessages, loadingMore, hasMore, messages.length]);

  // Setup realtime subscription
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
