import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { Contact } from '@/core/domain/entities/Contact';
import { ContactMapper } from '@/infra/supabase/mappers/ContactMapper';
import { Tables } from '@/integrations/supabase/types';

// Re-export domain entity
export { Contact } from '@/core/domain/entities/Contact';

type ContactRow = Tables<'contacts'>;

/**
 * Legacy contact format for backward compatibility
 */
export interface LegacyContact {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  status: string | null;
  notes: string | null;
  contact_class_id: string | null;
  group_class_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Domain entity for advanced usage
  _domain?: Contact;
}

export function useContacts() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<LegacyContact[]>([]);
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
        console.error('[useContacts] Error fetching contacts:', error);
        toast.error('Erro ao carregar contatos');
        return;
      }

      // Convert to legacy format with domain entities attached
      const contactsWithDomain: LegacyContact[] = (data || []).map(row => {
        let domain: Contact | undefined;
        try {
          domain = ContactMapper.toDomain(row);
        } catch (e) {
          console.warn('[useContacts] Failed to map contact:', e);
        }
        return {
          ...row,
          _domain: domain,
        };
      });
      
      setContacts(contactsWithDomain);
    } catch (err) {
      console.error('[useContacts] Exception fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  const createContact = async (contact: {
    name: string;
    phone: string;
    email?: string | null;
    avatar_url?: string | null;
    status?: string | null;
    notes?: string | null;
    contact_class_id?: string | null;
    group_class_id?: string | null;
  }): Promise<LegacyContact | null> => {
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
        console.error('[useContacts] Error creating contact:', error);
        toast.error('Erro ao criar contato');
        return null;
      }

      toast.success('Contato criado!');
      await fetchContacts();
      
      // Return with domain entity
      let domain: Contact | undefined;
      try {
        domain = ContactMapper.toDomain(data);
      } catch (e) {
        console.warn('[useContacts] Failed to map contact:', e);
      }
      
      return { ...data, _domain: domain };
    } catch (err) {
      console.error('[useContacts] Exception creating contact:', err);
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<ContactRow>): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[useContacts] Error updating contact:', error);
        toast.error('Erro ao atualizar contato');
        return false;
      }

      toast.success('Contato atualizado!');
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('[useContacts] Exception updating contact:', err);
      return false;
    }
  };

  const deleteContact = async (id: string): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[useContacts] Error deleting contact:', error);
        toast.error('Erro ao deletar contato');
        return false;
      }

      toast.success('Contato deletado!');
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('[useContacts] Exception deleting contact:', err);
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
