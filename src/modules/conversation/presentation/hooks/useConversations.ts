import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversationService, Conversation as DomainConversation } from '@/modules/conversation';
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext';
import { WebSocketConversation } from '../../infrastructure/websocket/types';
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
  const { client: wsClient, isEnabled: isWebSocketEnabled, isConnected: isWebSocketConnected } = useWebSocketContext();
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

  const isWebSocketActive = isWebSocketEnabled && isWebSocketConnected && !!wsClient;

  // WebSocket listener for conversation updates (primary)
  useEffect(() => {
    if (!isWebSocketActive || !workspaceId) {
      return;
    }

    const handleConversation = (wsConversation: WebSocketConversation) => {
      // Only process conversations for current workspace
      if (wsConversation.workspaceId !== workspaceId) {
        return;
      }

      // Filter by whatsappNumberId if provided
      if (whatsappNumberId && wsConversation.whatsappNumberId !== whatsappNumberId) {
        return
      }

      // Map WebSocket conversation to legacy format
      // Note: WebSocket conversation doesn't have all fields, so we'll update existing or create minimal entry
      setConversations((prev) => {
        const lastMessagePreview = wsConversation.lastMessage?.content?.substring(0, 50) || '';
        const partial: LegacyConversationWithContact = {
          id: wsConversation.id,
          contact_id: wsConversation.contactId || wsConversation.id,
          whatsapp_number_id: wsConversation.whatsappNumberId || null,
          workspace_id: workspaceId,
          pipeline_id: null,
          stage_id: null,
          last_message_at: wsConversation.lastMessage?.createdAt || null,
          unread_count: 0,
          is_typing: false,
          is_group: false,
          remote_jid: wsConversation.id,
          created_at: wsConversation.updatedAt,
          updated_at: wsConversation.updatedAt,
          contact: null,
          lastMessagePreview: lastMessagePreview,
          stage: null,
        };

        return upsertConversation(prev, partial, { preferTop: true });
      })
    }

    wsClient.on('conversation', handleConversation)

    return () => {
      wsClient.off('conversation', handleConversation)
    }
  }, [wsClient, isWebSocketActive, workspaceId, whatsappNumberId])

  // Supabase Realtime subscription (fallback when WebSocket is not available)
  useEffect(() => {
    // Only use Supabase Realtime if WebSocket is not enabled
    if (isWebSocketActive || !workspaceId || !whatsappNumberId) return;

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
            const partial: LegacyConversationWithContact = {
              ...(updatedRow as LegacyConversationWithContact),
              contact: prev.find((c) => c.id === updatedRow.id)?.contact ?? null,
              lastMessagePreview: prev.find((c) => c.id === updatedRow.id)?.lastMessagePreview ?? '',
              stage: prev.find((c) => c.id === updatedRow.id)?.stage ?? null,
            };
            return upsertConversation(prev, partial, { preferTop: true });
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
            const existing = prev.find((c) => c.id === msg.conversation_id);
            if (!existing) return prev;
            const partial: LegacyConversationWithContact = {
              ...existing,
              lastMessagePreview: msg.body?.substring(0, 50) || '',
              last_message_at: msg.created_at,
            };
            return upsertConversation(prev, partial, { preferTop: true });
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

type UpsertOptions = {
  preferTop?: boolean;
};

function getTime(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isConversationEqual(
  a: LegacyConversationWithContact,
  b: LegacyConversationWithContact
): boolean {
  return (
    a.id === b.id &&
    a.last_message_at === b.last_message_at &&
    a.unread_count === b.unread_count &&
    a.is_typing === b.is_typing &&
    a.is_group === b.is_group &&
    a.whatsapp_number_id === b.whatsapp_number_id &&
    a.stage_id === b.stage_id &&
    a.pipeline_id === b.pipeline_id &&
    a.lastMessagePreview === b.lastMessagePreview &&
    a.updated_at === b.updated_at &&
    a.contact?.id === b.contact?.id &&
    a.contact?.name === b.contact?.name &&
    a.contact?.avatar_url === b.contact?.avatar_url &&
    a.contact?.contact_class_id === b.contact?.contact_class_id &&
    a.contact?.contact_class?.id === b.contact?.contact_class?.id &&
    a.stage?.id === b.stage?.id
  );
}

function upsertConversation(
  prev: LegacyConversationWithContact[],
  partial: LegacyConversationWithContact,
  options: UpsertOptions = {}
): LegacyConversationWithContact[] {
  const index = prev.findIndex((c) => c.id === partial.id);
  if (index === -1) {
    return [partial, ...prev];
  }

  const existing = prev[index];
  const merged: LegacyConversationWithContact = {
    ...existing,
    ...partial,
    contact: partial.contact ?? existing.contact,
    stage: partial.stage ?? existing.stage,
    lastMessagePreview: partial.lastMessagePreview ?? existing.lastMessagePreview,
  };

  if (isConversationEqual(existing, merged)) {
    return prev;
  }

  const shouldPreferTop = options.preferTop === true;
  const shouldMoveToTop =
    shouldPreferTop &&
    getTime(merged.last_message_at) >= getTime(prev[0]?.last_message_at);

  if (!shouldMoveToTop) {
    const next = [...prev];
    next[index] = merged;
    return next;
  }

  const next = prev.filter((c) => c.id !== merged.id);
  return [merged, ...next];
}

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
