import type { MessageTypeValue } from '@/core/domain/value-objects/MessageType';

export interface CreateMessageDTO {
  conversationId: string;
  content: string;
  type: MessageTypeValue;
  replyToId?: string | null;
  clientMessageId?: string;
  mediaBase64?: string;
  mimeType?: string;
}
