import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Contact } from '@/core/domain/entities/Contact';
import { toast } from 'sonner';
import { SupabaseContactsQueryRepository } from '../../infrastructure/repositories/SupabaseContactsQueryRepository';

export type ContactStatusFilter = 'all' | 'active' | 'inactive' | 'blocked';
export type ContactClassFilter = string | null;

export interface ContactsFiltersState {
  search: string;
  status: ContactStatusFilter;
  contactClassId: ContactClassFilter;
  groupClassId: ContactClassFilter;
}

const initialFilters: ContactsFiltersState = {
  search: '',
  status: 'all',
  contactClassId: null,
  groupClassId: null,
};

const contactsRepository = new SupabaseContactsQueryRepository();

export function useContactsModule() {
  const { workspaceId } = useWorkspace();
  const [filters, setFilters] = useState<ContactsFiltersState>(initialFilters);

  const contactsQuery = useQuery({
    queryKey: ['contacts', workspaceId],
    queryFn: () => contactsRepository.fetchVisibleContacts(workspaceId!),
    enabled: !!workspaceId,
  });

  const contactClassesQuery = useQuery({
    queryKey: ['contact-classes', workspaceId],
    queryFn: () => contactsRepository.fetchContactClasses(workspaceId!),
    enabled: !!workspaceId,
  });

  const groupClassesQuery = useQuery({
    queryKey: ['group-classes', workspaceId],
    queryFn: () => contactsRepository.fetchGroupClasses(workspaceId!),
    enabled: !!workspaceId,
  });

  const filteredContacts = useMemo(() => {
    if (!contactsQuery.data) return [];

    return contactsQuery.data.filter((contact) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = contact.name.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phone.getValue().includes(filters.search);
        const emailMatch = contact.email?.toLowerCase().includes(searchLower);

        if (!nameMatch && !phoneMatch && !emailMatch) return false;
      }

      if (filters.status !== 'all' && contact.status !== filters.status) {
        return false;
      }

      if (filters.contactClassId && contact.contactClassId !== filters.contactClassId) {
        return false;
      }

      if (filters.groupClassId && contact.groupClassId !== filters.groupClassId) {
        return false;
      }

      return true;
    });
  }, [contactsQuery.data, filters]);

  const updateFilter = useCallback(<K extends keyof ContactsFiltersState>(
    key: K,
    value: ContactsFiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.contactClassId !== null ||
      filters.groupClassId !== null
    );
  }, [filters]);

  const deleteContact = useCallback(async (contactId: string) => {
    if (!workspaceId) return false;

    try {
      const success = await contactsRepository.deleteContact(contactId, workspaceId);
      if (!success) {
        toast.error('Erro ao deletar contato');
        return false;
      }

      toast.success('Contato deletado!');
      contactsQuery.refetch();
      return true;
    } catch (err) {
      console.error('[useContactsModule] Exception deleting contact:', err);
      return false;
    }
  }, [workspaceId, contactsQuery]);

  return {
    contacts: filteredContacts,
    allContacts: contactsQuery.data || [],
    contactClasses: contactClassesQuery.data || [],
    groupClasses: groupClassesQuery.data || [],
    loading: contactsQuery.isLoading,
    error: contactsQuery.error,
    filters,
    hasActiveFilters,
    updateFilter,
    clearFilters,
    refetch: contactsQuery.refetch,
    deleteContact,
    totalCount: contactsQuery.data?.length || 0,
    filteredCount: filteredContacts.length,
  };
}
