import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversation } from '../contexts/ConversationContext';

/**
 * Hook for sending messages through ConversationService
 * 
 * Features:
 * - Uses ChatEngine for sending when enabled
 * - Supports FormData file upload for attachments
 * - Falls back to edge functions when ChatEngine not configured
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
   * Send a file using FormData upload (ChatEngine) or base64 (fallback)
   * This is the recommended approach for file uploads
   */
  const sendFile = useCallback(async (
    file: File,
    caption?: string,
    replyToId?: string
  ): Promise<boolean> => {
    if (!file || sending) return false;

    setSending(true);
    console.log('[useSendMessage] sendFile', { 
      conversationId, 
      chatEngine: isChatEngineEnabled,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    try {
      if (isChatEngineEnabled && service) {
        // Use ChatEngine FormData upload
        console.log('[useSendMessage] Uploading via ChatEngine FormData');
        
        // Step 1: Upload the file
        const uploadResult = await service.uploadAttachment(file, conversationId, caption);
        if (!uploadResult.success) {
          const errorResult = uploadResult as { success: false; error: Error };
          console.error('[useSendMessage] Upload failed:', errorResult.error);
          throw errorResult.error;
        }

        // Step 2: Send message with attachment
        const sendResult = await service.sendAttachmentMessage(
          conversationId,
          uploadResult.data.attachmentId,
          caption,
          replyToId
        );
        
        if (!sendResult.success) {
          const errorResult = sendResult as { success: false; error: Error };
          console.error('[useSendMessage] Send attachment message failed:', errorResult.error);
          throw errorResult.error;
        }

        console.log('[useSendMessage] file sent via ChatEngine FormData');
        return true;
      }

      // Fallback to base64 edge function
      console.log('[useSendMessage] Converting to base64 for edge function fallback');
      const base64 = await fileToBase64(file);
      const mimeType = file.type;

      // Determine which edge function to use based on file type
      if (mimeType.startsWith('image/')) {
        const { data, error } = await supabase.functions.invoke('whatsapp-send-image', {
          body: {
            conversationId,
            imageBase64: base64,
            mimeType,
            caption,
          },
        });

        if (error) throw new Error(error.message || 'Erro ao enviar imagem');
        if (!data?.ok) throw new Error(data?.message || 'Erro ao enviar imagem');
      } else if (mimeType.startsWith('audio/')) {
        const { data, error } = await supabase.functions.invoke('whatsapp-send-audio', {
          body: {
            conversationId,
            audioBase64: base64,
            mimeType,
          },
        });

        if (error) throw new Error(error.message || 'Erro ao enviar áudio');
        if (!data?.ok) throw new Error(data?.message || 'Erro ao enviar áudio');
      } else {
        throw new Error('Tipo de arquivo não suportado');
      }

      console.log('[useSendMessage] file sent via edge function');
      return true;
    } catch (err) {
      console.error('[useSendMessage] sendFile failed:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, service, isChatEngineEnabled, sending]);

  /**
   * Send an image message (convenience method)
   * Uses sendFile internally with base64 fallback support
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
        // Convert base64 to File for ChatEngine FormData upload
        const file = base64ToFile(imageBase64, mimeType, 'image');
        
        // Use FormData upload
        const uploadResult = await service.uploadAttachment(file, conversationId, caption);
        if (!uploadResult.success) {
          throw (uploadResult as { success: false; error: Error }).error;
        }

        const sendResult = await service.sendAttachmentMessage(
          conversationId,
          uploadResult.data.attachmentId,
          caption
        );
        
        if (!sendResult.success) {
          throw (sendResult as { success: false; error: Error }).error;
        }

        console.log('[useSendMessage] image sent via ChatEngine FormData');
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
   * Send an audio message (convenience method)
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
        // Convert base64 to File for ChatEngine FormData upload
        const file = base64ToFile(audioBase64, mimeType, 'audio');
        
        // Use FormData upload
        const uploadResult = await service.uploadAttachment(file, conversationId);
        if (!uploadResult.success) {
          throw (uploadResult as { success: false; error: Error }).error;
        }

        const sendResult = await service.sendAttachmentMessage(
          conversationId,
          uploadResult.data.attachmentId
        );
        
        if (!sendResult.success) {
          throw (sendResult as { success: false; error: Error }).error;
        }

        console.log('[useSendMessage] audio sent via ChatEngine FormData');
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
    sendFile,
    sendImage,
    sendAudio,
    sending,
    isChatEngineEnabled,
  };
}

// ==================== Utility Functions ====================

/**
 * Convert File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 string to File
 */
function base64ToFile(base64: string, mimeType: string, prefix: string): File {
  // Decode base64
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Generate filename
  const extension = mimeType.split('/')[1] || 'bin';
  const filename = `${prefix}_${Date.now()}.${extension}`;
  
  return new File([blob], filename, { type: mimeType });
}
