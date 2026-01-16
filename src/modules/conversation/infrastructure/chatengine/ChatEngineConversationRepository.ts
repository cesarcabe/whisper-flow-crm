import { Conversation } from '../../domain/entities/Conversation';
import { 
  ConversationRepository, 
  ConversationFilters, 
  ConversationOrderBy 
} from '../../domain/ports/ConversationRepository';
import { ChatEngineClient } from './ChatEngineClient';
import { ChatEngineMapper } from './ChatEngineMapper';

/**
 * Implementation of ConversationRepository using ChatEngine API
 * This adapter allows the application to use ChatEngine as the conversation backend
 */
export class ChatEngineConversationRepository implements ConversationRepository {
  constructor(private client: ChatEngineClient) {}

  async findById(id: string): Promise<Conversation | null> {
    const dto = await this.client.getConversation(id);
    if (!dto) return null;
    return ChatEngineMapper.toConversationDomain(dto);
  }

  async findByWorkspaceId(
    _workspaceId: string,
    filters?: ConversationFilters,
    _orderBy?: ConversationOrderBy,
    limit?: number,
    offset?: number
  ): Promise<Conversation[]> {
    // workspace_id comes from JWT token, not as parameter
    const response = await this.client.getConversations(
      filters?.whatsappNumberId,
      limit,
      offset
    );
    return ChatEngineMapper.toConversationDomainList(response.data);
  }

  async findByWhatsappNumberId(whatsappNumberId: string): Promise<Conversation[]> {
    // This requires knowing the workspaceId, which should come from context
    console.warn('findByWhatsappNumberId requires workspace context');
    return [];
  }

  async findByContactId(_contactId: string): Promise<Conversation[]> {
    // ChatEngine may not support this query directly
    console.warn('findByContactId not directly supported by ChatEngine');
    return [];
  }

  async findByStageId(stageId: string): Promise<Conversation[]> {
    const dtos = await this.client.getConversationsByStage(stageId);
    return ChatEngineMapper.toConversationDomainList(dtos);
  }

  async findWithoutStage(_workspaceId: string, whatsappNumberId?: string): Promise<Conversation[]> {
    // workspace_id comes from JWT token, not as parameter
    const dtos = await this.client.getConversationsWithoutStage(whatsappNumberId);
    return ChatEngineMapper.toConversationDomainList(dtos);
  }

  async findByContactAndWhatsapp(_contactId: string, _whatsappNumberId: string): Promise<Conversation | null> {
    // This query may need to be implemented differently
    console.warn('findByContactAndWhatsapp not directly supported by ChatEngine');
    return null;
  }

  async save(_conversation: Conversation): Promise<Conversation> {
    // Conversations are typically created by ChatEngine when messages arrive
    throw new Error('Conversation creation is managed by ChatEngine');
  }

  async update(_conversation: Conversation): Promise<Conversation> {
    // Updates should go through specific methods like moveToStage
    throw new Error('Use specific update methods instead');
  }

  async delete(_id: string): Promise<void> {
    // Conversation deletion may not be supported
    throw new Error('Conversation deletion not supported via ChatEngine');
  }

  async moveToStage(id: string, stageId: string | null, pipelineId: string | null): Promise<void> {
    await this.client.moveToStage(id, { stage_id: stageId, pipeline_id: pipelineId });
  }

  async incrementUnreadCount(_id: string): Promise<void> {
    // Unread counts are managed by ChatEngine
    console.warn('Unread counts are managed by ChatEngine');
  }

  async resetUnreadCount(id: string): Promise<void> {
    await this.client.markAsRead(id);
  }

  async updateLastMessageAt(_id: string, _timestamp: Date): Promise<void> {
    // Timestamps are managed by ChatEngine
    console.warn('Message timestamps are managed by ChatEngine');
  }

  async setTyping(_id: string, _isTyping: boolean): Promise<void> {
    // Typing status may need WebSocket implementation
    console.warn('Typing status requires WebSocket connection');
  }

  async countByStageId(stageId: string): Promise<number> {
    return this.client.countConversationsByStage(stageId);
  }

  async countUnread(_workspaceId: string, whatsappNumberId?: string): Promise<number> {
    // workspace_id comes from JWT token, not as parameter
    return this.client.countUnreadConversations(whatsappNumberId);
  }
}
