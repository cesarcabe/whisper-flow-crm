import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseConversationRepository } from '@/infra/supabase/repositories/SupabaseConversationRepository';

interface ConversationForForward {
  id: string;
  contact: {
    name: string;
    phone: string;
    avatarUrl: string | null;
  } | null;
}

interface UseForwardMessageOptions {
  workspaceId: string | null;
  currentConversationId: string;
  isOpen: boolean;
}

interface UseForwardMessageReturn {
  conversations: ConversationForForward[];
  loading: boolean;
  forwarding: string | null;
  forwardMessage: (targetConversationId: string, messageBody: string, messageType: string) => Promise<boolean>;
  filterConversations: (search: string) => ConversationForForward[];
}

/**
 * Hook para encaminhar mensagens para outras conversas.
 * Encapsula busca de conversas e envio via edge function.
 */
export function useForwardMessage({
  workspaceId,
  currentConversationId,
  isOpen,
}: UseForwardMessageOptions): UseForwardMessageReturn {
  const [conversations, setConversations] = useState<ConversationForForward[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState<string | null>(null);

  // Fetch conversations when dialog opens
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        // Using direct query for now since we need contact data joined
        const { data, error } = await supabase
          .from('conversations')
          .select('id, contact:contacts(name, phone, avatar_url)')
          .eq('workspace_id', workspaceId)
          .neq('id', currentConversationId)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Map to our interface
        const mapped: ConversationForForward[] = (data || []).map((item: any) => ({
          id: item.id,
          contact: item.contact ? {
            name: item.contact.name,
            phone: item.contact.phone,
            avatarUrl: item.contact.avatar_url,
          } : null,
        }));

        setConversations(mapped);
      } catch (err) {
        console.error('[useForwardMessage] fetch error:', err);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isOpen, workspaceId, currentConversationId]);

  const filterConversations = useCallback((search: string): ConversationForForward[] => {
    if (!search.trim()) return conversations;
    const lowerSearch = search.toLowerCase();
    return conversations.filter(conv => 
      conv.contact?.name?.toLowerCase().includes(lowerSearch)
    );
  }, [conversations]);

  const forwardMessage = useCallback(async (
    targetConversationId: string,
    messageBody: string,
    messageType: string
  ): Promise<boolean> => {
    if (forwarding) return false;

    // Only forward text messages for now
    if (messageType !== 'text') {
      toast.error('Apenas mensagens de texto podem ser encaminhadas');
      return false;
    }

    setForwarding(targetConversationId);

    try {
      const forwardedText = `⤵️ Mensagem encaminhada\n\n${messageBody}`;

      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: targetConversationId,
          message: forwardedText,
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.message || 'Erro ao encaminhar');
      }

      toast.success('Mensagem encaminhada');
      return true;
    } catch (err: any) {
      console.error('[useForwardMessage] error:', err);
      toast.error('Erro ao encaminhar mensagem');
      return false;
    } finally {
      setForwarding(null);
    }
  }, [forwarding]);

  return {
    conversations,
    loading,
    forwarding,
    forwardMessage,
    filterConversations,
  };
}
