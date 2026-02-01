import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { ValidationError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import type { IWhatsAppProvider, SendResult } from '../ports/IWhatsAppProvider';

export type MediaType = 'image' | 'video' | 'audio';

export interface SendMediaMessageDTO {
  conversationId: string;
  mediaType: MediaType;
  mediaBase64: string;
  mimeType: string;
  caption?: string;
  clientMessageId?: string;
}

export class SendMediaMessageUseCase {
  constructor(private readonly whatsAppProvider: IWhatsAppProvider) {}

  async execute(dto: SendMediaMessageDTO): Promise<Result<SendResult, AppError>> {
    if (!dto.conversationId) {
      return failure(new ValidationError('Conversation ID is required', 'conversationId'));
    }

    if (!dto.mediaBase64) {
      return failure(new ValidationError('Media content is required', 'mediaBase64'));
    }

    const clientMessageId = dto.clientMessageId ?? crypto.randomUUID();

    switch (dto.mediaType) {
      case 'image':
        return this.whatsAppProvider.sendImage({
          conversationId: dto.conversationId,
          mediaBase64: dto.mediaBase64,
          mimeType: dto.mimeType,
          caption: dto.caption,
          clientMessageId,
        });

      case 'video':
        return this.whatsAppProvider.sendVideo({
          conversationId: dto.conversationId,
          mediaBase64: dto.mediaBase64,
          mimeType: dto.mimeType,
          caption: dto.caption,
          clientMessageId,
        });

      case 'audio':
        return this.whatsAppProvider.sendAudio({
          conversationId: dto.conversationId,
          audioBase64: dto.mediaBase64,
          clientMessageId,
        });

      default:
        return failure(new ValidationError(`Unsupported media type: ${dto.mediaType}`, 'mediaType'));
    }
  }
}
