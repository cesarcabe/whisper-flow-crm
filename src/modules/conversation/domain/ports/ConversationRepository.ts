import { Conversation } from '../entities/Conversation';

/**
 * Filtros para busca de conversas
 */
export interface ConversationFilters {
  whatsappNumberId?: string;
  pipelineId?: string;
  stageId?: string;
  contactId?: string;
  isGroup?: boolean;
  hasUnread?: boolean;
}

/**
 * Opções de ordenação
 */
export interface ConversationOrderBy {
  field: 'lastMessageAt' | 'createdAt' | 'unreadCount';
  direction: 'asc' | 'desc';
}

/**
 * Port/Interface para acesso a dados de Conversation.
 * Segue o padrão Repository da Clean Architecture.
 */
export interface ConversationRepository {
  /**
   * Busca uma conversa por ID
   */
  findById(id: string): Promise<Conversation | null>;

  /**
   * Busca conversas por workspace com filtros opcionais
   */
  findByWorkspaceId(
    workspaceId: string,
    filters?: ConversationFilters,
    orderBy?: ConversationOrderBy,
    limit?: number,
    offset?: number
  ): Promise<Conversation[]>;

  /**
   * Busca conversas por número de WhatsApp
   */
  findByWhatsappNumberId(whatsappNumberId: string): Promise<Conversation[]>;

  /**
   * Busca conversas por contato
   */
  findByContactId(contactId: string): Promise<Conversation[]>;

  /**
   * Busca conversas por estágio
   */
  findByStageId(stageId: string): Promise<Conversation[]>;

  /**
   * Busca conversas sem estágio (inbox)
   */
  findWithoutStage(workspaceId: string, whatsappNumberId?: string): Promise<Conversation[]>;

  /**
   * Busca conversa existente entre contato e número WhatsApp
   */
  findByContactAndWhatsapp(contactId: string, whatsappNumberId: string): Promise<Conversation | null>;

  /**
   * Salva uma nova conversa
   */
  save(conversation: Conversation): Promise<Conversation>;

  /**
   * Atualiza uma conversa existente
   */
  update(conversation: Conversation): Promise<Conversation>;

  /**
   * Remove uma conversa
   */
  delete(id: string): Promise<void>;

  /**
   * Move conversa para outro estágio
   */
  moveToStage(id: string, stageId: string | null, pipelineId: string | null): Promise<void>;

  /**
   * Incrementa contador de não lidas
   */
  incrementUnreadCount(id: string): Promise<void>;

  /**
   * Zera contador de não lidas
   */
  resetUnreadCount(id: string): Promise<void>;

  /**
   * Atualiza timestamp da última mensagem
   */
  updateLastMessageAt(id: string, timestamp: Date): Promise<void>;

  /**
   * Define status de digitação
   */
  setTyping(id: string, isTyping: boolean): Promise<void>;

  /**
   * Conta conversas por estágio
   */
  countByStageId(stageId: string): Promise<number>;

  /**
   * Conta conversas não lidas
   */
  countUnread(workspaceId: string, whatsappNumberId?: string): Promise<number>;
}
