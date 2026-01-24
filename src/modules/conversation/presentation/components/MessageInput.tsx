import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2, Smile, Image, Mic, Trash2, X, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';
import { Message } from '@/core/domain/entities/Message';
import { useSendMessage } from '@/modules/conversation/presentation/hooks/useSendMessage';
import { ReactionPicker } from './ReactionPicker';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: () => void;
  replyingTo?: Message | null;
  onClearReply?: () => void;
}

const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function MessageInput({ 
  conversationId, 
  disabled, 
  onMessageSent,
  replyingTo,
  onClearReply 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useSendMessage();
  // isSendingMedia só bloqueia durante envio de mídia (imagem/áudio)
  // Mensagens de texto NÃO bloqueiam - usamos optimistic updates
  const isSending = isSendingMedia;
  
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

  // Handle image selection
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validate size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      toast.error(`Imagem muito grande. Máximo: ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  const handleSendText = useCallback(async () => {
    const text = message.trim();
    if (!text) return;

    console.log('[WA_SEND]', { conversationId, replyToId: replyingTo?.id });
    
    // 1. Limpar input IMEDIATAMENTE para permitir próxima digitação
    setMessage('');
    
    // 2. Limpar reply IMEDIATAMENTE
    onClearReply?.();
    
    // 3. Manter foco no textarea para continuar digitando
    textareaRef.current?.focus();
    
    // 4. Enviar em background (não bloqueia - usa optimistic updates)
    // O sendMessage já adiciona a mensagem otimista antes de enviar
    const result = await sendMessage({
      conversationId,
      message: text,
      replyToId: replyingTo?.id,
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

  const handleSendImage = useCallback(async () => {
    if (!selectedImage || isSendingMedia) return;

    console.log('[WA_IMAGE] sending', { conversationId, size: selectedImage.size });
    setIsSendingMedia(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedImage);

      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('whatsapp-send-image', {
        body: {
          conversationId,
          imageBase64,
          mimeType: selectedImage.type,
          caption: message.trim() || undefined,
        },
      });

      if (error) {
        console.error('[WA_IMAGE] error', error);
        toast.error('Erro ao enviar imagem');
        return;
      }

      if (!data?.ok) {
        toast.error(data?.message || 'Erro ao enviar imagem');
        return;
      }

      clearImage();
      setMessage('');
      onClearReply?.();
      // Realtime subscription handles adding new messages - no refetch needed
    } catch (err: any) {
      console.error('[WA_IMAGE] error', err);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsSendingMedia(false);
    }
  }, [selectedImage, conversationId, message, isSending, clearImage, onClearReply]);

  const handleSend = useCallback(() => {
    if (selectedImage) {
      handleSendImage();
    } else {
      handleSendText();
    }
  }, [selectedImage, handleSendImage, handleSendText]);

  const handleStartRecording = useCallback(async () => {
    console.log('[WA_AUDIO] start_recording');
    await startRecording();
  }, [startRecording]);

  const handleStopAndSend = useCallback(async () => {
    console.log('[WA_AUDIO] stop_and_send');
    setIsSendingMedia(true);

    try {
      const audioBlob = await stopRecording();
      
      if (!audioBlob || audioBlob.size === 0) {
        toast.error('Erro ao gravar áudio');
        setIsSendingMedia(false);
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);

      const audioBase64 = await base64Promise;

      console.log('[WA_AUDIO] sending', { 
        conversationId, 
        size: audioBlob.size,
        type: audioBlob.type 
      });

      const { data, error } = await supabase.functions.invoke('whatsapp-send-audio', {
        body: {
          conversationId,
          audioBase64,
          mimeType: audioBlob.type,
        },
      });

      if (error) {
        console.error('[WA_AUDIO] error', error);
        toast.error('Erro ao enviar áudio');
        return;
      }

      if (!data?.ok) {
        toast.error(data?.message || 'Erro ao enviar áudio');
        return;
      }

      console.log('[WA_AUDIO] sent', { messageId: data.messageId });
      // Realtime subscription handles adding new messages - no refetch needed
    } catch (err: any) {
      console.error('[WA_AUDIO] error', err);
      toast.error('Erro ao enviar áudio');
    } finally {
      setIsSendingMedia(false);
    }
  }, [conversationId, stopRecording]);

  const handleCancelRecording = useCallback(() => {
    console.log('[WA_AUDIO] cancel');
    cancelRecording();
  }, [cancelRecording]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = message.trim().length > 0;
  const canSend = hasText || selectedImage;

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
          disabled={isSending}
          className="h-10 w-10 shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
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
            onClick={onClearReply}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={clearImage}
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
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        <ReactionPicker 
          onSelect={(emoji) => setMessage(prev => prev + emoji)}
          side="top"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={disabled || isSendingMedia}
          >
            <Smile className="h-5 w-5" />
          </Button>
        </ReactionPicker>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled || isSendingMedia}
          onClick={() => imageInputRef.current?.click()}
        >
          <Image className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedImage ? "Adicione uma legenda..." : "Digite uma mensagem..."}
          disabled={disabled || isSendingMedia}
          className="min-h-[44px] max-h-[120px] resize-none flex-1"
          rows={1}
        />
        {canSend || isSendingMedia ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isSendingMedia || !canSend}
            className="h-10 w-10 shrink-0"
          >
            {isSendingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
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
