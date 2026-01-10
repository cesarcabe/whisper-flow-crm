import { Tables } from '@/integrations/supabase/types';
import { Message, MessageProps, MessageStatus } from '@/core/domain/entities/Message';
import { MessageType } from '@/core/domain/value-objects/MessageType';

type MessageRow = Tables<'messages'>;

/**
 * Mapper para converter entre Message (domain) e messages (database)
 */
export class MessageMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: MessageRow): Message {
    const props: MessageProps = {
      id: row.id,
      conversationId: row.conversation_id,
      workspaceId: row.workspace_id,
      whatsappNumberId: row.whatsapp_number_id,
      sentByUserId: row.sent_by_user_id,
      body: row.body,
      type: MessageType.create(row.type ?? 'text'),
      status: (row.status as MessageStatus) ?? 'sending',
      isOutgoing: row.is_outgoing ?? true,
      mediaUrl: row.media_url,
      externalId: row.external_id,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
    };

    return Message.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(message: Message): Omit<MessageRow, 'id' | 'created_at' | 'quoted_message' | 'reply_to_id'> {
    return {
      conversation_id: message.conversationId,
      workspace_id: message.workspaceId,
      whatsapp_number_id: message.whatsappNumberId,
      sent_by_user_id: message.sentByUserId,
      body: message.body,
      type: message.type.getValue(),
      status: message.status,
      is_outgoing: message.isOutgoing,
      media_url: message.mediaUrl,
      external_id: message.externalId,
      error_message: message.errorMessage,
    };
  }

  /**
   * Converte uma entidade de domínio para formato de atualização no banco
   */
  static toUpdate(message: Message): Partial<MessageRow> {
    return {
      status: message.status,
      error_message: message.errorMessage,
      external_id: message.externalId,
    };
  }

  /**
   * Cria um objeto parcial para atualização de status
   */
  static toStatusUpdate(status: MessageStatus, errorMessage?: string): Partial<MessageRow> {
    return {
      status,
      error_message: errorMessage ?? null,
    };
  }

  /**
   * Converte múltiplas rows para entidades de domínio
   */
  static toDomainList(rows: MessageRow[]): Message[] {
    return rows.map(row => MessageMapper.toDomain(row));
  }
}
