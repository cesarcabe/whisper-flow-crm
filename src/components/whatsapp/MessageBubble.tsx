import { useState, useCallback } from 'react';
import { Reply, Copy, Forward, Trash2, SmilePlus, Check, CheckCheck } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { AudioPlayer } from './AudioPlayer';
import { ImageViewer } from './ImageViewer';
import { ReactionPicker } from './ReactionPicker';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/date-utils';
import { toast } from 'sonner';
import { LegacyMessage } from '@/hooks/useMessages';

type Message = LegacyMessage;

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

interface QuotedMessage {
  id: string;
  body: string;
  type: string;
  is_outgoing: boolean;
}

// Extended message type with quoted_message parsed
type MessageWithQuote = Message & { quoted_message?: QuotedMessage | Record<string, unknown> | null };

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  conversationId: string;
}

export function MessageBubble({ 
  message: rawMessage, 
  onReply, 
  onForward, 
  onScrollToMessage,
  conversationId
}: MessageBubbleProps) {
  const message = rawMessage as MessageWithQuote;
  const isOutgoing = message.is_outgoing;
  const time = formatTime(new Date(message.created_at));
  const isAudio = message.type === 'audio';
  const isImage = message.type === 'image';
  const { groupedReactions, toggleReaction } = useMessageReactions(message.id);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Parse quoted_message safely
  const quotedMessage = message.quoted_message && typeof message.quoted_message === 'object' 
    ? message.quoted_message as QuotedMessage 
    : null;

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
    if (isAudio && message.media_url) {
      return <AudioPlayer src={message.media_url} isOutgoing={isOutgoing ?? false} />;
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
    if (isImage && message.media_url) {
      return (
        <ImageViewer
          src={message.media_url}
          caption={message.body !== '📷 Imagem' ? message.body : undefined}
          isOutgoing={isOutgoing ?? false}
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
        {renderMessageWithLinks(message.body || '', isOutgoing ?? false)}
      </p>
    );
  };

  const renderStatus = () => {
    if (!isOutgoing || !message.status) return null;

    switch (message.status) {
      case 'sending':
        return <span className="text-[10px] opacity-60">⏳</span>;
      case 'sent':
        return <Check className="h-3 w-3 opacity-60" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 opacity-60" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-sky-400" />;
      case 'failed':
        return <span className="text-[10px] text-destructive">✕</span>;
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
                  : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-text))] rounded-tl-sm shadow-sm'
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
                    {quotedMessage.is_outgoing ? 'Você' : 'Contato'}
                  </p>
                  <p className="truncate opacity-70">
                    {quotedMessage.type === 'image' ? '📷 Imagem' : 
                     quotedMessage.type === 'audio' ? '🎤 Áudio' : 
                     quotedMessage.body || '📎 Mídia'}
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
