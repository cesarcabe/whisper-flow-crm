import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConversationWithContact } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: ConversationWithContact;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const contact = conversation.contact;
  const name = contact?.name || 'Contato desconhecido';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const lastMessageAt = conversation.last_message_at;
  const unreadCount = conversation.unread_count || 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border/50',
        isActive ? 'bg-accent' : 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={contact?.avatar_url || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground truncate">{name}</h4>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false, locale: ptBR })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {conversation.lastMessagePreview || 'Nenhuma mensagem'}
          </p>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-[20px] flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
