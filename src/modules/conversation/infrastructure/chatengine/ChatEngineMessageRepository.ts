import { Message, MessageStatus } from '../../domain/entities/Message';
import { 
  MessageRepository, 
  MessageFilters, 
  PaginationOptions 
} from '../../domain/ports/MessageRepository';
import { ChatEngineClient } from './ChatEngineClient';
import { ChatEngineMapper } from './ChatEngineMapper';

/**
 * Implementation of MessageRepository using ChatEngine API
 * This adapter allows the application to use ChatEngine as the message backend
 */
export class ChatEngineMessageRepository implements MessageRepository {
  constructor(
    private client: ChatEngineClient,
    private workspaceId: string
  ) {}

  async findById(id: string): Promise<Message | null> {
    const dto = await this.client.getMessage(id);
    if (!dto) return null;
    return ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
  }

  async findByExternalId(externalId: string): Promise<Message | null> {
    const dto = await this.client.getMessageByExternalId(externalId);
    if (!dto) return null;
    return ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
  }

  async findByConversationId(
    conversationId: string,
    pagination?: PaginationOptions
  ): Promise<Message[]> {
    const dtos = await this.client.getMessages(
      conversationId, 
      pagination?.limit
    );
    return ChatEngineMapper.toMessageDomainList(dtos, this.workspaceId);
  }

  async findByWorkspaceId(
    _workspaceId: string,
    filters?: MessageFilters,
    pagination?: PaginationOptions
  ): Promise<Message[]> {
    // ChatEngine requires conversation_id for messages query
    if (!filters?.conversationId) {
      console.warn('ChatEngine requires conversationId filter for messages');
      return [];
    }
    return this.findByConversationId(filters.conversationId, pagination);
  }

  async findLastByConversationId(conversationId: string): Promise<Message | null> {
    const dtos = await this.client.getMessages(conversationId, 1);
    if (dtos.length === 0) return null;
    return ChatEngineMapper.toMessageDomain(dtos[0], this.workspaceId);
  }

  async findRecentByConversationIds(
    conversationIds: string[],
    _limit: number = 1
  ): Promise<Map<string, Message>> {
    const results = new Map<string, Message>();

    // Fetch in parallel
    const promises = conversationIds.map(async (conversationId) => {
      const message = await this.findLastByConversationId(conversationId);
      if (message) {
        results.set(conversationId, message);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async save(message: Message): Promise<Message> {
    // For sending new messages, use the appropriate method based on type
    const dto = await this.client.sendTextMessage({
      conversation_id: message.conversationId,
      body: message.body,
      reply_to_id: message.replyToId ?? undefined,
    });
    return ChatEngineMapper.toMessageDomain(dto, this.workspaceId);
  }

  async update(_message: Message): Promise<Message> {
    // ChatEngine may not support direct message updates
    throw new Error('Message updates not supported via ChatEngine');
  }

  async updateStatus(_id: string, _status: MessageStatus, _errorMessage?: string): Promise<void> {
    // Status updates are handled by ChatEngine internally
    console.warn('Status updates are managed by ChatEngine');
  }

  async updateExternalId(_id: string, _externalId: string): Promise<void> {
    // External ID updates are handled by ChatEngine internally
    console.warn('External ID updates are managed by ChatEngine');
  }

  async delete(_id: string): Promise<void> {
    // Message deletion may not be supported
    throw new Error('Message deletion not supported via ChatEngine');
  }

  async countByConversationId(conversationId: string): Promise<number> {
    return this.client.countMessagesByConversation(conversationId);
  }

  async existsByExternalId(externalId: string): Promise<boolean> {
    const message = await this.findByExternalId(externalId);
    return message !== null;
  }

  async findFailedMessages(_workspaceId: string, _limit?: number): Promise<Message[]> {
    // Failed messages are managed by ChatEngine
    return [];
  }

  async findStuckMessages(_workspaceId: string, _minutesThreshold: number): Promise<Message[]> {
    // Stuck messages are managed by ChatEngine
    return [];
  }
}
