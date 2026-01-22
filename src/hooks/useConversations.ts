import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Tables } from '@/integrations/supabase/types';
import { Conversation } from '@/core/domain/entities/Conversation';
import { Contact } from '@/core/domain/entities/Contact';
import { ConversationMapper } from '@/infra/supabase/mappers/ConversationMapper';
import { ContactMapper } from '@/infra/supabase/mappers/ContactMapper';

type ConversationRow = Tables<'conversations'>;
type ContactRow = Tables<'contacts'>;

// Re-export domain entities for consumers that need them
export { Conversation } from '@/core/domain/entities/Conversation';
export { Contact } from '@/core/domain/entities/Contact';

/**
 * Interface for conversation with related data
 * Uses snake_case to maintain compatibility with existing components
 */
export interface ConversationWithContact {
  id: string;
  contact_id: string;
  whatsapp_number_id: string | null;
  workspace_id: string;
  pipeline_id: string | null;
  stage_id: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  is_typing: boolean | null;
  is_group: boolean | null;
  remote_jid: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
    contact_class_id: string | null;
    contact_class?: {
      id: string;
      name: string;
      color: string | null;
    } | null;
  } | null;
  lastMessagePreview?: string;
  stage?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  // Domain entities for advanced usage
  _domainConversation?: Conversation;
  _domainContact?: Contact | null;
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

      // Fetch contacts in batches (avoid URL length limits with large IN clauses)
      const contactIds = [...new Set(convData.map(c => c.contact_id))];
      const BATCH_SIZE = 100;
      const contactsData: Array<ContactRow & { contact_class: { id: string; name: string; color: string | null } | null }> = [];
      
      for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
        const batch = contactIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('contacts')
          .select('*, contact_class:contact_classes(id, name, color)')
          .in('id', batch);
        
        if (error) {
          console.error('[useConversations] Error fetching contacts batch:', error);
        }
        if (data) {
          contactsData.push(...(data as Array<ContactRow & { contact_class: { id: string; name: string; color: string | null } | null }>));
        }
      }
      
      const contactsMap = new Map(contactsData.map(c => [c.id, c]));

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

      // Fetch last message preview for each conversation in batches
      const convIds = convData.map(c => c.id);
      const messagesData: Array<{ conversation_id: string; body: string | null }> = [];
      
      for (let i = 0; i < convIds.length; i += BATCH_SIZE) {
        const batch = convIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from('messages')
          .select('conversation_id, body')
          .in('conversation_id', batch)
          .order('created_at', { ascending: false });
        
        if (data) {
          messagesData.push(...data);
        }
      }

      const lastMessageMap = new Map<string, string>();
      messagesData.forEach(m => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m.body?.substring(0, 50) || '');
        }
      });

      // Convert to output format with domain entities attached
      const conversationsWithData: ConversationWithContact[] = convData.map(conv => {
        const contactRaw = contactsMap.get(conv.contact_id);
        
        // Handle contact_class which might be an array from the join
        let contactClass: { id: string; name: string; color: string | null } | null = null;
        if (contactRaw?.contact_class) {
          contactClass = Array.isArray(contactRaw.contact_class) 
            ? contactRaw.contact_class[0] 
            : contactRaw.contact_class;
        }

        // Create domain entities for advanced usage
        const domainConversation = ConversationMapper.toDomain(conv);
        let domainContact: Contact | null = null;
        if (contactRaw) {
          try {
            domainContact = ContactMapper.toDomain(contactRaw);
          } catch (e) {
            console.warn('[useConversations] Failed to map contact:', e);
          }
        }

        return {
          // Legacy format (snake_case)
          id: conv.id,
          contact_id: conv.contact_id,
          whatsapp_number_id: conv.whatsapp_number_id,
          workspace_id: conv.workspace_id,
          pipeline_id: conv.pipeline_id,
          stage_id: conv.stage_id,
          last_message_at: conv.last_message_at,
          unread_count: conv.unread_count,
          is_typing: conv.is_typing,
          is_group: conv.is_group,
          remote_jid: conv.remote_jid,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          contact: contactRaw ? {
            id: contactRaw.id,
            name: contactRaw.name,
            phone: contactRaw.phone,
            avatar_url: contactRaw.avatar_url,
            contact_class_id: contactRaw.contact_class_id,
            contact_class: contactClass,
          } : null,
          lastMessagePreview: lastMessageMap.get(conv.id) || '',
          stage: conv.stage_id ? stagesMap.get(conv.stage_id) || null : null,
          // Domain entities attached
          _domainConversation: domainConversation,
          _domainContact: domainContact,
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
          const updatedRow = payload.new as ConversationRow;
          
          // Update only the affected conversation in-place
          setConversations((prev) => {
            const updated_list = prev.map((c) =>
              c.id === updatedRow.id
                ? { 
                    ...c, 
                    ...updatedRow,
                    contact: c.contact, 
                    lastMessagePreview: c.lastMessagePreview,
                    stage: c.stage,
                    _domainConversation: ConversationMapper.toDomain(updatedRow),
                  }
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
          const newRow = payload.new as ConversationRow;
          
          // Fetch contact for new conversation, then add to list
          supabase
            .from('contacts')
            .select('*')
            .eq('id', newRow.contact_id)
            .single()
            .then(({ data: contactRow }) => {
              let domainContact: Contact | null = null;
              if (contactRow) {
                try {
                  domainContact = ContactMapper.toDomain(contactRow);
                } catch (e) {
                  console.warn('[useConversations] Failed to map contact:', e);
                }
              }
              
              setConversations((prev) => {
                if (prev.some((c) => c.id === newRow.id)) return prev;
                const newItem: ConversationWithContact = {
                  ...newRow,
                  contact: contactRow ? {
                    id: contactRow.id,
                    name: contactRow.name,
                    phone: contactRow.phone,
                    avatar_url: contactRow.avatar_url,
                    contact_class_id: contactRow.contact_class_id,
                    contact_class: null,
                  } : null,
                  lastMessagePreview: '',
                  stage: null,
                  _domainConversation: ConversationMapper.toDomain(newRow),
                  _domainContact: domainContact,
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
          // Update preview and move conversation to top
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev;
            const updated: ConversationWithContact = {
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
      .subscribe();

    return () => {
      if (channelRef.current) {
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
