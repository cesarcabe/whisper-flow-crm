import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw, ArrowDown, ArrowUp, Users, MoreVertical, WifiOff, User, Archive, Trash2, Tag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useMessages, Message } from '@/hooks/useMessages';
import { usePipelines } from '@/hooks/usePipelines';
import { supabase } from '@/integrations/supabase/client';
import { MessageInput } from './MessageInput';
import { AudioPlayer } from './AudioPlayer';
import { ImageViewer } from './ImageViewer';
import { Tables } from '@/integrations/supabase/types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

type Contact = Tables<'contacts'>;

interface MessageThreadProps {
  conversationId: string;
  contact?: Contact | null;
  isGroup?: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'unknown';
  currentStageId?: string | null;
}

export function MessageThread({ conversationId, contact, isGroup, connectionStatus = 'unknown', currentStageId }: MessageThreadProps) {
  const { messages, loading, loadingMore, error, hasMore, loadMore, refetch } = useMessages(conversationId);
  const { activePipeline } = usePipelines();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  const name = contact?.name || 'Contato desconhecido';
  
  // Get stages from the active pipeline
  const stages = activePipeline?.stages || [];
  const currentStage = stages.find(s => s.id === currentStageId);

  const handleStageChange = async (newStageId: string | null) => {
    if (!conversationId) return;
    
    setIsUpdatingStage(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ stage_id: newStageId })
        .eq('id', conversationId);

      if (error) {
        toast.error('Erro ao atualizar estágio');
        console.error('[MessageThread] Error updating stage:', error);
      } else {
        const stageName = newStageId 
          ? stages.find(s => s.id === newStageId)?.name 
          : 'Sem estágio';
        toast.success(`Estágio atualizado: ${stageName}`);
      }
    } catch (err) {
      console.error('[MessageThread] Exception updating stage:', err);
      toast.error('Erro ao atualizar estágio');
    } finally {
      setIsUpdatingStage(false);
    }
  };
  const initials = isGroup 
    ? 'GP' 
    : name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && isInitialLoadRef.current && messages.length > 0) {
      setTimeout(() => scrollToBottom('instant'), 100);
      isInitialLoadRef.current = false;
      prevMessagesLengthRef.current = messages.length;
    }
  }, [loading, messages.length, scrollToBottom]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!isInitialLoadRef.current && messages.length > prevMessagesLengthRef.current) {
      scrollToBottom('smooth');
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Reset initial load ref when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessagesLengthRef.current = 0;
  }, [conversationId]);

  // Track scroll position to show/hide scroll button
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Contact Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card flex-shrink-0">
        <Avatar className="h-10 w-10">
          {isGroup ? (
            <AvatarFallback className="bg-secondary/20 text-secondary">
              <Users className="h-5 w-5" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={contact?.avatar_url || undefined} alt={name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{name}</h3>
            {isGroup && (
              <Badge variant="secondary" className="text-xs">
                Grupo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {contact?.phone || 'Sem telefone'}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {currentStage && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: `${currentStage.color}20`,
                color: currentStage.color,
                borderColor: currentStage.color
              }}
            >
              {currentStage.name}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg z-50">
              {/* Stage classification submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={isUpdatingStage}>
                  <Tag className="h-4 w-4 mr-2" />
                  {isUpdatingStage ? 'Atualizando...' : 'Estágio de Venda'}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-popover border shadow-lg z-50">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Estágio de Venda
                  </DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => handleStageChange(null)}
                    className={cn(!currentStageId && 'bg-accent')}
                  >
                    <div className="w-3 h-3 rounded-full bg-muted mr-2" />
                    Sem estágio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {stages.map((stage) => (
                    <DropdownMenuItem
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      className={cn(currentStageId === stage.id && 'bg-accent')}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => toast.info('Funcionalidade em breve')}>
                <User className="h-4 w-4 mr-2" />
                Ver perfil do contato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Funcionalidade em breve')}>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar conversa
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toast.info('Funcionalidade em breve')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="h-full" onScrollCapture={handleScroll}>
          <div className="p-4 bg-[hsl(var(--chat-bg))]">
            {hasMore && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Carregar anteriores
                    </>
                  )}
                </Button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <MessagesWithDateSeparators messages={messages} />
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10"
            onClick={() => scrollToBottom('smooth')}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Message Input - fixed at bottom */}
      <div className="flex-shrink-0 border-t">
        {connectionStatus === 'disconnected' ? (
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Conexão WhatsApp inativa. Reconecte para enviar mensagens.</span>
          </div>
        ) : (
          <MessageInput conversationId={conversationId} />
        )}
      </div>
    </div>
  );
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/80 text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
        {getDateLabel(date)}
      </div>
    </div>
  );
}

function MessagesWithDateSeparators({ messages }: { messages: Message[] }) {
  const groupedMessages = useMemo(() => {
    // Sort messages chronologically (oldest first) for correct display
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const groups: { date: string; messages: Message[] }[] = [];
    
    sortedMessages.forEach(message => {
      const dateKey = format(new Date(message.created_at), 'yyyy-MM-dd');
      const existingGroup = groups.find(g => g.date === dateKey);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: dateKey, messages: [message] });
      }
    });
    
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col gap-2">
      {groupedMessages.map(group => (
        <div key={group.date}>
          <DateSeparator date={new Date(group.date)} />
          {group.messages.map(message => (
            <div key={message.id} className="mb-2">
              <MessageBubble message={message} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutgoing = message.is_outgoing;
  const time = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });
  const isAudio = message.type === 'audio';
  const isImage = message.type === 'image';

  const renderContent = () => {
    // Audio message
    if (isAudio && message.media_url) {
      return <AudioPlayer src={message.media_url} isOutgoing={isOutgoing} />;
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

  return (
    <div className={cn('flex', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] px-3 py-2 rounded-2xl',
          isOutgoing
            ? 'bg-[hsl(var(--message-sent))] text-[hsl(var(--message-sent-text))] rounded-br-md'
            : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-text))] rounded-bl-md shadow-sm'
        )}
      >
        {renderContent()}
        <div className={cn('flex items-center gap-1 mt-1', isOutgoing ? 'justify-end' : 'justify-start')}>
          <span className="text-xs opacity-70">{time}</span>
          {isOutgoing && message.status && (
            <span className="text-xs opacity-70">
              {message.status === 'sending' && '⏳'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && <span className="text-primary">✓✓</span>}
              {message.status === 'failed' && <span className="text-destructive">✕</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
