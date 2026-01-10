import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { GroupConversation } from '@/hooks/useGroupConversations';
import { Tables } from '@/integrations/supabase/types';

type GroupClass = Tables<'group_classes'>;

export interface GroupWithClass extends GroupConversation {
  group_class_id: string | null;
}

export function useGroupClasses() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [groupClasses, setGroupClasses] = useState<GroupClass[]>([]);
  const [groupsByClass, setGroupsByClass] = useState<Record<string, GroupWithClass[]>>({});
  const [unclassifiedGroups, setUnclassifiedGroups] = useState<GroupWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      setLoading(true);

      // Fetch group classes (separate table for groups)
      const { data: classesData, error: classesError } = await supabase
        .from('group_classes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (classesError) {
        console.error('[GroupClasses] Error fetching classes:', classesError);
        return;
      }

      // Fetch group conversations with contact info
      const { data: groupsData, error: groupsError } = await supabase
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
            avatar_url,
            group_class_id
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('is_group', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (groupsError) {
        console.error('[GroupClasses] Error fetching groups:', groupsError);
        return;
      }

      const classes = (classesData || []) as GroupClass[];
      setGroupClasses(classes);

      // Format and organize groups by class
      const formattedGroups: GroupWithClass[] = (groupsData || []).map((conv: any) => ({
        id: conv.id,
        contact_id: conv.contact_id,
        remote_jid: conv.remote_jid,
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count || 0,
        whatsapp_number_id: conv.whatsapp_number_id,
        group_class_id: conv.contacts.group_class_id,
        contact: {
          id: conv.contacts.id,
          name: conv.contacts.name,
          phone: conv.contacts.phone,
          avatar_url: conv.contacts.avatar_url,
        },
      }));

      // Group by class
      const byClass: Record<string, GroupWithClass[]> = {};
      const unclassified: GroupWithClass[] = [];

      classes.forEach((cls) => {
        byClass[cls.id] = [];
      });

      formattedGroups.forEach((group) => {
        if (group.group_class_id && byClass[group.group_class_id]) {
          byClass[group.group_class_id].push(group);
        } else {
          unclassified.push(group);
        }
      });

      setGroupsByClass(byClass);
      setUnclassifiedGroups(unclassified);
    } catch (err) {
      console.error('[GroupClasses] Exception:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  useEffect(() => {
    if (user && workspaceId) {
      fetchData();
    }
  }, [user, workspaceId, fetchData]);

  const moveGroup = useCallback(async (groupId: string, newClassId: string | null): Promise<boolean> => {
    // Find the group to get contact_id
    let contactId: string | null = null;
    
    for (const groups of Object.values(groupsByClass)) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        contactId = group.contact_id;
        break;
      }
    }
    
    if (!contactId) {
      const group = unclassifiedGroups.find(g => g.id === groupId);
      if (group) {
        contactId = group.contact_id;
      }
    }

    if (!contactId) return false;

    // Update group_class_id (not contact_class_id)
    const { error } = await supabase
      .from('contacts')
      .update({ group_class_id: newClassId })
      .eq('id', contactId);

    if (error) {
      console.error('[GroupClasses] Error moving group:', error);
      return false;
    }

    await fetchData();
    return true;
  }, [groupsByClass, unclassifiedGroups, fetchData]);

  const createGroupClass = useCallback(async (name: string, color: string): Promise<boolean> => {
    if (!user || !workspaceId) return false;

    const maxPosition = groupClasses.reduce((max, cls) => Math.max(max, cls.position), -1);

    // Insert into group_classes table (not contact_classes)
    const { error } = await supabase
      .from('group_classes')
      .insert({
        name,
        color,
        workspace_id: workspaceId,
        position: maxPosition + 1,
      });

    if (error) {
      console.error('[GroupClasses] Error creating class:', error);
      return false;
    }

    await fetchData();
    return true;
  }, [user, workspaceId, groupClasses, fetchData]);

  return {
    groupClasses,
    groupsByClass,
    unclassifiedGroups,
    loading,
    moveGroup,
    createGroupClass,
    refetch: fetchData,
  };
}
