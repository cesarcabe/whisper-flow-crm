import { cn } from '@/lib/utils';
import { Conversation } from '@/types/crm';
import { Avatar } from './Avatar';
import { TagBadge } from './TagBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ContactItem({ conversation, isActive, onClick }: ContactItemProps) {
  const { contact, lastMessage, unreadCount, isTyping } = conversation;

  const timeAgo = lastMessage
    ? formatDistanceToNow(new Date(lastMessage.timestamp), {
        addSuffix: false,
        locale: ptBR,
      })
    : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'contact-item',
        isActive && 'contact-item-active'
      )}
    >
      <Avatar name={contact.name} isOnline={contact.isOnline} size="lg" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-foreground truncate">{contact.name}</h3>
          <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-sm truncate',
            isTyping ? 'text-primary italic' : 'text-muted-foreground'
          )}>
            {isTyping ? 'Digitando...' : lastMessage?.body || 'Sem mensagens'}
          </p>
          
          {unreadCount > 0 && (
            <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        
        {contact.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {contact.tags.slice(0, 2).map((tag) => (
              <TagBadge key={tag} name={tag} />
            ))}
            {contact.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{contact.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
