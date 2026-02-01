import { Conversation } from '@/core/domain/entities/Conversation';
import { Message } from '@/core/domain/entities/Message';
import type { ConversationRepository } from '@/core/ports/repositories/ConversationRepository';
import type { MessageRepository } from '@/core/ports/repositories/MessageRepository';
import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';

export interface ChatEngineServiceConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * @deprecated Use Result<T, AppError> instead.
 * Kept for backward compatibility during migration.
 */
export type ServiceResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * ConversationService - Application layer service for conversation operations.
 * Depends only on repository interfaces (ports), not on concrete implementations.
 */
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly workspaceId: string,
    private readonly chatEngineConfig?: ChatEngineServiceConfig,
  ) {
    void this.chatEngineConfig;
  }

  async listConversations(whatsappNumberId?: string): Promise<Result<Conversation[], AppError>> {
    try {
      if (!this.workspaceId) {
        return success([]);
      }

      const conversations = whatsappNumberId
        ? await this.conversationRepository.findByWhatsappNumberId(whatsappNumberId)
        : await this.conversationRepository.findByWorkspaceId(this.workspaceId);

      return success(conversations);
    } catch (error) {
      return failure(new InfrastructureError('Failed to list conversations', error));
    }
  }

  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Result<Message[], AppError>> {
    try {
      const messages = await this.messageRepository.findByConversationId(conversationId, {
        limit,
        offset,
      });

      return success(messages);
    } catch (error) {
      return failure(new InfrastructureError('Failed to load messages', error));
    }
  }

  async getConversationById(conversationId: string): Promise<Result<Conversation | null, AppError>> {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      return success(conversation);
    } catch (error) {
      return failure(new InfrastructureError('Failed to get conversation', error));
    }
  }

  async moveToStage(conversationId: string, pipelineId: string, stageId: string): Promise<Result<void, AppError>> {
    try {
      await this.conversationRepository.moveToStage(conversationId, pipelineId, stageId);
      return success(undefined);
    } catch (error) {
      return failure(new InfrastructureError('Failed to move conversation to stage', error));
    }
  }

  async resetUnreadCount(conversationId: string): Promise<Result<void, AppError>> {
    try {
      await this.conversationRepository.resetUnreadCount(conversationId);
      return success(undefined);
    } catch (error) {
      return failure(new InfrastructureError('Failed to reset unread count', error));
    }
  }
}
