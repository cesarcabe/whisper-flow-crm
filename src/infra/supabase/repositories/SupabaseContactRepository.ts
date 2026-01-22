import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/core/domain/entities/Contact';
import { ContactRepository } from '@/core/ports/repositories/ContactRepository';
import { ContactMapper } from '../mappers/ContactMapper';

/**
 * Implementação do ContactRepository usando Supabase
 * Segue o padrão Adapter da Clean Architecture
 */
export class SupabaseContactRepository implements ContactRepository {
  async findById(id: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return ContactMapper.toDomain(data);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return ContactMapper.toDomainList(data);
  }

  async findByContactClassId(workspaceId: string, contactClassId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('contact_class_id', contactClassId)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return ContactMapper.toDomainList(data);
  }

  async findByGroupClassId(workspaceId: string, groupClassId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('group_class_id', groupClassId)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return ContactMapper.toDomainList(data);
  }

  async findUnclassified(workspaceId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('contact_class_id', null)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return ContactMapper.toDomainList(data);
  }

  async findByPhone(workspaceId: string, phone: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('phone', phone)
      .single();

    if (error || !data) return null;
    return ContactMapper.toDomain(data);
  }

  async search(workspaceId: string, query: string): Promise<Contact[]> {
    const searchPattern = `%${query}%`;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern}`)
      .order('name', { ascending: true })
      .limit(50);

    if (error || !data) return [];
    return ContactMapper.toDomainList(data);
  }

  async save(contact: Contact, userId: string): Promise<Contact> {
    const insertData = ContactMapper.toInsert(contact, userId);
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save contact: ${error?.message}`);
    }
    
    return ContactMapper.toDomain(data);
  }

  async update(contact: Contact): Promise<Contact> {
    const updateData = ContactMapper.toUpdate(contact);
    
    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contact.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update contact: ${error?.message}`);
    }
    
    return ContactMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  async count(workspaceId: string): Promise<number> {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (error) return 0;
    return count ?? 0;
  }

  async updateContactClass(id: string, contactClassId: string | null): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update({ contact_class_id: contactClassId })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update contact class: ${error.message}`);
    }
  }

  async updateGroupClass(id: string, groupClassId: string | null): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update({ group_class_id: groupClassId })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update group class: ${error.message}`);
    }
  }
}
