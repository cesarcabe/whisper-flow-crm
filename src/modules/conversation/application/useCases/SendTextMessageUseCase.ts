import { success, failure, isFailure } from '@/core/either';
import type { Result } from '@/core/either';
import { ValidationError, InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import type { IWhatsAppProvider } from '../ports/IWhatsAppProvider';

export interface SendTextMessageDTO {
  conversationId: string;
  content: string;
  replyToId?: string | null;
  clientMessageId?: string;
}

export interface SendMessageResult {
  messageId: string;
  externalId?: string;
}

export interface SendTextMessageConfig {
  whatsAppProvider: IWhatsAppProvider;
  websocketClient?: {
    isConnected: () => boolean;
    sendMessage: (input: {
      conversationId: string;
      content: string;
      messageId?: string;
      replyToMessageId?: string;
    }) => void;
  };
}

export class SendTextMessageUseCase {
  constructor(private readonly config: SendTextMessageConfig) {}

  async execute(dto: SendTextMessageDTO): Promise<Result<SendMessageResult, AppError>> {
    const clientMessageId = dto.clientMessageId ?? this.generateClientMessageId();
    const content = dto.content.trim();

    if (!content) {
      return failure(new ValidationError('Message content cannot be empty', 'content'));
    }

    if (!dto.conversationId) {
      return failure(new ValidationError('Conversation ID is required', 'conversationId'));
    }

    // 1. Try WebSocket first (faster, real-time)
    if (this.config.websocketClient?.isConnected()) {
      try {
        this.config.websocketClient.sendMessage({
          conversationId: dto.conversationId,
          content,
          messageId: clientMessageId,
          replyToMessageId: dto.replyToId ?? undefined,
        });

        return success({ messageId: clientMessageId });
      } catch (err) {
        // Fall through to provider
      }
    }

    // 2. Fallback to WhatsApp provider (Edge Function)
    const result = await this.config.whatsAppProvider.sendText({
      conversationId: dto.conversationId,
      message: content,
      clientMessageId,
      replyToId: dto.replyToId ?? undefined,
    });

    if (isFailure(result)) {
      return failure(new InfrastructureError(result.error.message, result.error));
    }

    return success({
      messageId: result.value.messageId,
      externalId: result.value.externalId,
    });
  }

  private generateClientMessageId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `client_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
