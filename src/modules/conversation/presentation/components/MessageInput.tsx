import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Smile, Mic, Trash2, X, Reply, Paperclip, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Message } from '@/core/domain/entities/Message';
import { useSendMessage } from '@/modules/conversation/presentation/hooks/useSendMessage';
import { AudioPlayer } from './AudioPlayer';
import { createVideoThumbnail, getMediaCategory, getMediaDurationMs } from '@/lib/media-utils';
import { emitChatDebug } from '@/lib/chat-debug';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: () => void;
  replyingTo?: Message | null;
  onClearReply?: () => void;
}

interface AttachmentPreview {
  file: File;
  type: 'image' | 'video' | 'audio';
  previewUrl: string;
  thumbnailUrl?: string | null;
  thumbnailBlob?: Blob | null;
  durationMs?: number | null;
}

const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 25;
const MAX_AUDIO_SIZE_MB = 16;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm'];

export function MessageInput({ 
  conversationId, 
  disabled, 
  onMessageSent,
  replyingTo,
  onClearReply 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, sendMediaMessage } = useSendMessage();
  
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecorder();

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);



  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const revokeAttachmentPreview = useCallback((current: AttachmentPreview | null) => {
    if (!current) return;
    URL.revokeObjectURL(current.previewUrl);
    if (current.thumbnailUrl) {
      URL.revokeObjectURL(current.thumbnailUrl);
    }
  }, []);

  const clearAttachment = useCallback(() => {
    revokeAttachmentPreview(attachment);
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachment, revokeAttachmentPreview]);

  useEffect(() => {
    clearAttachment();
    setMessage('');
  }, [conversationId, clearAttachment]);

  useEffect(() => {
    return () => {
      revokeAttachmentPreview(attachment);
    };
  }, [attachment, revokeAttachmentPreview]);

  // Handle file selection (image/video/audio)
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const category = getMediaCategory(file);
    if (!category) {
      toast.error('Tipo de arquivo não suportado.');
      return;
    }
    emitChatDebug('media:select', { type: category, name: file.name, size: file.size, mime: file.type });

    const sizeMB = file.size / (1024 * 1024);
    if (category === 'image' && (!ALLOWED_IMAGE_TYPES.includes(file.type) || sizeMB > MAX_IMAGE_SIZE_MB)) {
      toast.error(`Imagem inválida. Máximo: ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    if (category === 'video' && (!ALLOWED_VIDEO_TYPES.includes(file.type) || sizeMB > MAX_VIDEO_SIZE_MB)) {
      toast.error(`Vídeo inválido. Máximo: ${MAX_VIDEO_SIZE_MB}MB`);
      return;
    }
    if (category === 'audio' && (!ALLOWED_AUDIO_TYPES.includes(file.type) || sizeMB > MAX_AUDIO_SIZE_MB)) {
      toast.error(`Áudio inválido. Máximo: ${MAX_AUDIO_SIZE_MB}MB`);
      return;
    }

    revokeAttachmentPreview(attachment);

    const previewUrl = URL.createObjectURL(file);
    const durationMs = await getMediaDurationMs(file);
    let thumbnailBlob: Blob | null = null;
    let thumbnailUrl: string | null = null;

    if (category === 'video') {
      thumbnailBlob = await createVideoThumbnail(file);
      if (thumbnailBlob) {
        thumbnailUrl = URL.createObjectURL(thumbnailBlob);
      }
    }

    setAttachment({
      file,
      type: category,
      previewUrl,
      thumbnailUrl,
      thumbnailBlob,
      durationMs,
    });
  }, [attachment, revokeAttachmentPreview]);

  const handleSendText = useCallback(async () => {
    const text = message.trim();
    if (!text) return;

    console.log('[WA_SEND]', { conversationId, replyToId: replyingTo?.id });
    
    // 1. Limpar input IMEDIATAMENTE para permitir próxima digitação
    setMessage('');
    
    // 2. Limpar reply IMEDIATAMENTE
    onClearReply?.();
    emitChatDebug('reply:clear', { conversationId });
    
    // 3. Manter foco no textarea para continuar digitando
    textareaRef.current?.focus();
    
    // 4. Enviar em background (não bloqueia - usa optimistic updates)
    // O sendMessage já adiciona a mensagem otimista antes de enviar
    emitChatDebug('reply:send', { conversationId, replyToId: replyingTo?.id ?? null });
    const result = await sendMessage({
      conversationId,
      message: text,
      replyToId: replyingTo?.id,
      quotedMessage: replyingTo
        ? {
            id: replyingTo.id,
            body: replyingTo.body,
            type: replyingTo.type.getValue(),
            isOutgoing: replyingTo.isOutgoing,
            mediaUrl: replyingTo.mediaUrl,
            thumbnailUrl: replyingTo.thumbnailUrl,
          }
        : null,
    });

    // 5. Se falhou na criação da mensagem otimista (ex: mensagem vazia), mostrar erro
    if (!result.success) {
      const errorResult = result as { success: false; error: Error; clientMessageId: string };
      console.error('[WA_SEND] error', errorResult.error);
      // Erro já será exibido na UI via status 'failed' da mensagem
    }
    
    // Callback opcional
    onMessageSent?.();
  }, [message, conversationId, replyingTo?.id, onClearReply, sendMessage, onMessageSent]);

  const handleSendAttachment = useCallback(() => {
    if (!attachment) return;

    const current = attachment;
    clearAttachment();
    setMessage('');
    onClearReply?.();
    emitChatDebug('reply:clear', { conversationId });
    textareaRef.current?.focus();
    onMessageSent?.();

    emitChatDebug('media:upload:start', { conversationId, type: current.type, name: current.file.name });
    void sendMediaMessage({
      conversationId,
      file: current.file,
      mediaType: current.type,
      caption: message.trim() || undefined,
      replyToId: replyingTo?.id,
      quotedMessage: replyingTo
        ? {
            id: replyingTo.id,
            body: replyingTo.body,
            type: replyingTo.type.getValue(),
            isOutgoing: replyingTo.isOutgoing,
            mediaUrl: replyingTo.mediaUrl,
            thumbnailUrl: replyingTo.thumbnailUrl,
          }
        : null,
      durationMs: current.durationMs ?? undefined,
      thumbnailBlob: current.thumbnailBlob ?? undefined,
      thumbnailPreviewUrl: current.thumbnailUrl ?? current.previewUrl,
    }).catch((err) => {
      console.error('[WA_MEDIA] error', err);
    });
  }, [attachment, clearAttachment, message, conversationId, replyingTo, onClearReply, sendMediaMessage]);

  const handleSend = useCallback(() => {
    if (attachment) {
      handleSendAttachment();
    } else {
      handleSendText();
    }
  }, [attachment, handleSendAttachment, handleSendText]);

  const handleStartRecording = useCallback(async () => {
    console.log('[WA_AUDIO] start_recording');
    await startRecording();
  }, [startRecording]);

  const handleStopAndSend = useCallback(async () => {
    console.log('[WA_AUDIO] stop_and_send');
    try {
      const audioBlob = await stopRecording();
      
      if (!audioBlob || audioBlob.size === 0) {
        toast.error('Erro ao gravar áudio');
        return;
      }
      const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: audioBlob.type });
      const durationMs = await getMediaDurationMs(audioBlob);

      console.log('[WA_AUDIO] sending', { 
        conversationId, 
        size: file.size,
        type: file.type 
      });

      onClearReply?.();
      emitChatDebug('reply:clear', { conversationId });
      setMessage('');
      onMessageSent?.();

      void sendMediaMessage({
        conversationId,
        file,
        mediaType: 'audio',
        caption: undefined,
        replyToId: replyingTo?.id,
        quotedMessage: replyingTo
          ? {
              id: replyingTo.id,
              body: replyingTo.body,
              type: replyingTo.type.getValue(),
              isOutgoing: replyingTo.isOutgoing,
              mediaUrl: replyingTo.mediaUrl,
              thumbnailUrl: replyingTo.thumbnailUrl,
            }
          : null,
        durationMs: durationMs ?? undefined,
        isVoiceNote: true,
        thumbnailPreviewUrl: null,
      }).catch((err) => {
        console.error('[WA_AUDIO] error', err);
        toast.error('Erro ao enviar áudio');
      });
    } catch (err: any) {
      console.error('[WA_AUDIO] error', err);
      toast.error('Erro ao enviar áudio');
    }
  }, [conversationId, stopRecording, sendMediaMessage, replyingTo, onClearReply]);

  const handleCancelRecording = useCallback(() => {
    console.log('[WA_AUDIO] cancel');
    cancelRecording();
  }, [cancelRecording]);

  const handleClearReply = useCallback(() => {
    onClearReply?.();
    emitChatDebug('reply:clear', { conversationId });
  }, [onClearReply, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = message.trim().length > 0;
  const canSend = hasText || !!attachment;

  // Show error if recording failed
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  // Recording UI
  if (isRecording) {
    return (
      <div className="chat-input-container">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancelRecording}
          className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-foreground">
            {formatDuration(duration)}
          </span>
          <span className="text-sm text-muted-foreground">Gravando...</span>
        </div>

        <Button
          size="icon"
          onClick={handleStopAndSend}
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-l-4 border-primary">
          <Reply className="h-4 w-4 text-primary flex-shrink-0" />
          {(replyingTo.type.isImage() || replyingTo.type.isVideo()) && (replyingTo.thumbnailUrl || replyingTo.mediaUrl) && (
            <img
              src={replyingTo.thumbnailUrl || replyingTo.mediaUrl || undefined}
              alt="Preview"
              className="h-10 w-10 rounded object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">
              {replyingTo.isOutgoing ? 'Você' : 'Contato'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.body || replyingTo.getPreview()}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClearReply}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative inline-flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            {attachment.type === 'image' && (
              <img
                src={attachment.previewUrl}
                alt="Preview"
                className="h-20 w-auto rounded-lg object-cover"
              />
            )}
            {attachment.type === 'video' && (
              <div className="relative">
                <img
                  src={attachment.thumbnailUrl || attachment.previewUrl}
                  alt="Preview"
                  className="h-20 w-auto rounded-lg object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="h-6 w-6 text-white drop-shadow" />
                </div>
              </div>
            )}
            {attachment.type === 'audio' && (
              <AudioPlayer src={attachment.previewUrl} />
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={clearAttachment}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="chat-input-container">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Adicione uma legenda..." : "Digite uma mensagem..."}
          disabled={disabled}
          className="min-h-[44px] max-h-[120px] resize-none flex-1"
          rows={1}
        />
        {canSend ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || !canSend}
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleStartRecording}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
