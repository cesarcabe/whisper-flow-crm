import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversationService, Conversation as DomainConversation } from '@/modules/conversation';
import { Tables } from '@/integrations/supabase/types';

type ConversationRow = Tables<'conversations'>;

/**
 * Interface for conversation with related data for UI display
 * Uses snake_case to maintain compatibility with existing components
 * 
 * Note: This is different from ConversationWithContact in application layer
 * which uses domain entities. This is the legacy format for backwards compatibility.
 */
export interface LegacyConversationWithContact {
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
  // Domain entity for advanced usage
  _domainConversation?: DomainConversation;
}

/**
 * Maps domain Conversation to legacy LegacyConversationWithContact format
 * This provides backwards compatibility with existing components
 */
function mapDomainToLegacy(domain: DomainConversation): LegacyConversationWithContact {
  return {
    id: domain.id,
    contact_id: domain.contactId,
    whatsapp_number_id: domain.whatsappNumberId,
    workspace_id: domain.workspaceId,
    pipeline_id: domain.pipelineId,
    stage_id: domain.stageId,
    last_message_at: domain.lastMessageAt?.toISOString() ?? null,
    unread_count: domain.unreadCount,
    is_typing: domain.isTyping,
    is_group: domain.isGroup,
    remote_jid: domain.remoteJid,
    created_at: domain.createdAt.toISOString(),
    updated_at: domain.updatedAt.toISOString(),
    contact: null, // Will be enriched separately
    lastMessagePreview: '',
    stage: null,
    _domainConversation: domain,
  };
}

/**
 * useConversations hook - Refactored to use ConversationService
 * 
 * Uses ConversationService for data fetching while maintaining:
 * - Supabase realtime for live updates (hybrid approach)
 * - Backwards compatible interface for existing components
 */
export function useConversations(whatsappNumberId: string | null) {
  const { workspaceId } = useWorkspace();
  const conversationService = useConversationService();
  const [conversations, setConversations] = useState<LegacyConversationWithContact[]>([]);
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
      // Fetch conversations using ConversationService
      const result = await conversationService.listConversations(whatsappNumberId);
      
      if (!result.success) {
        throw (result as { success: false; error: Error }).error;
      }

      const domainConversations = result.data;

      if (domainConversations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Map to legacy format
      const legacyConversations = domainConversations.map(mapDomainToLegacy);

      // Enrich with contacts, stages, and last messages
      // This is still done via Supabase for now as ChatEngine may not have this data
      const contactIds = [...new Set(domainConversations.map(c => c.contactId))];
      const stageIds = [...new Set(domainConversations.filter(c => c.stageId).map(c => c.stageId!))];
      const convIds = domainConversations.map(c => c.id);

      // Fetch related data in parallel
      const [contactsResult, stagesResult, messagesResult] = await Promise.all([
        fetchContactsBatch(contactIds),
        stageIds.length > 0 ? fetchStages(stageIds) : Promise.resolve(new Map()),
        fetchLastMessages(convIds),
      ]);

      // Enrich conversations
      const enrichedConversations: LegacyConversationWithContact[] = legacyConversations.map(conv => ({
        ...conv,
        contact: contactsResult.get(conv.contact_id) ?? null,
        stage: conv.stage_id ? stagesResult.get(conv.stage_id) ?? null : null,
        lastMessagePreview: messagesResult.get(conv.id) ?? '',
      }));

      setConversations(enrichedConversations);
    } catch (err: any) {
      console.error('[useConversations]', 'fetch_error', err);
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, whatsappNumberId, conversationService]);

  // Setup realtime subscription - Supabase realtime for now (hybrid approach)
  useEffect(() => {
    if (!workspaceId || !whatsappNumberId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`conversations-${workspaceId}-${whatsappNumberId}`)
      // Listen for conversation updates
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
          
          setConversations((prev) => {
            const updated_list = prev.map((c) =>
              c.id === updatedRow.id
                ? { 
                    ...c, 
                    ...updatedRow,
                    contact: c.contact, 
                    lastMessagePreview: c.lastMessagePreview,
                    stage: c.stage,
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
        async (payload) => {
          const newRow = payload.new as ConversationRow;
          
          // Fetch contact for new conversation
          const { data: contactRow } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', newRow.contact_id)
            .single();
          
          setConversations((prev) => {
            if (prev.some((c) => c.id === newRow.id)) return prev;
            const newItem: LegacyConversationWithContact = {
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
            };
            return [newItem, ...prev];
          });
        }
      )
      // Listen for new messages to update preview
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
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev;
            const updated: LegacyConversationWithContact = {
              ...prev[idx],
              lastMessagePreview: msg.body?.substring(0, 50) || '',
              last_message_at: msg.created_at,
            };
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

// ==================== Helper Functions ====================

const BATCH_SIZE = 100;

type ContactData = {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  contact_class_id: string | null;
  contact_class?: { id: string; name: string; color: string | null } | null;
};

async function fetchContactsBatch(contactIds: string[]): Promise<Map<string, ContactData>> {
  const contactsMap = new Map<string, ContactData>();
  
  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('contacts')
      .select('*, contact_class:contact_classes(id, name, color)')
      .in('id', batch);
    
    if (error) {
      console.error('[useConversations] Error fetching contacts batch:', error);
      continue;
    }
    
    data?.forEach(c => {
      const contactClass = Array.isArray(c.contact_class) 
        ? c.contact_class[0] 
        : c.contact_class;
      
      contactsMap.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        avatar_url: c.avatar_url,
        contact_class_id: c.contact_class_id,
        contact_class: contactClass,
      });
    });
  }
  
  return contactsMap;
}

async function fetchStages(stageIds: string[]): Promise<Map<string, { id: string; name: string; color: string | null }>> {
  const { data } = await supabase
    .from('stages')
    .select('id, name, color')
    .in('id', stageIds);
  
  return new Map(data?.map(s => [s.id, s]) || []);
}

async function fetchLastMessages(convIds: string[]): Promise<Map<string, string>> {
  const lastMessageMap = new Map<string, string>();
  
  for (let i = 0; i < convIds.length; i += BATCH_SIZE) {
    const batch = convIds.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, body')
      .in('conversation_id', batch)
      .order('created_at', { ascending: false });
    
    data?.forEach(m => {
      if (!lastMessageMap.has(m.conversation_id)) {
        lastMessageMap.set(m.conversation_id, m.body?.substring(0, 50) || '');
      }
    });
  }
  
  return lastMessageMap;
}
