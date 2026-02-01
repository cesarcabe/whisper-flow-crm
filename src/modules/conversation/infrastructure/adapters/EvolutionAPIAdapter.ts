import { supabase } from '@/integrations/supabase/client';
import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import type {
  IWhatsAppProvider,
  SendTextInput,
  SendMediaInput,
  SendAudioInput,
  SendResult,
} from '@/modules/conversation/application/ports/IWhatsAppProvider';

export class EvolutionAPIAdapter implements IWhatsAppProvider {
  async sendText(input: SendTextInput): Promise<Result<SendResult, AppError>> {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: input.conversationId,
          message: input.message,
          clientMessageId: input.clientMessageId,
          replyToId: input.replyToId,
        },
      });

      if (error) {
        return failure(new InfrastructureError('Failed to send text message', error));
      }

      if (!data?.ok) {
        return failure(new InfrastructureError(data?.message || 'Failed to send text message'));
      }

      return success({
        messageId: input.clientMessageId,
        externalId: data.externalId,
      });
    } catch (err) {
      return failure(new InfrastructureError('Unexpected error sending text message', err));
    }
  }

  async sendImage(input: SendMediaInput): Promise<Result<SendResult, AppError>> {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send-image', {
        body: {
          conversationId: input.conversationId,
          imageBase64: input.mediaBase64,
          mimeType: input.mimeType,
          caption: input.caption,
          clientMessageId: input.clientMessageId,
        },
      });

      if (error) {
        return failure(new InfrastructureError('Failed to send image', error));
      }

      if (!data?.ok) {
        return failure(new InfrastructureError(data?.message || 'Failed to send image'));
      }

      return success({
        messageId: input.clientMessageId,
        externalId: data.externalId,
      });
    } catch (err) {
      return failure(new InfrastructureError('Unexpected error sending image', err));
    }
  }

  async sendVideo(input: SendMediaInput): Promise<Result<SendResult, AppError>> {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send-video', {
        body: {
          conversationId: input.conversationId,
          videoBase64: input.mediaBase64,
          mimeType: input.mimeType,
          caption: input.caption,
          clientMessageId: input.clientMessageId,
        },
      });

      if (error) {
        return failure(new InfrastructureError('Failed to send video', error));
      }

      if (!data?.ok) {
        return failure(new InfrastructureError(data?.message || 'Failed to send video'));
      }

      return success({
        messageId: input.clientMessageId,
        externalId: data.externalId,
      });
    } catch (err) {
      return failure(new InfrastructureError('Unexpected error sending video', err));
    }
  }

  async sendAudio(input: SendAudioInput): Promise<Result<SendResult, AppError>> {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send-audio', {
        body: {
          conversationId: input.conversationId,
          audioBase64: input.audioBase64,
          clientMessageId: input.clientMessageId,
        },
      });

      if (error) {
        return failure(new InfrastructureError('Failed to send audio', error));
      }

      if (!data?.ok) {
        return failure(new InfrastructureError(data?.message || 'Failed to send audio'));
      }

      return success({
        messageId: input.clientMessageId,
        externalId: data.externalId,
      });
    } catch (err) {
      return failure(new InfrastructureError('Unexpected error sending audio', err));
    }
  }
}
