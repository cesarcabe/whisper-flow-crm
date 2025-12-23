import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Tables } from '@/integrations/supabase/types';

export type Conversation = Tables<'conversations'>;
export type Contact = Tables<'contacts'>;

export interface ConversationWithContact extends Conversation {
  contact?: Contact | null;
  lastMessagePreview?: string;
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

      // Fetch contacts in batch
      const contactIds = [...new Set(convData.map(c => c.contact_id))];
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, phone, avatar_url')
        .in('id', contactIds);

      const contactsMap = new Map(contactsData?.map(c => [c.id, c]) || []);

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

      const conversationsWithData: ConversationWithContact[] = convData.map(conv => ({
        ...conv,
        contact: contactsMap.get(conv.contact_id) as Contact | null,
        lastMessagePreview: lastMessageMap.get(conv.id) || '',
      }));

      setConversations(conversationsWithData);
    } catch (err: any) {
      console.error('[useConversations]', 'fetch_error', err);
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, whatsappNumberId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!workspaceId || !whatsappNumberId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('[RealtimeWhatsApp]', 'subscribed', { workspaceId, whatsappNumberId });

    channelRef.current = supabase
      .channel(`conversations-${workspaceId}-${whatsappNumberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[RealtimeWhatsApp]', 'event', payload);
          // Refetch on any conversation change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        console.log('[RealtimeWhatsApp]', 'unsubscribed', { workspaceId, whatsappNumberId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, whatsappNumberId, fetchConversations]);

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
