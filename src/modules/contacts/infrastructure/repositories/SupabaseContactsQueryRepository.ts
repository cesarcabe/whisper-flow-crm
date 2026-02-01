import { supabase } from '@/integrations/supabase/client';
import { ContactMapper } from '@/infra/supabase/mappers/ContactMapper';
import { Contact } from '@/core/domain/entities/Contact';

export class SupabaseContactsQueryRepository {
  async fetchVisibleContacts(workspaceId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_visible', true)
      .eq('is_real', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('[ContactsQueryRepository] Error fetching contacts:', error);
      throw error;
    }

    return (data || [])
      .map((row) => {
        try {
          return ContactMapper.toDomain(row);
        } catch (e) {
          console.warn('[ContactsQueryRepository] Failed to map contact:', e);
          return null;
        }
      })
      .filter((c): c is Contact => c !== null);
  }

  async fetchContactClasses(workspaceId: string) {
    const { data, error } = await supabase
      .from('contact_classes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) {
      console.error('[ContactsQueryRepository] Error fetching contact classes:', error);
      throw error;
    }

    return data || [];
  }

  async fetchGroupClasses(workspaceId: string) {
    const { data, error } = await supabase
      .from('group_classes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) {
      console.error('[ContactsQueryRepository] Error fetching group classes:', error);
      throw error;
    }

    return data || [];
  }

  async deleteContact(contactId: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('[ContactsQueryRepository] Error deleting contact:', error);
      return false;
    }

    return true;
  }
}
