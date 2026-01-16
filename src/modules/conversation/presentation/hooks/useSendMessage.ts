import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversation } from '../contexts/ConversationContext';

/**
 * Hook for sending messages through ConversationService
 * Automatically falls back to edge functions when ChatEngine is not configured
 */
export function useSendMessage(conversationId: string) {
  const { service, isChatEngineEnabled } = useConversation();
  const [sending, setSending] = useState(false);

  /**
   * Send a text message
   */
  const sendText = useCallback(async (
    body: string,
    replyToId?: string
  ): Promise<boolean> => {
    if (!body.trim() || sending) return false;
    
    setSending(true);
    console.log('[useSendMessage] sendText', { 
      conversationId, 
      chatEngine: isChatEngineEnabled,
      replyToId 
    });

    try {
      if (isChatEngineEnabled && service) {
        // Use ChatEngine via ConversationService
        const result = await service.sendTextMessage(conversationId, body, replyToId);
        if (result.success === false) {
          console.error('[useSendMessage] ChatEngine error:', result.error);
          throw result.error;
        }
        console.log('[useSendMessage] sent via ChatEngine');
        return true;
      }

      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId,
          message: body,
          replyToId,
        },
      });

      if (error) {
        console.error('[useSendMessage] edge function error:', error);
        throw new Error(error.message || 'Erro ao enviar mensagem');
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar mensagem');
      }

      console.log('[useSendMessage] sent via edge function');
      return true;
    } catch (err) {
      console.error('[useSendMessage] sendText failed:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, service, isChatEngineEnabled, sending]);

  /**
   * Send an image message
   */
  const sendImage = useCallback(async (
    imageBase64: string,
    mimeType: string,
    caption?: string
  ): Promise<boolean> => {
    if (!imageBase64 || sending) return false;

    setSending(true);
    console.log('[useSendMessage] sendImage', { 
      conversationId, 
      chatEngine: isChatEngineEnabled,
      mimeType 
    });

    try {
      if (isChatEngineEnabled && service) {
        // Use ChatEngine via ConversationService
        const result = await service.sendImageMessage(
          conversationId,
          imageBase64,
          mimeType,
          caption
        );
        if (result.success === false) {
          console.error('[useSendMessage] ChatEngine image error:', result.error);
          throw result.error;
        }
        console.log('[useSendMessage] image sent via ChatEngine');
        return true;
      }

      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('whatsapp-send-image', {
        body: {
          conversationId,
          imageBase64,
          mimeType,
          caption,
        },
      });

      if (error) {
        console.error('[useSendMessage] edge function image error:', error);
        throw new Error(error.message || 'Erro ao enviar imagem');
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar imagem');
      }

      console.log('[useSendMessage] image sent via edge function');
      return true;
    } catch (err) {
      console.error('[useSendMessage] sendImage failed:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, service, isChatEngineEnabled, sending]);

  /**
   * Send an audio message
   */
  const sendAudio = useCallback(async (
    audioBase64: string,
    mimeType: string
  ): Promise<boolean> => {
    if (!audioBase64 || sending) return false;

    setSending(true);
    console.log('[useSendMessage] sendAudio', { 
      conversationId, 
      chatEngine: isChatEngineEnabled,
      mimeType 
    });

    try {
      if (isChatEngineEnabled && service) {
        // Use ChatEngine via ConversationService
        const result = await service.sendAudioMessage(
          conversationId,
          audioBase64,
          mimeType
        );
        if (result.success === false) {
          console.error('[useSendMessage] ChatEngine audio error:', result.error);
          throw result.error;
        }
        console.log('[useSendMessage] audio sent via ChatEngine');
        return true;
      }

      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('whatsapp-send-audio', {
        body: {
          conversationId,
          audioBase64,
          mimeType,
        },
      });

      if (error) {
        console.error('[useSendMessage] edge function audio error:', error);
        throw new Error(error.message || 'Erro ao enviar áudio');
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar áudio');
      }

      console.log('[useSendMessage] audio sent via edge function');
      return true;
    } catch (err) {
      console.error('[useSendMessage] sendAudio failed:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, service, isChatEngineEnabled, sending]);

  return {
    sendText,
    sendImage,
    sendAudio,
    sending,
    isChatEngineEnabled,
  };
}
