import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Tables } from '@/integrations/supabase/types';

export type Conversation = Tables<'conversations'>;
export type Contact = Tables<'contacts'> & {
  contact_class?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
};

export interface ConversationWithContact extends Conversation {
  contact?: Contact | null;
  lastMessagePreview?: string;
  stage?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export function useConversations(whatsappNumberId: string | null) {
  const { workspaceId } = useWorkspace();
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!workspaceId || !whatsappNumberId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('whatsapp_number_id', whatsappNumberId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) throw convError;

      if (!convData || convData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Fetch contacts in batch with contact_class
      const contactIds = [...new Set(convData.map(c => c.contact_id))];
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*, contact_class:contact_classes(id, name, color)')
        .in('id', contactIds);

      const contactsMap = new Map(contactsData?.map(c => [c.id, c]) || []);

      // Fetch stages for conversations that have stage_id
      const stageIds = [...new Set(convData.filter(c => c.stage_id).map(c => c.stage_id!))];
      let stagesMap = new Map<string, { id: string; name: string; color: string | null }>();
      if (stageIds.length > 0) {
        const { data: stagesData } = await supabase
          .from('stages')
          .select('id, name, color')
          .in('id', stageIds);
        stagesMap = new Map(stagesData?.map(s => [s.id, s]) || []);
      }

      // Fetch last message preview for each conversation (efficient batch)
      const convIds = convData.map(c => c.id);
      const { data: messagesData } = await supabase
        .from('messages')
        .select('conversation_id, body')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const lastMessageMap = new Map<string, string>();
      messagesData?.forEach(m => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m.body?.substring(0, 50) || '');
        }
      });

      const conversationsWithData: ConversationWithContact[] = convData.map(conv => {
        const contactRaw = contactsMap.get(conv.contact_id);
        const contact = contactRaw ? {
          ...contactRaw,
          contact_class: Array.isArray(contactRaw.contact_class) 
            ? contactRaw.contact_class[0] 
            : contactRaw.contact_class,
        } as Contact : null;
        return {
          ...conv,
          contact,
          lastMessagePreview: lastMessageMap.get(conv.id) || '',
          stage: conv.stage_id ? stagesMap.get(conv.stage_id) || null : null,
        };
      });

      setConversations(conversationsWithData);
    } catch (err: any) {
      console.error('[useConversations]', 'fetch_error', err);
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, whatsappNumberId]);

  // Setup realtime subscription - UPDATE conversations in-place, no full refetch
  useEffect(() => {
    if (!workspaceId || !whatsappNumberId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[Realtime]', 'subscribed', { workspaceId, whatsappNumberId });

    channelRef.current = supabase
      .channel(`conversations-${workspaceId}-${whatsappNumberId}`)
      // Listen for conversation updates (last_message_at, unread_count, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `whatsapp_number_id=eq.${whatsappNumberId}`,
        },
        (payload) => {
          const updated = payload.new as Conversation;
          console.log('[Realtime]', 'event', { table: 'conversations', type: 'UPDATE', id: updated?.id });
          // Update only the affected conversation in-place
          setConversations((prev) => {
            const updated_list = prev.map((c) =>
              c.id === updated.id
                ? { ...c, ...updated, contact: c.contact, lastMessagePreview: c.lastMessagePreview }
                : c
            );
            // Re-sort by last_message_at descending
            return updated_list.sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bTime - aTime;
            });
          });
        }
      )
      // Listen for new conversations
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `whatsapp_number_id=eq.${whatsappNumberId}`,
        },
        (payload) => {
          const newConv = payload.new as Conversation;
          console.log('[Realtime]', 'event', { table: 'conversations', type: 'INSERT', id: newConv?.id });
          // Fetch contact for new conversation, then add to list
          supabase
            .from('contacts')
            .select('*')
            .eq('id', newConv.contact_id)
            .single()
            .then(({ data: contact }) => {
              setConversations((prev) => {
                if (prev.some((c) => c.id === newConv.id)) return prev;
                const newItem: ConversationWithContact = {
                  ...newConv,
                  contact: contact as Contact | null,
                  lastMessagePreview: '',
                };
                return [newItem, ...prev];
              });
            });
        }
      )
      // Listen for new messages to update preview and reorder
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `whatsapp_number_id=eq.${whatsappNumberId}`,
        },
        (payload) => {
          const msg = payload.new as { conversation_id: string; body: string; created_at: string };
          console.log('[Realtime]', 'event', { table: 'messages', type: 'INSERT', conversationId: msg?.conversation_id });
          // Update preview and move conversation to top
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev;
            const updated = {
              ...prev[idx],
              lastMessagePreview: msg.body?.substring(0, 50) || '',
              last_message_at: msg.created_at,
            };
            // Remove from current position, add to top
            const newList = prev.filter((c) => c.id !== msg.conversation_id);
            return [updated, ...newList];
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime]', 'status', { channel: 'conversations', status, whatsappNumberId });
      });

    return () => {
      if (channelRef.current) {
        console.log('[Realtime]', 'unsubscribed', { workspaceId, whatsappNumberId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, whatsappNumberId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}
