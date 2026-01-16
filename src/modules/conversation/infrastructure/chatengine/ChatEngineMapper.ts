import { Conversation, ConversationProps } from '../../domain/entities/Conversation';
import { Message, MessageProps, QuotedMessage } from '../../domain/entities/Message';
import { MessageType } from '../../domain/value-objects/MessageType';
import { 
  ChatEngineConversationDTO, 
  ChatEngineMessageDTO,
  SendTextMessagePayload 
} from './types';

/**
 * Mapper for converting between ChatEngine DTOs and Domain entities
 * This is the Anti-Corruption Layer that protects the domain from external changes
 */
export class ChatEngineMapper {
  // ==================== Conversation Mapping ====================

  static toConversationDomain(dto: ChatEngineConversationDTO): Conversation {
    const props: ConversationProps = {
      id: dto.id,
      workspaceId: dto.workspace_id,
      contactId: dto.contact_id,
      whatsappNumberId: dto.whatsapp_number_id,
      remoteJid: dto.remote_jid,
      isGroup: dto.is_group,
      pipelineId: dto.pipeline_id,
      stageId: dto.stage_id,
      lastMessageAt: dto.last_message_at ? new Date(dto.last_message_at) : null,
      unreadCount: dto.unread_count,
      isTyping: dto.is_typing,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };

    return Conversation.create(props);
  }

  static toConversationDomainList(dtos: ChatEngineConversationDTO[]): Conversation[] {
    return dtos.map(dto => ChatEngineMapper.toConversationDomain(dto));
  }

  // ==================== Message Mapping ====================

  static toMessageDomain(dto: ChatEngineMessageDTO, workspaceId: string): Message {
    const quotedMessage: QuotedMessage | null = dto.quoted_message 
      ? {
          id: dto.quoted_message.id,
          body: dto.quoted_message.body,
          type: dto.quoted_message.type,
          isOutgoing: dto.quoted_message.is_outgoing,
        }
      : null;

    const props: MessageProps = {
      id: dto.id,
      conversationId: dto.conversation_id,
      workspaceId: workspaceId,
      whatsappNumberId: null, // Will be set from conversation context if needed
      sentByUserId: dto.sent_by_user_id,
      body: dto.body,
      type: MessageType.create(dto.type),
      status: dto.status,
      isOutgoing: dto.from_me,
      mediaUrl: dto.media_url,
      externalId: dto.external_id,
      errorMessage: null,
      replyToId: dto.reply_to_id,
      quotedMessage,
      createdAt: new Date(dto.created_at),
    };

    return Message.create(props);
  }

  static toMessageDomainList(dtos: ChatEngineMessageDTO[], workspaceId: string): Message[] {
    return dtos.map(dto => ChatEngineMapper.toMessageDomain(dto, workspaceId));
  }

  // ==================== Command Mapping ====================

  static toSendTextPayload(
    conversationId: string, 
    body: string, 
    replyToId?: string
  ): SendTextMessagePayload {
    return {
      conversation_id: conversationId,
      body,
      reply_to_id: replyToId,
    };
  }
}
