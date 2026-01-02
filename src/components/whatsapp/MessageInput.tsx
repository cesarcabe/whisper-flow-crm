import { useState, useCallback } from 'react';
import { Send, Loader2, Smile, Paperclip, Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: () => void;
}

export function MessageInput({ conversationId, disabled, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecorder();

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = useCallback(async () => {
    const text = message.trim();
    if (!text || sending) return;

    console.log('[WA_SEND]', { conversationId });
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId,
          message: text,
        },
      });

      if (error) {
        console.error('[WA_SEND] error', error);
        toast.error('Erro ao enviar mensagem');
        return;
      }

      if (!data?.ok) {
        toast.error(data?.message || 'Erro ao enviar mensagem');
        return;
      }

      setMessage('');
      onMessageSent?.();
    } catch (err: any) {
      console.error('[WA_SEND] error', err);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  }, [message, conversationId, sending, onMessageSent]);

  const handleStartRecording = useCallback(async () => {
    console.log('[WA_AUDIO] start_recording');
    await startRecording();
  }, [startRecording]);

  const handleStopAndSend = useCallback(async () => {
    console.log('[WA_AUDIO] stop_and_send');
    setSending(true);

    try {
      const audioBlob = await stopRecording();
      
      if (!audioBlob || audioBlob.size === 0) {
        toast.error('Erro ao gravar áudio');
        setSending(false);
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (e.g., "data:audio/webm;base64,")
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
      onMessageSent?.();
    } catch (err: any) {
      console.error('[WA_AUDIO] error', err);
      toast.error('Erro ao enviar áudio');
    } finally {
      setSending(false);
    }
  }, [conversationId, stopRecording, onMessageSent]);

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

  // Show error if recording failed
  if (recordingError) {
    toast.error(recordingError);
  }

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
          disabled={sending}
          className="h-10 w-10 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="chat-input-container">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
        disabled={disabled || sending}
      >
        <Smile className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
        disabled={disabled || sending}
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem..."
        disabled={disabled || sending}
        className="min-h-[44px] max-h-[120px] resize-none flex-1"
        rows={1}
      />
      {hasText || sending ? (
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || sending || !hasText}
          className="h-10 w-10 shrink-0"
        >
          {sending ? (
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
  );
}
