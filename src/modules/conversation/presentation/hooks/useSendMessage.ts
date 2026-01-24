/**
 * useSendMessage - Hook para envio de mensagens
 * 
 * Permite envio de múltiplas mensagens em paralelo sem bloqueio.
 * Usa optimistic updates para feedback instantâneo na UI.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimisticMessages, createClientMessageId } from './useOptimisticMessages';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { uploadMediaFile, buildMediaPath } from '@/lib/media-utils';
import { emitChatDebug } from '@/lib/chat-debug';

interface SendMessageInput {
  conversationId: string;
  message: string;
  replyToId?: string | null;
  quotedMessage?: {
    id: string;
    body: string;
    type: string;
    isOutgoing: boolean;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
  /** ID do cliente (gerado automaticamente se não fornecido) */
  clientMessageId?: string;
}

interface SendMediaInput {
  conversationId: string;
  file: File;
  mediaType: 'image' | 'video' | 'audio';
  caption?: string;
  replyToId?: string | null;
  quotedMessage?: SendMessageInput['quotedMessage'];
  clientMessageId?: string;
  isVoiceNote?: boolean;
  durationMs?: number | null;
  thumbnailBlob?: Blob | null;
  thumbnailPreviewUrl?: string | null;
}

type SendMessageResult = 
  | { success: true; clientMessageId: string } 
  | { success: false; error: Error; clientMessageId: string };

interface UseSendMessageReturn {
  /**
   * Envia uma mensagem de texto.
   * NÃO bloqueia - múltiplas mensagens podem ser enviadas em paralelo.
   * A mensagem aparece imediatamente na UI com status 'sending'.
   */
  sendMessage: (input: SendMessageInput) => Promise<SendMessageResult>;

  /**
   * Envia uma mensagem de mídia (imagem/vídeo/áudio).
   * Faz upload com progresso e otimistic UI.
   */
  sendMediaMessage: (input: SendMediaInput) => Promise<SendMessageResult>;
  
  /**
   * Reenvia uma mensagem que falhou.
   * @param clientMessageId - ID do cliente da mensagem que falhou
   */
  retrySend: (clientMessageId: string) => Promise<SendMessageResult | null>;
  
  /**
   * Hook de mensagens otimistas (para acesso direto se necessário)
   */
  optimistic: ReturnType<typeof useOptimisticMessages>;
}

