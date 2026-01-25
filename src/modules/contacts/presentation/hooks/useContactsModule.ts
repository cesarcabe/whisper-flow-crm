import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ContactMapper } from '@/infra/supabase/mappers/ContactMapper';
import { Contact } from '@/core/domain/entities/Contact';
import { toast } from 'sonner';

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

export function useContactsModule() {
  const { workspaceId } = useWorkspace();
  const [filters, setFilters] = useState<ContactsFiltersState>(initialFilters);

  // Fetch contacts
  const contactsQuery = useQuery({
    queryKey: ['contacts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[useContactsModule] Error fetching contacts:', error);
        throw error;
      }

      return (data || []).map((row) => {
        try {
          return ContactMapper.toDomain(row);
        } catch (e) {
          console.warn('[useContactsModule] Failed to map contact:', e);
          return null;
        }
      }).filter((c): c is Contact => c !== null);
    },
    enabled: !!workspaceId,
  });

  // Fetch contact classes
  const contactClassesQuery = useQuery({
    queryKey: ['contact-classes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('contact_classes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (error) {
        console.error('[useContactsModule] Error fetching contact classes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Fetch group classes
  const groupClassesQuery = useQuery({
    queryKey: ['group-classes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('group_classes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (error) {
        console.error('[useContactsModule] Error fetching group classes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Apply filters
  const filteredContacts = useMemo(() => {
    if (!contactsQuery.data) return [];

    return contactsQuery.data.filter((contact) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = contact.name.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phone.getValue().includes(filters.search);
        const emailMatch = contact.email?.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !phoneMatch && !emailMatch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && contact.status !== filters.status) {
        return false;
      }

      // Contact class filter
      if (filters.contactClassId && contact.contactClassId !== filters.contactClassId) {
        return false;
      }

      // Group class filter
      if (filters.groupClassId && contact.groupClassId !== filters.groupClassId) {
        return false;
      }

      return true;
    });
  }, [contactsQuery.data, filters]);

  // Update filters
  const updateFilter = useCallback(<K extends keyof ContactsFiltersState>(
    key: K,
    value: ContactsFiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.contactClassId !== null ||
      filters.groupClassId !== null
    );
  }, [filters]);

  // Delete contact
  const deleteContact = useCallback(async (contactId: string) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[useContactsModule] Error deleting contact:', error);
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
    // Data
    contacts: filteredContacts,
    allContacts: contactsQuery.data || [],
    contactClasses: contactClassesQuery.data || [],
    groupClasses: groupClassesQuery.data || [],
    
    // State
    loading: contactsQuery.isLoading,
    error: contactsQuery.error,
    filters,
    hasActiveFilters,
    
    // Actions
    updateFilter,
    clearFilters,
    refetch: contactsQuery.refetch,
    deleteContact,
    
    // Stats
    totalCount: contactsQuery.data?.length || 0,
    filteredCount: filteredContacts.length,
  };
}
