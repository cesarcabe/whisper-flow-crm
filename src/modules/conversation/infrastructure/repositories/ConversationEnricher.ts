import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 100;

export type ContactData = {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  contact_class_id: string | null;
  contact_class?: { id: string; name: string; color: string | null } | null;
};

export type StageData = {
  id: string;
  name: string;
  color: string | null;
};

/**
 * Infrastructure service for enriching conversations with related data.
 * Encapsulates the Supabase queries that were previously scattered in hooks.
 */
export class ConversationEnricher {
  async fetchContactsBatch(contactIds: string[]): Promise<Map<string, ContactData>> {
    const contactsMap = new Map<string, ContactData>();

    for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
      const batch = contactIds.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_class:contact_classes(id, name, color)')
        .in('id', batch);

      if (error) {
        console.error('[ConversationEnricher] Error fetching contacts batch:', error);
        continue;
      }

      data?.forEach(c => {
        const contactClass = Array.isArray(c.contact_class)
          ? c.contact_class[0]
          : c.contact_class;

        contactsMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone,
          avatar_url: c.avatar_url,
          contact_class_id: c.contact_class_id,
          contact_class: contactClass,
        });
      });
    }

    return contactsMap;
  }

  async fetchStages(stageIds: string[]): Promise<Map<string, StageData>> {
    if (stageIds.length === 0) return new Map();

    const { data } = await supabase
      .from('stages')
      .select('id, name, color')
      .in('id', stageIds);

    return new Map(data?.map(s => [s.id, s]) || []);
  }

  async fetchLastMessages(convIds: string[]): Promise<Map<string, string>> {
    const lastMessageMap = new Map<string, string>();

    for (let i = 0; i < convIds.length; i += BATCH_SIZE) {
      const batch = convIds.slice(i, i + BATCH_SIZE);
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, body')
        .in('conversation_id', batch)
        .order('created_at', { ascending: false });

      data?.forEach(m => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m.body?.substring(0, 50) || '');
        }
      });
    }

    return lastMessageMap;
  }

  async fetchContactForConversation(contactId: string): Promise<ContactData | null> {
    const { data: contactRow } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('is_real', true)
      .single();

    if (!contactRow) return null;

    return {
      id: contactRow.id,
      name: contactRow.name,
      phone: contactRow.phone,
      avatar_url: contactRow.avatar_url,
      contact_class_id: contactRow.contact_class_id,
      contact_class: null,
    };
  }
}
