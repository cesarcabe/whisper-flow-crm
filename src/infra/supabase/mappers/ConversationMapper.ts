import { Tables } from '@/integrations/supabase/types';
import { Conversation, ConversationProps } from '@/core/domain/entities/Conversation';

type ConversationRow = Tables<'conversations'>;

/**
 * Mapper para converter entre Conversation (domain) e conversations (database)
 */
export class ConversationMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: ConversationRow): Conversation {
    const props: ConversationProps = {
      id: row.id,
      workspaceId: row.workspace_id,
      contactId: row.contact_id,
      whatsappNumberId: row.whatsapp_number_id,
      pipelineId: row.pipeline_id,
      stageId: row.stage_id,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      unreadCount: row.unread_count ?? 0,
      isTyping: row.is_typing ?? false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Conversation.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(conversation: Conversation): Omit<ConversationRow, 'id' | 'created_at' | 'updated_at' | 'remote_jid' | 'is_group'> {
    return {
      workspace_id: conversation.workspaceId,
      contact_id: conversation.contactId,
      whatsapp_number_id: conversation.whatsappNumberId,
      pipeline_id: conversation.pipelineId,
      stage_id: conversation.stageId,
      last_message_at: conversation.lastMessageAt?.toISOString() ?? null,
      unread_count: conversation.unreadCount,
      is_typing: conversation.isTyping,
    };
  }

  /**
   * Converte uma entidade de domínio para formato de atualização no banco
   */
  static toUpdate(conversation: Conversation): Partial<ConversationRow> {
    return {
      pipeline_id: conversation.pipelineId,
      stage_id: conversation.stageId,
      last_message_at: conversation.lastMessageAt?.toISOString() ?? null,
      unread_count: conversation.unreadCount,
      is_typing: conversation.isTyping,
    };
  }

  /**
   * Cria um objeto parcial para atualização de stage
   */
  static toStageUpdate(pipelineId: string | null, stageId: string | null): Partial<ConversationRow> {
    return {
      pipeline_id: pipelineId,
      stage_id: stageId,
    };
  }

  /**
   * Converte múltiplas rows para entidades de domínio
   */
  static toDomainList(rows: ConversationRow[]): Conversation[] {
    return rows.map(row => ConversationMapper.toDomain(row));
  }
}
