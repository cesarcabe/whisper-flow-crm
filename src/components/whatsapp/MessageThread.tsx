import { useRef, useEffect, useMemo } from 'react';
import { Loader2, AlertTriangle, RefreshCw, ArrowDown, Users, Search, Phone, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages, Message } from '@/hooks/useMessages';
import { MessageInput } from './MessageInput';
import { Tables } from '@/integrations/supabase/types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Contact = Tables<'contacts'>;

interface MessageThreadProps {
  conversationId: string;
  contact?: Contact | null;
  isGroup?: boolean;
}

export function MessageThread({ conversationId, contact, isGroup }: MessageThreadProps) {
  const { messages, loading, loadingMore, error, hasMore, loadMore, refetch } = useMessages(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  const name = contact?.name || 'Contato desconhecido';
  const initials = isGroup 
    ? 'GP' 
    : name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && isInitialLoadRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isInitialLoadRef.current = false;
    }
  }, [loading]);

  // Reset initial load ref when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [conversationId]);

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
        <div className="relative">
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
          {/* Online status indicator */}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{name}</h3>
            {isGroup && (
              <Badge variant="secondary" className="text-xs">
                Grupo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400">Online</span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full">
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
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Carregar mais
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
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - fixed at bottom */}
      <div className="flex-shrink-0 border-t">
        <MessageInput 
          conversationId={conversationId} 
          onMessageSent={refetch}
        />
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
    const groups: { date: string; messages: Message[] }[] = [];
    
    // Messages are in reverse order (newest first), so we process accordingly
    messages.forEach(message => {
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
    <div className="flex flex-col-reverse gap-2">
      {groupedMessages.map(group => (
        <div key={group.date}>
          {group.messages.map(message => (
            <div key={message.id} className="mb-2">
              <MessageBubble message={message} />
            </div>
          ))}
          <DateSeparator date={new Date(group.date)} />
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutgoing = message.is_outgoing;
  const time = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });

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
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <div className={cn('flex items-center gap-1 mt-1', isOutgoing ? 'justify-end' : 'justify-start')}>
          <span className="text-xs opacity-70">{time}</span>
          {isOutgoing && message.status && (
            <span className="text-xs opacity-70">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && <span className="text-primary">✓✓</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
