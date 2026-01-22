import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface GroupConversation {
  id: string;
  contact_id: string;
  remote_jid: string | null;
  last_message_at: string | null;
  unread_count: number;
  whatsapp_number_id: string | null;
  contact: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
  };
}

export function useGroupConversations() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          contact_id,
          remote_jid,
          last_message_at,
          unread_count,
          whatsapp_number_id,
          contacts!inner (
            id,
            name,
            phone,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('is_group', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[GroupConversations] Error fetching groups:', error);
        return;
      }

      const formattedGroups: GroupConversation[] = (data || []).map((conv: any) => ({
        id: conv.id,
        contact_id: conv.contact_id,
        remote_jid: conv.remote_jid,
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count || 0,
        whatsapp_number_id: conv.whatsapp_number_id,
        contact: {
          id: conv.contacts.id,
          name: conv.contacts.name,
          phone: conv.contacts.phone,
          avatar_url: conv.contacts.avatar_url,
        },
      }));

      setGroups(formattedGroups);
    } catch (err) {
      console.error('[GroupConversations] Exception fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  useEffect(() => {
    if (user && workspaceId) {
      fetchGroups();
    }
  }, [user, workspaceId, fetchGroups]);

  return {
    groups,
    loading,
    refetch: fetchGroups,
  };
}
