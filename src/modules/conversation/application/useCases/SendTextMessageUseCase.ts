/**
 * SendTextMessageUseCase
 * 
 * Use case para enviar mensagens de texto.
 * Suporta envio via WebSocket (quando disponível) com fallback para Edge Function.
 */

/**
 * DTO para envio de mensagem de texto
 */
export interface SendTextMessageDTO {
  /** ID da conversa */
  conversationId: string;
  /** Conteúdo da mensagem */
  content: string;
  /** ID da mensagem sendo respondida (opcional) */
  replyToId?: string | null;
  /** ID do cliente para a mensagem (para otimistic updates) */
  clientMessageId?: string;
}

/**
 * Resultado do envio
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: Error;
}

/**
 * Configuração do use case
 */
export interface SendTextMessageConfig {
  /** Cliente WebSocket (opcional) */
  websocketClient?: {
    isConnected: () => boolean;
    sendMessage: (input: {
      conversationId: string;
      content: string;
      messageId?: string;
      replyToMessageId?: string;
    }) => void;
  };
  /** Função de fallback para Edge Function */
  fallbackSend?: (input: SendTextMessageDTO) => Promise<SendMessageResult>;
}

/**
 * Use case para enviar mensagens de texto
 */
export class SendTextMessageUseCase {
  constructor(private readonly config: SendTextMessageConfig) {}

  /**
   * Envia uma mensagem de texto
   * 
   * @param dto - Dados da mensagem a enviar
   * @returns Resultado do envio
   */
  async execute(dto: SendTextMessageDTO): Promise<SendMessageResult> {
    try {
      const clientMessageId = dto.clientMessageId ?? this.generateClientMessageId();

      // 1. Tentar enviar via WebSocket se disponível
      if (this.config.websocketClient?.isConnected()) {
        this.config.websocketClient.sendMessage({
          conversationId: dto.conversationId,
          content: dto.content,
          messageId: clientMessageId,
          replyToMessageId: dto.replyToId ?? undefined,
        });

        console.log('[SendTextMessage] Sent via WebSocket:', clientMessageId);
        return {
          success: true,
          messageId: clientMessageId,
        };
      }

      // 2. Fallback para Edge Function
      if (this.config.fallbackSend) {
        console.log('[SendTextMessage] Using fallback (Edge Function):', clientMessageId);
        return await this.config.fallbackSend({
          ...dto,
          clientMessageId,
        });
      }

      // 3. Nenhum método disponível
      throw new Error('No send method available (WebSocket disconnected and no fallback configured)');
    } catch (error) {
      console.error('[SendTextMessage] Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Gera um ID único para a mensagem do cliente
   */
  private generateClientMessageId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `client_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
