import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConversationService, Conversation as DomainConversation } from '@/modules/conversation';
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext';
import { WebSocketConversation } from '../../infrastructure/websocket/types';
import { Tables } from '@/integrations/supabase/types';
import { ConversationEnricher } from '../../infrastructure/repositories/ConversationEnricher';

type ConversationRow = Tables<'conversations'>;

const enricher = new ConversationEnricher();

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
  _domainConversation?: DomainConversation;
}

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
    contact: null,
    lastMessagePreview: '',
    stage: null,
    _domainConversation: domain,
  };
}

function sortByLastMessage(conversations: LegacyConversationWithContact[]): LegacyConversationWithContact[] {
  return [...conversations].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
}

export function useConversations(whatsappNumberId: string | null) {
  const { workspaceId } = useWorkspace();
  const conversationService = useConversationService();
  const { client: wsClient, isEnabled: isWebSocketEnabled } = useWebSocketContext();
  const [conversations, setConversations] = useState<LegacyConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastFetchedNumberIdRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!workspaceId || !whatsappNumberId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await conversationService.listConversations(whatsappNumberId);

      if (!result.ok) {
        throw new Error(result.error.message);
      }

      const domainConversations = result.value;

      if (domainConversations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const legacyConversations = domainConversations.map(mapDomainToLegacy);

      const contactIds = [...new Set(domainConversations.map(c => c.contactId))];
      const stageIds = [...new Set(domainConversations.filter(c => c.stageId).map(c => c.stageId!))];
      const convIds = domainConversations.map(c => c.id);

      // Use enricher instead of direct Supabase calls
      const [contactsResult, stagesResult, messagesResult] = await Promise.all([
        enricher.fetchContactsBatch(contactIds),
        enricher.fetchStages(stageIds),
        enricher.fetchLastMessages(convIds),
      ]);

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

  // WebSocket listener for conversation updates
  useEffect(() => {
    if (!isWebSocketEnabled || !wsClient || !workspaceId) return;

    const handleConversation = (wsConversation: WebSocketConversation) => {
      if (wsConversation.workspaceId !== workspaceId) return;
      if (whatsappNumberId && wsConversation.whatsappNumberId !== whatsappNumberId) return;

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === wsConversation.id);

        if (index >= 0) {
          const existing = prev[index];
          const updated: LegacyConversationWithContact = {
            ...existing,
            last_message_at: wsConversation.lastMessage?.createdAt || existing.last_message_at,
            updated_at: wsConversation.updatedAt,
            lastMessagePreview: wsConversation.lastMessage?.content?.substring(0, 50) || existing.lastMessagePreview || '',
          };
          const newList = [...prev];
          newList[index] = updated;
          return sortByLastMessage(newList);
        } else {
          const newConv: LegacyConversationWithContact = {
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
            lastMessagePreview: wsConversation.lastMessage?.content?.substring(0, 50) || '',
            stage: null,
          };
          return sortByLastMessage([newConv, ...prev]);
        }
      });
    };

    wsClient.on('conversation', handleConversation);
    return () => { wsClient.off('conversation', handleConversation); };
  }, [wsClient, isWebSocketEnabled, workspaceId, whatsappNumberId]);

  // Supabase Realtime subscription (fallback)
  useEffect(() => {
    if (isWebSocketEnabled || !workspaceId || !whatsappNumberId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`conversations-${workspaceId}-${whatsappNumberId}`)
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
            return sortByLastMessage(updated_list);
          });
        }
      )
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
          const contactData = await enricher.fetchContactForConversation(newRow.contact_id);
          if (!contactData) return;

          setConversations((prev) => {
            if (prev.some((c) => c.id === newRow.id)) return prev;
            const newItem: LegacyConversationWithContact = {
              ...newRow,
              contact: contactData,
              lastMessagePreview: '',
              stage: null,
            };
            return [newItem, ...prev];
          });
        }
      )
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
  }, [workspaceId, whatsappNumberId, isWebSocketEnabled]);

  // Initial fetch
  useEffect(() => {
    if (!whatsappNumberId || !workspaceId) {
      lastFetchedNumberIdRef.current = null;
      setConversations([]);
      setLoading(false);
      return;
    }

    if (lastFetchedNumberIdRef.current !== whatsappNumberId) {
      lastFetchedNumberIdRef.current = whatsappNumberId;
      fetchConversations();
    }
  }, [whatsappNumberId, workspaceId, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}
