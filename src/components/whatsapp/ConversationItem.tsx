import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConversationWithContact } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface ConversationItemProps {
  conversation: ConversationWithContact;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const contact = conversation.contact;
  const isGroup = (conversation as any).is_group === true;
  const name = contact?.name || 'Contato desconhecido';
  const initials = isGroup 
    ? 'GP' 
    : name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const lastMessageAt = conversation.last_message_at;
  const unreadCount = conversation.unread_count || 0;

  // Get contact class and stage for display
  const contactClass = contact?.contact_class;
  const stage = conversation.stage;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 w-full min-w-0 overflow-hidden cursor-pointer transition-colors border-b border-border/50',
        isActive ? 'bg-accent' : 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12 flex-shrink-0 mt-0.5">
        {isGroup ? (
          <AvatarFallback className="bg-secondary/20 text-secondary">
            <Users className="h-5 w-5" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage src={contact?.avatar_url || undefined} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </>
        )}
      </Avatar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="font-medium text-foreground truncate">{name}</h4>
            {isGroup && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                Grupo
              </Badge>
            )}
          </div>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false, locale: ptBR })}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
          <p className="text-sm text-muted-foreground truncate min-w-0">
            {conversation.lastMessagePreview || 'Nenhuma mensagem'}
          </p>
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 min-w-[20px] shrink-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>

        {/* Tags de Relacionamento e Estágio */}
        {(contactClass || stage) && (
          <div className="flex flex-wrap gap-1 mt-1.5 min-w-0 overflow-hidden">
            {contactClass && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 max-w-[200px] truncate"
                style={{
                  borderColor: contactClass.color || undefined,
                  color: contactClass.color || undefined,
                }}
              >
                {contactClass.name}
              </Badge>
            )}
            {stage && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 max-w-[200px] truncate"
                style={{
                  borderColor: stage.color || undefined,
                  color: stage.color || undefined,
                }}
              >
                {stage.name}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
