import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useContacts() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[CRM Kanban] Error fetching contacts:', error);
        toast.error('Erro ao carregar contatos');
        return;
      }

      setContacts((data || []) as Contact[]);
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  const createContact = async (contact: Omit<Contact, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !workspaceId) return null;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contact,
          user_id: user.id,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) {
        console.error('[CRM Kanban] Error creating contact:', error);
        toast.error('Erro ao criar contato');
        return null;
      }

      toast.success('Contato criado!');
      await fetchContacts();
      return data;
    } catch (err) {
      console.error('[CRM Kanban] Exception creating contact:', err);
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[CRM Kanban] Error updating contact:', error);
        toast.error('Erro ao atualizar contato');
        return false;
      }

      toast.success('Contato atualizado!');
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception updating contact:', err);
      return false;
    }
  };

  const deleteContact = async (id: string) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[CRM Kanban] Error deleting contact:', error);
        toast.error('Erro ao deletar contato');
        return false;
      }

      toast.success('Contato deletado!');
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception deleting contact:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user && workspaceId) {
      fetchContacts();
    }
  }, [user, workspaceId, fetchContacts]);

  return {
    contacts,
    loading,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}
