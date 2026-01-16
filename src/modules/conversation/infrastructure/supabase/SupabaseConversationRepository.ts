import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '../../domain/entities/Conversation';
import { 
  ConversationRepository, 
  ConversationFilters, 
  ConversationOrderBy 
} from '../../domain/ports/ConversationRepository';
import { ConversationMapper } from './ConversationMapper';

/**
 * Implementação do ConversationRepository usando Supabase
 * Segue o padrão Adapter da Clean Architecture
 */
export class SupabaseConversationRepository implements ConversationRepository {
  async findById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return ConversationMapper.toDomain(data);
  }

  async findByWorkspaceId(
    workspaceId: string,
    filters?: ConversationFilters,
    orderBy?: ConversationOrderBy,
    limit?: number,
    offset?: number
  ): Promise<Conversation[]> {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (filters?.whatsappNumberId) {
      query = query.eq('whatsapp_number_id', filters.whatsappNumberId);
    }
    if (filters?.pipelineId) {
      query = query.eq('pipeline_id', filters.pipelineId);
    }
    if (filters?.stageId) {
      query = query.eq('stage_id', filters.stageId);
    }
    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }
    if (filters?.isGroup !== undefined) {
      query = query.eq('is_group', filters.isGroup);
    }
    if (filters?.hasUnread) {
      query = query.gt('unread_count', 0);
    }

    // Apply ordering
    const orderField = this.mapOrderField(orderBy?.field ?? 'lastMessageAt');
    const ascending = orderBy?.direction === 'asc';
    query = query.order(orderField, { ascending, nullsFirst: false });

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit ?? 50) - 1);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return ConversationMapper.toDomainList(data);
  }

  async findByWhatsappNumberId(whatsappNumberId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return ConversationMapper.toDomainList(data);
  }

  async findByContactId(contactId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contactId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return ConversationMapper.toDomainList(data);
  }

  async findByStageId(stageId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('stage_id', stageId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return ConversationMapper.toDomainList(data);
  }

  async findWithoutStage(workspaceId: string, whatsappNumberId?: string): Promise<Conversation[]> {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('stage_id', null);

    if (whatsappNumberId) {
      query = query.eq('whatsapp_number_id', whatsappNumberId);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return ConversationMapper.toDomainList(data);
  }

  async findByContactAndWhatsapp(contactId: string, whatsappNumberId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contactId)
      .eq('whatsapp_number_id', whatsappNumberId)
      .single();

    if (error || !data) return null;
    return ConversationMapper.toDomain(data);
  }

  async save(conversation: Conversation): Promise<Conversation> {
    const insertData = ConversationMapper.toInsert(conversation);
    
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save conversation: ${error?.message}`);
    }
    
    return ConversationMapper.toDomain(data);
  }

  async update(conversation: Conversation): Promise<Conversation> {
    const updateData = ConversationMapper.toUpdate(conversation);
    
    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversation.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update conversation: ${error?.message}`);
    }
    
    return ConversationMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  async moveToStage(id: string, stageId: string | null, pipelineId: string | null): Promise<void> {
    const updateData = ConversationMapper.toStageUpdate(pipelineId, stageId);
    
    const { error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to move conversation to stage: ${error.message}`);
    }
  }

  async incrementUnreadCount(id: string): Promise<void> {
    const { data: current } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', id)
      .single();

    const newCount = (current?.unread_count ?? 0) + 1;

    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: newCount })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to increment unread count: ${error.message}`);
    }
  }

  async resetUnreadCount(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to reset unread count: ${error.message}`);
    }
  }

  async updateLastMessageAt(id: string, timestamp: Date): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ last_message_at: timestamp.toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update last message timestamp: ${error.message}`);
    }
  }

  async setTyping(id: string, isTyping: boolean): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ is_typing: isTyping })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to set typing status: ${error.message}`);
    }
  }

  async countByStageId(stageId: string): Promise<number> {
    const { count, error } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', stageId);

    if (error) return 0;
    return count ?? 0;
  }

  async countUnread(workspaceId: string, whatsappNumberId?: string): Promise<number> {
    let query = supabase
      .from('conversations')
      .select('unread_count')
      .eq('workspace_id', workspaceId)
      .gt('unread_count', 0);

    if (whatsappNumberId) {
      query = query.eq('whatsapp_number_id', whatsappNumberId);
    }

    const { data, error } = await query;

    if (error || !data) return 0;
    return data.reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
  }

  private mapOrderField(field: string): string {
    const mapping: Record<string, string> = {
      lastMessageAt: 'last_message_at',
      createdAt: 'created_at',
      unreadCount: 'unread_count',
    };
    return mapping[field] ?? 'last_message_at';
  }
}
