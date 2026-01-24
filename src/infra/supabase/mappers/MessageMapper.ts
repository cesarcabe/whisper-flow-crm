import { Tables, Json } from '@/integrations/supabase/types';
import { Message, MessageProps, MessageStatus, QuotedMessage } from '@/core/domain/entities/Message';
import { MessageType } from '@/core/domain/value-objects/MessageType';

type MessageRow = Tables<'messages'>;

/**
 * Parses quoted_message JSON from database
 */
function parseQuotedMessage(json: Json | null): QuotedMessage | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  
  const obj = json as Record<string, unknown>;
  
  // Validate required fields exist
  if (!obj.id) return null;
  
  return {
    id: String(obj.id),
    body: String(obj.body || ''),
    type: String(obj.type || 'text'),
    isOutgoing: Boolean((obj as Record<string, unknown>).is_outgoing ?? (obj as Record<string, unknown>).isOutgoing),
    mediaUrl: obj.media_url ? String(obj.media_url) : (obj as Record<string, unknown>).mediaUrl ? String((obj as Record<string, unknown>).mediaUrl) : null,
    thumbnailUrl: obj.thumbnail_url ? String(obj.thumbnail_url) : (obj as Record<string, unknown>).thumbnailUrl ? String((obj as Record<string, unknown>).thumbnailUrl) : null,
    mediaPath: obj.media_path ? String(obj.media_path) : null,
    thumbnailPath: obj.thumbnail_path ? String(obj.thumbnail_path) : null,
  };
}

/**
 * Mapper para converter entre Message (domain) e messages (database)
 */
export class MessageMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: MessageRow): Message {
    const uploadProgress = (row as MessageRow & { upload_progress?: number | null }).upload_progress ?? null;
    const props: MessageProps = {
      id: row.id,
      clientId: row.client_id ?? null,
      conversationId: row.conversation_id,
      workspaceId: row.workspace_id,
      whatsappNumberId: row.whatsapp_number_id,
      sentByUserId: row.sent_by_user_id,
      body: row.body,
      type: MessageType.create(row.type ?? 'text'),
      status: (row.status as MessageStatus) ?? 'sending',
      isOutgoing: row.is_outgoing ?? true,
      mediaType: row.media_type ?? (row.type && row.type !== 'text' ? row.type : null),
      mediaUrl: row.media_url,
      mediaPath: row.media_path ?? null,
      mimeType: row.mime_type ?? null,
      sizeBytes: row.size_bytes ?? null,
      durationMs: row.duration_ms ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      thumbnailPath: row.thumbnail_path ?? null,
      externalId: row.external_id,
      errorMessage: row.error_message,
      replyToId: row.reply_to_id,
      providerReplyId: row.provider_reply_id ?? null,
      quotedMessage: parseQuotedMessage(row.quoted_message),
      createdAt: new Date(row.created_at),
      uploadProgress,
    };

    return Message.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(message: Message): Omit<MessageRow, 'id' | 'created_at'> {
    return {
      conversation_id: message.conversationId,
      workspace_id: message.workspaceId,
      whatsapp_number_id: message.whatsappNumberId,
      sent_by_user_id: message.sentByUserId,
      body: message.body,
      type: message.type.getValue(),
      status: message.status,
      is_outgoing: message.isOutgoing,
      client_id: message.clientId,
      media_type: message.mediaType,
      media_path: message.mediaPath,
      media_url: message.mediaUrl,
      thumbnail_path: message.thumbnailPath,
      mime_type: message.mimeType,
      size_bytes: message.sizeBytes,
      duration_ms: message.durationMs,
      thumbnail_url: message.thumbnailUrl,
      external_id: message.externalId,
      error_message: message.errorMessage,
      reply_to_id: message.replyToId,
      provider_reply_id: message.providerReplyId,
      quoted_message: message.quotedMessage
        ? {
            id: message.quotedMessage.id,
            body: message.quotedMessage.body,
            type: message.quotedMessage.type,
            is_outgoing: message.quotedMessage.isOutgoing,
            media_url: message.quotedMessage.mediaUrl ?? null,
            thumbnail_url: message.quotedMessage.thumbnailUrl ?? null,
            media_path: message.quotedMessage.mediaPath ?? null,
            thumbnail_path: message.quotedMessage.thumbnailPath ?? null,
          }
        : null,
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
      media_url: message.mediaUrl,
      mime_type: message.mimeType,
      size_bytes: message.sizeBytes,
      duration_ms: message.durationMs,
      thumbnail_url: message.thumbnailUrl,
      media_path: message.mediaPath,
      thumbnail_path: message.thumbnailPath,
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
