import { useState, useCallback } from 'react';
import { Send, Loader2, Smile, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: () => void;
}

export function MessageInput({ conversationId, disabled, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = message.trim().length > 0;

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
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
