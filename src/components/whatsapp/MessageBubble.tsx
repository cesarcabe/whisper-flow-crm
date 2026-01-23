import { useState, useCallback } from 'react';
import { Reply, Copy, Forward, Trash2, SmilePlus, Check, CheckCheck, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from './AudioPlayer';
import { ImageViewer } from './ImageViewer';
import { ReactionPicker } from './ReactionPicker';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useSendMessage } from '@/modules/conversation/presentation/hooks/useSendMessage';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/date-utils';
import { toast } from 'sonner';
import { Message } from '@/core/domain/entities/Message';

// Regex para detectar URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderMessageWithLinks(text: string, isOutgoing: boolean) {
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'underline hover:opacity-80 break-all',
            isOutgoing ? 'text-blue-200' : 'text-primary'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  conversationId: string;
}

export function MessageBubble({ 
  message, 
  onReply, 
  onForward, 
  onScrollToMessage,
  conversationId
}: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing;
  const time = formatTime(message.createdAt);
  const isAudio = message.type.getValue() === 'audio';
  const isImage = message.type.getValue() === 'image';
  const { groupedReactions, toggleReaction } = useMessageReactions(message.id);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { retrySend } = useSendMessage();

  // Get quoted message from domain entity
  const quotedMessage = message.quotedMessage;
  
  // Estados especiais para mensagens otimistas
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  const isOptimistic = message.id.startsWith('opt_');
  
  // Handler para reenviar mensagem que falhou
  const handleRetry = useCallback(async () => {
    if (!isFailed || isRetrying) return;
    
    setIsRetrying(true);
    try {
      const result = await retrySend(message.id);
      if (result && !result.success) {
        toast.error('Falha ao reenviar mensagem');
      }
    } catch (err) {
      toast.error('Erro ao reenviar');
    } finally {
      setIsRetrying(false);
    }
  }, [message.id, isFailed, isRetrying, retrySend]);

  const handleCopy = useCallback(() => {
    if (message.body) {
      navigator.clipboard.writeText(message.body);
      toast.success('Mensagem copiada');
    }
  }, [message.body]);

  const handleReact = useCallback((emoji: string) => {
    toggleReaction(emoji);
  }, [toggleReaction]);

  const renderContent = () => {
    // Audio message
    if (isAudio && message.mediaUrl) {
      return <AudioPlayer src={message.mediaUrl} isOutgoing={isOutgoing} />;
    }
    if (isAudio) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🎤</span>
          <span>Áudio indisponível</span>
        </div>
      );
    }

    // Image message
    if (isImage && message.mediaUrl) {
      return (
        <ImageViewer
          src={message.mediaUrl}
          caption={message.body !== '📷 Imagem' ? message.body : undefined}
          isOutgoing={isOutgoing}
        />
      );
    }
    if (isImage) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>📷</span>
          <span>Imagem indisponível</span>
        </div>
      );
    }

    // Text message
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {renderMessageWithLinks(message.body || '', isOutgoing)}
      </p>
    );
  };

  const renderStatus = () => {
    if (!isOutgoing || !message.status) return null;

    switch (message.status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 opacity-60 animate-spin" />;
      case 'sent':
        return <Check className="h-3 w-3 opacity-60" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 opacity-60" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-sky-400" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={cn('flex group', isOutgoing ? 'justify-end' : 'justify-start')}
          id={`message-${message.id}`}
        >
          <div className="relative max-w-[70%]">
            {/* Message tail */}
            <div
              className={cn(
                "absolute top-0 w-3 h-3",
                isOutgoing 
                  ? "-right-1.5 bg-[hsl(var(--message-sent))]" 
                  : "-left-1.5 bg-[hsl(var(--message-received))]"
              )}
              style={{
                clipPath: isOutgoing 
                  ? 'polygon(0 0, 100% 0, 0 100%)' 
                  : 'polygon(100% 0, 0 0, 100% 100%)'
              }}
            />
            
            <div
              className={cn(
                'px-3 py-2 rounded-xl relative',
                isOutgoing
                  ? 'bg-[hsl(var(--message-sent))] text-[hsl(var(--message-sent-text))] rounded-tr-sm'
                  : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-text))] rounded-tl-sm shadow-sm',
                isSending && 'opacity-70',
                isFailed && 'border border-destructive/50'
              )}
            >
              {/* Quoted message */}
              {quotedMessage && (
                <div 
                  className={cn(
                    "mb-2 p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity",
                    isOutgoing 
                      ? "bg-black/10 border-l-2 border-white/50" 
                      : "bg-black/5 border-l-2 border-primary"
                  )}
                  onClick={() => onScrollToMessage?.(quotedMessage.id)}
                >
                  <p className="font-medium text-[11px] opacity-80 mb-0.5">
                    {quotedMessage.isOutgoing ? 'Você' : 'Contato'}
                  </p>
                  <p className="truncate opacity-70">
                    {message.getQuotedPreview()}
                  </p>
                </div>
              )}

              {renderContent()}
              
              <div className={cn(
                'flex items-center gap-1 mt-1', 
                isOutgoing ? 'justify-end' : 'justify-start'
              )}>
                <span className="text-[11px] opacity-60">{time}</span>
                {renderStatus()}
              </div>
              
              {/* Botão de reenvio para mensagens que falharam */}
              {isFailed && (
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-destructive/20">
                  <span className="text-[10px] text-destructive">
                    {message.errorMessage || 'Falha no envio'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isRetrying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reenviar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Reactions */}
            {groupedReactions.length > 0 && (
              <div className={cn(
                "flex gap-0.5 mt-0.5",
                isOutgoing ? "justify-end" : "justify-start"
              )}>
                {groupedReactions.map(({ emoji, count, userReacted }) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/80 rounded-full text-xs",
                      "hover:bg-muted transition-colors",
                      userReacted && "ring-1 ring-primary/50"
                    )}
                  >
                    {emoji} {count > 1 && <span className="text-[10px]">{count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48">
        <ReactionPicker onSelect={handleReact} side="right">
          <ContextMenuItem onSelect={(e) => e.preventDefault()}>
            <SmilePlus className="h-4 w-4 mr-2" />
            Reagir
          </ContextMenuItem>
        </ReactionPicker>
        <ContextMenuItem onClick={() => onReply?.(message)}>
          <Reply className="h-4 w-4 mr-2" />
          Responder
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onForward?.(message)}>
          <Forward className="h-4 w-4 mr-2" />
          Encaminhar
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={() => toast.info('Funcionalidade em breve')}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Apagar para mim
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
