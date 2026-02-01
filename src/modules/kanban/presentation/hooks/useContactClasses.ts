import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import {
  SupabaseContactClassRepository,
  type ContactClass,
  type ContactWithClass,
} from '../../infrastructure/repositories/SupabaseContactClassRepository';

export type { ContactClass, ContactWithClass };

const contactClassRepository = new SupabaseContactClassRepository();

export function useContactClasses(pipelineId?: string | null) {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [contactClasses, setContactClasses] = useState<ContactClass[]>([]);
  const [contactsByClass, setContactsByClass] = useState<Record<string, ContactWithClass[]>>({});
  const [unclassifiedContacts, setUnclassifiedContacts] = useState<ContactWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContactClasses = useCallback(async () => {
    if (!user || !workspaceId) return;
    try {
      const data = await contactClassRepository.fetchContactClasses(workspaceId);
      setContactClasses(data);
    } catch (err) {
      console.error('[ContactClasses] Exception fetching classes:', err);
      toast.error('Erro ao carregar classificações');
    }
  }, [user, workspaceId]);

  const fetchContactsByClass = useCallback(async () => {
    if (!user || !workspaceId) return;
    try {
      const { grouped, unclassified } = await contactClassRepository.fetchContactsByClass(workspaceId, pipelineId);
      setContactsByClass(grouped);
      setUnclassifiedContacts(unclassified);
    } catch (err) {
      console.error('[ContactClasses] Exception fetching contacts:', err);
    }
  }, [user, workspaceId, pipelineId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContactClasses(), fetchContactsByClass()]);
    setLoading(false);
  }, [fetchContactClasses, fetchContactsByClass]);

  const createContactClass = async (name: string, color?: string) => {
    if (!workspaceId) return null;
    try {
      const maxPosition = contactClasses.reduce((max, c) => Math.max(max, c.position), -1);
      const data = await contactClassRepository.createContactClass(
        workspaceId, name, color || '#6B7280', maxPosition + 1
      );

      if (!data) {
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
      const success = await contactClassRepository.updateContactClass(id, updates);
      if (!success) {
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
      const success = await contactClassRepository.deleteContactClass(id);
      if (!success) {
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
      const success = await contactClassRepository.moveContact(contactId, newClassId);
      if (!success) {
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
