import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface ContactClass {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ContactWithClass {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  contact_class_id: string | null;
  workspace_id: string | null;
}

export function useContactClasses() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [contactClasses, setContactClasses] = useState<ContactClass[]>([]);
  const [contactsByClass, setContactsByClass] = useState<Record<string, ContactWithClass[]>>({});
  const [unclassifiedContacts, setUnclassifiedContacts] = useState<ContactWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContactClasses = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('contact_classes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (error) {
        console.error('[ContactClasses] Error fetching classes:', error);
        toast.error('Erro ao carregar classificações');
        return;
      }

      setContactClasses(data || []);
    } catch (err) {
      console.error('[ContactClasses] Exception fetching classes:', err);
    }
  }, [user, workspaceId]);

  const fetchContactsByClass = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      // First, get contacts that belong to groups (to exclude them)
      const { data: groupConversations } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('is_group', true);

      const groupContactIds = new Set((groupConversations || []).map(c => c.contact_id));

      // Fetch ALL real and visible contacts (leads)
      // This ensures every contact appears in the Relationship board
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id')
        .eq('workspace_id', workspaceId)
        .eq('is_visible', true)    // Only visible contacts
        .eq('is_real', true)       // Only real contacts (not groups/LIDs)
        .order('name', { ascending: true });

      if (error) {
        console.error('[ContactClasses] Error fetching contacts:', error);
        return;
      }

      // Group contacts by contact_class_id
      // If contact_class_id is null, contact goes to "Sem Classificação" (unclassified)
      const grouped: Record<string, ContactWithClass[]> = {};
      const unclassified: ContactWithClass[] = [];

      (contacts || []).forEach((contact) => {
        // Skip contacts that belong to groups (they appear in Groups board)
        if (groupContactIds.has(contact.id)) return;

        if (contact.contact_class_id) {
          // Contact has a classification - add to its class column
          if (!grouped[contact.contact_class_id]) {
            grouped[contact.contact_class_id] = [];
          }
          grouped[contact.contact_class_id].push(contact);
        } else {
          // Contact has no classification - add to "Sem Classificação" column
          unclassified.push(contact);
        }
      });

      setContactsByClass(grouped);
      setUnclassifiedContacts(unclassified);
    } catch (err) {
      console.error('[ContactClasses] Exception fetching contacts:', err);
    }
  }, [user, workspaceId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContactClasses(), fetchContactsByClass()]);
    setLoading(false);
  }, [fetchContactClasses, fetchContactsByClass]);

  const createContactClass = async (name: string, color?: string) => {
    if (!workspaceId) return null;

    try {
      const maxPosition = contactClasses.reduce((max, c) => Math.max(max, c.position), -1);

      const { data, error } = await supabase
        .from('contact_classes')
        .insert({
          workspace_id: workspaceId,
          name,
          color: color || '#6B7280',
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) {
        console.error('[ContactClasses] Error creating class:', error);
        toast.error('Erro ao criar classificação');
        return null;
      }

      toast.success('Classificação criada!');
      await fetchContactClasses();
      return data;
    } catch (err) {
      console.error('[ContactClasses] Exception creating class:', err);
      return null;
    }
  };

  const updateContactClass = async (id: string, updates: Partial<ContactClass>) => {
    try {
      const { error } = await supabase
        .from('contact_classes')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('[ContactClasses] Error updating class:', error);
        toast.error('Erro ao atualizar classificação');
        return false;
      }

      toast.success('Classificação atualizada!');
      await fetchContactClasses();
      return true;
    } catch (err) {
      console.error('[ContactClasses] Exception updating class:', err);
      return false;
    }
  };

  const deleteContactClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_classes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[ContactClasses] Error deleting class:', error);
        toast.error('Erro ao deletar classificação');
        return false;
      }

      toast.success('Classificação deletada!');
      await fetchAll();
      return true;
    } catch (err) {
      console.error('[ContactClasses] Exception deleting class:', err);
      return false;
    }
  };

  const moveContact = async (contactId: string, newClassId: string | null) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ contact_class_id: newClassId })
        .eq('id', contactId);

      if (error) {
        console.error('[ContactClasses] Error moving contact:', error);
        toast.error('Erro ao mover contato');
        return false;
      }

      toast.success('Contato movido!');
      await fetchContactsByClass();
      return true;
    } catch (err) {
      console.error('[ContactClasses] Exception moving contact:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user && workspaceId) {
      fetchAll();
    }
  }, [user, workspaceId, fetchAll]);

  return {
    contactClasses,
    contactsByClass,
    unclassifiedContacts,
    loading,
    fetchAll,
    createContactClass,
    updateContactClass,
    deleteContactClass,
    moveContact,
  };
}
