import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw, ArrowDown, ArrowUp, Users, MoreVertical, WifiOff, User, Tag, Lock } from 'lucide-react';
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
import { useConversationStages } from '@/hooks/useConversationStages';
import { useContactClasses } from '@/hooks/useContactClasses';
import { useContacts } from '@/hooks/useContacts';
import { EditContactSheet } from '@/modules/kanban/presentation/components/dialogs/EditContactSheet';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDateLabel } from '@/lib/date-utils';
import { groupMessagesByDate } from '@/lib/message-utils';
import { getInitials } from '@/lib/normalize';

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
  const { updateConversationStage } = useConversationStages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  // For preserving scroll position when loading older messages
  const scrollHeightBeforeLoadRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);
  const loadedOlderRef = useRef(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Forward state
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Contact edit state
  const [showContactEdit, setShowContactEdit] = useState(false);
  const { contactClasses } = useContactClasses();
  const { updateContact } = useContacts();

  const name = contact?.name || 'Contato desconhecido';
  
  // Get stages from the active pipeline
  const stages = activePipeline?.stages || [];
  const currentStage = stages.find(s => s.id === currentStageId);

  const handleStageChange = async (newStageId: string | null) => {
    if (!conversationId) return;
    
    setIsUpdatingStage(true);
    try {
      const success = await updateConversationStage(conversationId, newStageId);

      if (!success) {
        toast.error('Erro ao atualizar estágio');
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
  
  const initials = isGroup ? 'GP' : getInitials(name);

  // Get the actual scrollable viewport from ScrollArea
  const getScrollViewport = useCallback(() => {
    return scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Handle load more with scroll position preservation
  const handleLoadMore = useCallback(() => {
    const viewport = getScrollViewport();
    if (viewport) {
      scrollHeightBeforeLoadRef.current = viewport.scrollHeight;
      isLoadingMoreRef.current = true;
      loadedOlderRef.current = true;
    }
    loadMore();
  }, [loadMore, getScrollViewport]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    if (!loadingMore && isLoadingMoreRef.current) {
      isLoadingMoreRef.current = false;
      const viewport = getScrollViewport();
      if (viewport && scrollHeightBeforeLoadRef.current > 0) {
        const newScrollHeight = viewport.scrollHeight;
        const scrollDiff = newScrollHeight - scrollHeightBeforeLoadRef.current;
        viewport.scrollTop = scrollDiff;
        scrollHeightBeforeLoadRef.current = 0;
      }
    }
  }, [loadingMore, getScrollViewport]);

  // Scroll to a specific message
  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-pulse');
      setTimeout(() => element.classList.remove('animate-pulse'), 1500);
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

  // Auto-scroll when new messages arrive (but NOT when loading older messages)
  useEffect(() => {
    if (!isInitialLoadRef.current && messages.length > prevMessagesLengthRef.current) {
      if (loadedOlderRef.current) {
        loadedOlderRef.current = false;
      } else {
        scrollToBottom('smooth');
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Reset initial load ref when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessagesLengthRef.current = 0;
    setReplyingTo(null);
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
        <div
          className={cn(
            "flex-1 min-w-0",
            !isGroup && contact && "cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
          )}
          onClick={() => {
            if (!isGroup && contact) {
              setShowContactEdit(true);
            }
          }}
        >
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

              <DropdownMenuItem
                onClick={() => setShowContactEdit(true)}
                disabled={!contact || isGroup}
              >
                <User className="h-4 w-4 mr-2" />
                Ver perfil do contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="h-full" onScrollCapture={handleScroll}>
          <div className="p-4 whatsapp-chat-bg min-h-full flex flex-col">
            {hasMore && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
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
              <div className="flex items-center justify-center flex-1 min-h-[200px]">
                <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <div className="mt-auto">
                {/* Encryption notice */}
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 
                                  text-[11px] px-3 py-1.5 rounded-lg max-w-[280px] text-center flex items-center gap-2">
                    <Lock className="h-3 w-3 flex-shrink-0" />
                    <span>As mensagens são protegidas com criptografia de ponta a ponta.</span>
                  </div>
                </div>
                
                <MessagesWithDateSeparators 
                  messages={messages}
                  conversationId={conversationId}
                  onReply={setReplyingTo}
                  onForward={setForwardMessage}
                  onScrollToMessage={scrollToMessage}
                />
              </div>
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
          <MessageInput 
            conversationId={conversationId}
            replyingTo={replyingTo}
            onClearReply={() => setReplyingTo(null)}
          />
        )}
      </div>

      {/* Forward Dialog */}
      <ForwardMessageDialog
        open={!!forwardMessage}
        onOpenChange={(open) => !open && setForwardMessage(null)}
        messageBody={forwardMessage?.body || ''}
        messageType={forwardMessage?.type.getValue() || 'text'}
        currentConversationId={conversationId}
      />

      {/* Contact Edit Sheet */}
      <EditContactSheet
        contact={contact ? {
          id: contact.id,
          name: contact.name || '',
          phone: contact.phone || '',
          email: contact.email,
          avatar_url: contact.avatar_url,
          notes: contact.notes,
          status: contact.status,
          contact_class_id: contact.contact_class_id,
          group_class_id: contact.group_class_id,
        } : null}
        open={showContactEdit}
        onOpenChange={setShowContactEdit}
        contactClasses={contactClasses}
        groupClasses={[]}
        onSave={async (contactId, updates) => {
          const success = await updateContact(contactId, updates);
          return success;
        }}
      />
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/80 text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
        {formatDateLabel(date)}
      </div>
    </div>
  );
}

interface MessagesWithDateSeparatorsProps {
  messages: Message[];
  conversationId: string;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onScrollToMessage: (messageId: string) => void;
}

function MessagesWithDateSeparators({ 
  messages, 
  conversationId,
  onReply, 
  onForward,
  onScrollToMessage 
}: MessagesWithDateSeparatorsProps) {
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col gap-2">
      {groupedMessages.map(group => (
        <div key={group.date}>
          <DateSeparator date={new Date(group.date)} />
          {group.messages.map(message => (
            <div key={message.id} className="mb-2">
              <MessageBubble 
                message={message}
                conversationId={conversationId}
                onReply={onReply}
                onForward={onForward}
                onScrollToMessage={onScrollToMessage}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