export function useSendMessage(): UseSendMessageReturn {
  const optimistic = useOptimisticMessages();
  const { workspaceId } = useWorkspace();

  /**
   * Executa o envio real da mensagem via Edge Function (webhook)
   */
  const executeRealSend = useCallback(async (
    conversationId: string,
    content: string,
    clientMessageId: string,
    replyToId?: string | null,
    quotedMessage?: SendMessageInput['quotedMessage']
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId,
          message: content,
          clientMessageId,
          replyToId: replyToId ?? undefined,
          quotedMessage: quotedMessage ?? undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar mensagem');
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err : new Error('Erro ao enviar mensagem') 
      };
    }
  }, []);

  const sendMessage = useCallback(async (input: SendMessageInput): Promise<SendMessageResult> => {
    const clientMessageId = input.clientMessageId ?? createClientMessageId();
    const content = input.message.trim();

    if (!content) {
      return {
        success: false,
        error: new Error('Mensagem vazia'),
        clientMessageId,
      };
    }

    // 1. Adicionar mensagem otimista IMEDIATAMENTE (antes de enviar)
    optimistic.addOptimisticMessage({
      clientId: clientMessageId,
      conversationId: input.conversationId,
      content,
      type: 'text',
      mediaType: null,
      replyToId: input.replyToId,
      quotedMessage: input.quotedMessage ?? null,
    });

    // 2. Enviar em background (não bloqueia)
    // Não usamos await aqui para não travar - fire and forget com tratamento
    executeRealSend(
      input.conversationId,
      content,
      clientMessageId,
      input.replyToId,
      input.quotedMessage ?? undefined
    ).then(result => {
      if (result.success) {
        // Marcar como enviada - será removida quando a mensagem real chegar
        optimistic.confirmMessage(clientMessageId);
      } else {
        // Marcar como falha
        optimistic.failMessage(clientMessageId, result.error?.message || 'Erro ao enviar');
      }
    }).catch(err => {
      optimistic.failMessage(clientMessageId, err.message || 'Erro ao enviar');
    });

    // 3. Retornar sucesso imediato (optimistic)
    return {
      success: true,
      clientMessageId,
    };
  }, [optimistic, executeRealSend]);

  const sendMediaMessage = useCallback(async (input: SendMediaInput): Promise<SendMessageResult> => {
    if (!workspaceId) {
      return { success: false, error: new Error('Workspace não definido'), clientMessageId: input.clientMessageId ?? 'unknown' };
    }

    const clientMessageId = input.clientMessageId ?? createClientMessageId();
    const caption = input.caption?.trim() ?? '';

    const fallbackBody = input.mediaType === 'image'
      ? '📷 Imagem'
      : input.mediaType === 'video'
      ? '🎬 Vídeo'
      : '🎤 Áudio';

    // 1) Mensagem otimista imediata
    optimistic.addOptimisticMessage({
      clientId: clientMessageId,
      conversationId: input.conversationId,
      content: caption || fallbackBody,
      type: input.mediaType,
      mediaType: input.mediaType,
      mediaUrl: input.thumbnailPreviewUrl ?? null,
      thumbnailUrl: input.thumbnailPreviewUrl ?? null,
      mimeType: input.file.type || null,
      sizeBytes: input.file.size,
      durationMs: input.durationMs ?? null,
      replyToId: input.replyToId,
      quotedMessage: input.quotedMessage ?? null,
      file: input.file,
      uploadProgress: 0,
    });

    try {
      const storagePath = buildMediaPath({
        workspaceId,
        conversationId: input.conversationId,
        clientMessageId,
        filename: input.file.name,
      });

      // 2) Upload com progresso
      const uploadResult = await uploadMediaFile({
        bucket: 'media',
        path: storagePath,
        file: input.file,
        onProgress: (progress) => {
          optimistic.updateProgress(clientMessageId, progress);
          emitChatDebug('media:upload:progress', { clientMessageId, progress });
        },
      });
      optimistic.updateProgress(clientMessageId, 100);
      emitChatDebug('media:upload:success', { clientMessageId, path: uploadResult.path });

      let thumbnailUrl: string | null = null;
      let thumbnailPath: string | null = null;
      if (input.thumbnailBlob) {
        const thumbPath = buildMediaPath({
          workspaceId,
          conversationId: input.conversationId,
          clientMessageId,
          filename: `thumb-${input.file.name.replace(/\s+/g, '-')}.jpg`,
        });
        const thumbUpload = await uploadMediaFile({
          bucket: 'media',
          path: thumbPath,
          file: new File([input.thumbnailBlob], `thumb-${input.file.name}.jpg`, { type: 'image/jpeg' }),
        });
        thumbnailPath = thumbUpload.path;
      }

      optimistic.updateMediaMeta(clientMessageId, {
        mediaUrl: input.thumbnailPreviewUrl ?? null,
        thumbnailUrl: input.thumbnailPreviewUrl ?? null,
        mimeType: input.file.type || null,
        sizeBytes: input.file.size,
        durationMs: input.durationMs ?? null,
        storagePath: uploadResult.path,
        thumbnailPath,
      });

      // 3) Enviar via Edge Function (não bloqueia UI)
      const { data, error } = await supabase.functions.invoke('whatsapp-send-media', {
        body: {
          conversationId: input.conversationId,
          clientMessageId,
          mediaType: input.mediaType,
          caption: caption || undefined,
          storagePath: uploadResult.path,
          thumbnailPath,
          mimeType: input.file.type || undefined,
          sizeBytes: input.file.size,
          durationMs: input.durationMs ?? undefined,
          thumbnailUrl: null,
          replyToId: input.replyToId ?? undefined,
          quotedMessage: input.quotedMessage ?? undefined,
          isVoiceNote: input.isVoiceNote ?? false,
        },
      });

      if (error || !data?.ok) {
        const message = data?.message || error?.message || 'Erro ao enviar mídia';
        optimistic.failMessage(clientMessageId, message);
        emitChatDebug('media:send:error', { clientMessageId, message });
        return { success: false, error: new Error(message), clientMessageId };
      }

      optimistic.confirmMessage(clientMessageId);
      emitChatDebug('media:send:success', { clientMessageId, messageId: data?.messageId, externalId: data?.externalId });
      return { success: true, clientMessageId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao enviar mídia');
      optimistic.failMessage(clientMessageId, error.message);
      emitChatDebug('media:upload:error', { clientMessageId, message: error.message });
      return { success: false, error, clientMessageId };
    }
  }, [workspaceId, optimistic]);

  const retrySend = useCallback(async (clientMessageId: string): Promise<SendMessageResult | null> => {
    const message = optimistic.retryMessage(clientMessageId);
    if (!message) {
      return null;
    }

    if (message.type === 'text') {
      const result = await executeRealSend(
        message.conversationId,
        message.content,
        message.clientId,
        message.replyToId
      );

      if (result.success) {
        optimistic.confirmMessage(clientMessageId);
        return { success: true, clientMessageId };
      } else {
        optimistic.failMessage(clientMessageId, result.error?.message || 'Erro ao reenviar');
        return { 
          success: false, 
          error: result.error || new Error('Erro ao reenviar'), 
          clientMessageId 
        };
      }
    }

    if (!message.file && !message.storagePath) {
      optimistic.failMessage(clientMessageId, 'Arquivo não disponível para reenvio');
      return { success: false, error: new Error('Arquivo não disponível para reenvio'), clientMessageId };
    }

    const file = message.file;
    if (!file && message.storagePath && message.mediaUrl) {
      // Reenvio sem novo upload (já temos storagePath e URL)
      const { data, error } = await supabase.functions.invoke('whatsapp-send-media', {
        body: {
          conversationId: message.conversationId,
          clientMessageId,
          mediaType: message.mediaType ?? message.type,
          caption: message.content,
          mediaUrl: message.mediaUrl,
          storagePath: message.storagePath,
          mimeType: message.mimeType ?? undefined,
          sizeBytes: message.sizeBytes ?? undefined,
          durationMs: message.durationMs ?? undefined,
          thumbnailUrl: message.thumbnailUrl ?? undefined,
          replyToId: message.replyToId ?? undefined,
          quotedMessage: message.quotedMessage ?? undefined,
          isVoiceNote: false,
        },
      });

      if (error || !data?.ok) {
        optimistic.failMessage(clientMessageId, data?.message || error?.message || 'Erro ao reenviar mídia');
        return { success: false, error: new Error(data?.message || error?.message || 'Erro ao reenviar mídia'), clientMessageId };
      }

      optimistic.confirmMessage(clientMessageId);
      return { success: true, clientMessageId };
    }

    if (!file) {
      optimistic.failMessage(clientMessageId, 'Arquivo não disponível para reenvio');
      return { success: false, error: new Error('Arquivo não disponível para reenvio'), clientMessageId };
    }

    return sendMediaMessage({
      conversationId: message.conversationId,
      file,
      mediaType: (message.mediaType ?? message.type) as 'image' | 'video' | 'audio',
      caption: message.content,
      replyToId: message.replyToId,
      quotedMessage: message.quotedMessage ?? undefined,
      clientMessageId,
      durationMs: message.durationMs ?? undefined,
    });
  }, [optimistic, executeRealSend, sendMediaMessage]);

  return {
    sendMessage,
    sendMediaMessage,
    retrySend,
    optimistic,
  };
}
