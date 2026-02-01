import type { Result } from '@/core/either';
import type { AppError } from '@/core/errors';

export interface SendTextInput {
  conversationId: string;
  message: string;
  clientMessageId: string;
  replyToId?: string;
}

export interface SendMediaInput {
  conversationId: string;
  mediaBase64: string;
  mimeType: string;
  caption?: string;
  clientMessageId: string;
}

export interface SendAudioInput {
  conversationId: string;
  audioBase64: string;
  clientMessageId: string;
}

export interface SendResult {
  messageId: string;
  externalId?: string;
}

export interface IWhatsAppProvider {
  sendText(input: SendTextInput): Promise<Result<SendResult, AppError>>;
  sendImage(input: SendMediaInput): Promise<Result<SendResult, AppError>>;
  sendVideo(input: SendMediaInput): Promise<Result<SendResult, AppError>>;
  sendAudio(input: SendAudioInput): Promise<Result<SendResult, AppError>>;
}
