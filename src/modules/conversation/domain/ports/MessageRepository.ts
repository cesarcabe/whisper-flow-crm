import { Message, MessageStatus } from '../entities/Message';

/**
 * Filtros para busca de mensagens
 */
export interface MessageFilters {
  conversationId?: string;
  whatsappNumberId?: string;
  isOutgoing?: boolean;
  status?: MessageStatus;
  type?: string;
  hasMedia?: boolean;
}

/**
 * Opções de paginação
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Port/Interface para acesso a dados de Message.
 * Segue o padrão Repository da Clean Architecture.
 */
export interface MessageRepository {
  /**
   * Busca uma mensagem por ID
   */
  findById(id: string): Promise<Message | null>;

  /**
   * Busca uma mensagem por external_id (ID do provider)
   */
  findByExternalId(externalId: string): Promise<Message | null>;

  /**
   * Busca mensagens de uma conversa com paginação
   */
  findByConversationId(
    conversationId: string,
    pagination?: PaginationOptions
  ): Promise<Message[]>;

  /**
   * Busca mensagens por workspace com filtros
   */
  findByWorkspaceId(
    workspaceId: string,
    filters?: MessageFilters,
    pagination?: PaginationOptions
  ): Promise<Message[]>;

  /**
   * Busca a última mensagem de uma conversa
   */
  findLastByConversationId(conversationId: string): Promise<Message | null>;

  /**
   * Busca mensagens recentes (para preview)
   */
  findRecentByConversationIds(
    conversationIds: string[],
    limit?: number
  ): Promise<Map<string, Message>>;

  /**
   * Salva uma nova mensagem
   */
  save(message: Message): Promise<Message>;

  /**
   * Atualiza uma mensagem existente
   */
  update(message: Message): Promise<Message>;

  /**
   * Atualiza status de uma mensagem
   */
  updateStatus(id: string, status: MessageStatus, errorMessage?: string): Promise<void>;

  /**
   * Atualiza external_id de uma mensagem
   */
  updateExternalId(id: string, externalId: string): Promise<void>;

  /**
   * Remove uma mensagem
   */
  delete(id: string): Promise<void>;

  /**
   * Conta mensagens de uma conversa
   */
  countByConversationId(conversationId: string): Promise<number>;

  /**
   * Verifica se mensagem com external_id já existe
   */
  existsByExternalId(externalId: string): Promise<boolean>;

  /**
   * Busca mensagens com falha para retry
   */
  findFailedMessages(workspaceId: string, limit?: number): Promise<Message[]>;

  /**
   * Busca mensagens em status "sending" há mais de X minutos
   */
  findStuckMessages(workspaceId: string, minutesThreshold: number): Promise<Message[]>;
}
