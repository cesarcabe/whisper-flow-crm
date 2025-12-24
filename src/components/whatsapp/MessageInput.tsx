import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
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

  return (
    <div className="chat-input-container">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem..."
        disabled={disabled || sending}
        className="min-h-[44px] max-h-[120px] resize-none flex-1"
        rows={1}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || sending || !message.trim()}
        className="shrink-0"
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
