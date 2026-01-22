import { Conversation } from '@/core/domain/entities/Conversation';
import { Message } from '@/core/domain/entities/Message';
import { ConversationRepository } from '@/core/ports/repositories/ConversationRepository';
import { MessageRepository } from '@/core/ports/repositories/MessageRepository';

export interface ChatEngineServiceConfig {
  baseUrl: string;
  apiKey: string;
}

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * ConversationService - Application layer service for conversation operations.
 * Uses repositories to access data sources.
 */
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly workspaceId: string,
    private readonly chatEngineConfig?: ChatEngineServiceConfig
  ) {
    void this.chatEngineConfig;
  }

  async listConversations(whatsappNumberId?: string): Promise<ServiceResult<Conversation[]>> {
    try {
      if (!this.workspaceId) {
        return { success: true, data: [] };
      }

      const conversations = whatsappNumberId
        ? await this.conversationRepository.findByWhatsappNumberId(whatsappNumberId)
        : await this.conversationRepository.findByWorkspaceId(this.workspaceId);

      return { success: true, data: conversations };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'Failed to list conversations') };
    }
  }

  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResult<Message[]>> {
    try {
      const messages = await this.messageRepository.findByConversationId(conversationId, {
        limit,
        offset,
      });

      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: normalizeError(error, 'Failed to load messages') };
    }
  }
}

function normalizeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
}
