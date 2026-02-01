import { supabase } from '@/integrations/supabase/client';

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

export class SupabaseContactClassRepository {
  async fetchContactClasses(workspaceId: string): Promise<ContactClass[]> {
    const { data, error } = await supabase
      .from('contact_classes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) {
      console.error('[ContactClassRepository] Error fetching classes:', error);
      throw error;
    }

    return data || [];
  }

  async fetchContactsByClass(
    workspaceId: string,
    pipelineId?: string | null,
  ): Promise<{ grouped: Record<string, ContactWithClass[]>; unclassified: ContactWithClass[] }> {
    // Get group contacts to exclude
    const { data: groupConversations } = await supabase
      .from('conversations')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('is_group', true);

    const groupContactIds = new Set((groupConversations || []).map(c => c.contact_id));

    // Build query
    let query = supabase
      .from('contacts')
      .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id, pipeline_id')
      .eq('workspace_id', workspaceId)
      .eq('is_visible', true)
      .eq('is_real', true);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data: contacts, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('[ContactClassRepository] Error fetching contacts:', error);
      throw error;
    }

    const grouped: Record<string, ContactWithClass[]> = {};
    const unclassified: ContactWithClass[] = [];

    (contacts || []).forEach((contact) => {
      if (groupContactIds.has(contact.id)) return;

      if (contact.contact_class_id) {
        if (!grouped[contact.contact_class_id]) {
          grouped[contact.contact_class_id] = [];
        }
        grouped[contact.contact_class_id].push(contact);
      } else {
        unclassified.push(contact);
      }
    });

    return { grouped, unclassified };
  }

  async createContactClass(workspaceId: string, name: string, color: string, position: number): Promise<ContactClass | null> {
    const { data, error } = await supabase
      .from('contact_classes')
      .insert({
        workspace_id: workspaceId,
        name,
        color,
        position,
      })
      .select()
      .single();

    if (error) {
      console.error('[ContactClassRepository] Error creating class:', error);
      return null;
    }

    return data as ContactClass;
  }

  async updateContactClass(id: string, updates: Partial<ContactClass>): Promise<boolean> {
    const { error } = await supabase
      .from('contact_classes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[ContactClassRepository] Error updating class:', error);
      return false;
    }

    return true;
  }

  async deleteContactClass(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('contact_classes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ContactClassRepository] Error deleting class:', error);
      return false;
    }

    return true;
  }

  async moveContact(contactId: string, newClassId: string | null): Promise<boolean> {
    const { error } = await supabase
      .from('contacts')
      .update({ contact_class_id: newClassId })
      .eq('id', contactId);

    if (error) {
      console.error('[ContactClassRepository] Error moving contact:', error);
      return false;
    }

    return true;
  }
}
