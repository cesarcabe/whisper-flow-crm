import { supabase } from '@/integrations/supabase/client';
import { Message, MessageStatus } from '@/core/domain/entities/Message';
import { 
  MessageRepository, 
  MessageFilters, 
  PaginationOptions 
} from '@/core/ports/repositories/MessageRepository';
import { MessageMapper } from '../mappers/MessageMapper';

/**
 * Implementação do MessageRepository usando Supabase
 * Segue o padrão Adapter da Clean Architecture
 */
export class SupabaseMessageRepository implements MessageRepository {
  async findById(id: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return MessageMapper.toDomain(data);
  }

  async findByExternalId(externalId: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error || !data) return null;
    return MessageMapper.toDomain(data);
  }

  async findByConversationId(
    conversationId: string,
    pagination?: PaginationOptions
  ): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return MessageMapper.toDomainList(data);
  }

  async findByWorkspaceId(
    workspaceId: string,
    filters?: MessageFilters,
    pagination?: PaginationOptions
  ): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (filters?.conversationId) {
      query = query.eq('conversation_id', filters.conversationId);
    }
    if (filters?.whatsappNumberId) {
      query = query.eq('whatsapp_number_id', filters.whatsappNumberId);
    }
    if (filters?.isOutgoing !== undefined) {
      query = query.eq('is_outgoing', filters.isOutgoing);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.hasMedia) {
      query = query.not('media_url', 'is', null);
    }

    query = query.order('created_at', { ascending: false });

    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return MessageMapper.toDomainList(data);
  }

  async findLastByConversationId(conversationId: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return MessageMapper.toDomain(data);
  }

  async findRecentByConversationIds(
    conversationIds: string[],
    limit: number = 1
  ): Promise<Map<string, Message>> {
    if (conversationIds.length === 0) return new Map();

    // Fetch last message for each conversation
    const results = new Map<string, Message>();

    // Use Promise.all for parallel fetching
    const promises = conversationIds.map(async (conversationId) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .single();

      if (!error && data) {
        results.set(conversationId, MessageMapper.toDomain(data));
      }
    });

    await Promise.all(promises);
    return results;
  }

  async save(message: Message): Promise<Message> {
    const insertData = MessageMapper.toInsert(message);
    
    const { data, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save message: ${error?.message}`);
    }
    
    return MessageMapper.toDomain(data);
  }

  async update(message: Message): Promise<Message> {
    const updateData = MessageMapper.toUpdate(message);
    
    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', message.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update message: ${error?.message}`);
    }
    
    return MessageMapper.toDomain(data);
  }

  async updateStatus(id: string, status: MessageStatus, errorMessage?: string): Promise<void> {
    const updateData = MessageMapper.toStatusUpdate(status, errorMessage);
    
    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update message status: ${error.message}`);
    }
  }

  async updateExternalId(id: string, externalId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ external_id: externalId })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update external id: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  async countByConversationId(conversationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) return 0;
    return count ?? 0;
  }

  async existsByExternalId(externalId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('external_id', externalId);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  async findFailedMessages(workspaceId: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return MessageMapper.toDomainList(data);
  }

  async findStuckMessages(workspaceId: string, minutesThreshold: number): Promise<Message[]> {
    const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'sending')
      .lt('created_at', thresholdTime.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return MessageMapper.toDomainList(data);
  }
}
