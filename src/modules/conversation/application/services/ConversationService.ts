import { Message } from '../../domain/entities/Message';
import { Conversation } from '../../domain/entities/Conversation';
import { 
  ConversationRepository, 
  ConversationFilters 
} from '../../domain/ports/ConversationRepository';
import { MessageRepository } from '../../domain/ports/MessageRepository';
import { ChatEngineClient } from '../../infrastructure/chatengine/ChatEngineClient';
import { ChatEngineMapper } from '../../infrastructure/chatengine/ChatEngineMapper';

/**
 * Result type for service operations
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Contact info for conversation display
 */
export interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
}

/**
 * Conversation with contact for list display
 */
export interface ConversationWithContact {
  conversation: Conversation;
  contact: ContactInfo;
  lastMessage: Message | null;
  stageName?: string;
}

/**
 * ConversationService - Application layer service
 * Orchestrates conversation and message operations
 * This is the only interface that presentation layer should use
 */
export class ConversationService {
  private chatEngineClient: ChatEngineClient | null = null;

  constructor(
    private conversationRepo: ConversationRepository,
    private messageRepo: MessageRepository,
    private workspaceId: string,
    chatEngineConfig?: { baseUrl: string; apiKey: string }
  ) {
    if (chatEngineConfig) {
      this.chatEngineClient = new ChatEngineClient(
        chatEngineConfig.baseUrl,
        chatEngineConfig.apiKey
      );
    }
  }

  // ==================== Conversation Operations ====================

  async listConversations(
    whatsappNumberId?: string
  ): Promise<Result<Conversation[]>> {
    try {
      const filters: ConversationFilters = {};
      if (whatsappNumberId) {
        filters.whatsappNumberId = whatsappNumberId;
      }

      const conversations = await this.conversationRepo.findByWorkspaceId(
        this.workspaceId,
        filters,
        { field: 'lastMessageAt', direction: 'desc' }
      );

      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getConversation(conversationId: string): Promise<Result<Conversation | null>> {
    try {
      const conversation = await this.conversationRepo.findById(conversationId);
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getConversationsByStage(stageId: string): Promise<Result<Conversation[]>> {
    try {
      const conversations = await this.conversationRepo.findByStageId(stageId);
      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getInboxConversations(whatsappNumberId?: string): Promise<Result<Conversation[]>> {
    try {
      const conversations = await this.conversationRepo.findWithoutStage(
        this.workspaceId,
        whatsappNumberId
      );
      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async moveToStage(
    conversationId: string,
    stageId: string | null,
    pipelineId: string | null
  ): Promise<Result<void>> {
    try {
      await this.conversationRepo.moveToStage(conversationId, stageId, pipelineId);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async markAsRead(conversationId: string): Promise<Result<void>> {
    try {
      await this.conversationRepo.resetUnreadCount(conversationId);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // ==================== Message Operations ====================

  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Result<Message[]>> {
    try {
      const messages = await this.messageRepo.findByConversationId(
        conversationId,
        { limit, offset }
      );
      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async sendTextMessage(
    conversationId: string,
    body: string,
    replyToId?: string
  ): Promise<Result<Message>> {
    try {
      // If ChatEngine is configured, use it
      if (this.chatEngineClient) {
        const dto = await this.chatEngineClient.sendTextMessage({
          conversation_id: conversationId,
          body,
          reply_to_id: replyToId,
        });
        const message = ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
        return { success: true, data: message };
      }

      // Fallback to edge function (current behavior)
      throw new Error('ChatEngine not configured - use edge function directly');
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async sendImageMessage(
    conversationId: string,
    imageBase64: string,
    mimeType: string,
    caption?: string
  ): Promise<Result<Message>> {
    try {
      if (this.chatEngineClient) {
        const dto = await this.chatEngineClient.sendImage({
          conversation_id: conversationId,
          image_base64: imageBase64,
          mime_type: mimeType,
          caption,
        });
        const message = ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
        return { success: true, data: message };
      }

      throw new Error('ChatEngine not configured - use edge function directly');
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async sendAudioMessage(
    conversationId: string,
    audioBase64: string,
    mimeType: string
  ): Promise<Result<Message>> {
    try {
      if (this.chatEngineClient) {
        const dto = await this.chatEngineClient.sendAudio({
          conversation_id: conversationId,
          audio_base64: audioBase64,
          mime_type: mimeType,
        });
        const message = ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
        return { success: true, data: message };
      }

      throw new Error('ChatEngine not configured - use edge function directly');
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async forwardMessage(
    messageId: string,
    targetConversationId: string
  ): Promise<Result<Message>> {
    try {
      if (this.chatEngineClient) {
        const dto = await this.chatEngineClient.forwardMessage(messageId, targetConversationId);
        const message = ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
        return { success: true, data: message };
      }

      throw new Error('ChatEngine not configured - use edge function directly');
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // ==================== Counts ====================

  async countUnread(whatsappNumberId?: string): Promise<Result<number>> {
    try {
      const count = await this.conversationRepo.countUnread(
        this.workspaceId,
        whatsappNumberId
      );
      return { success: true, data: count };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async countByStage(stageId: string): Promise<Result<number>> {
    try {
      const count = await this.conversationRepo.countByStageId(stageId);
      return { success: true, data: count };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
