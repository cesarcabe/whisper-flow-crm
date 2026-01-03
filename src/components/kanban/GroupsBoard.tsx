import { GroupConversation } from '@/hooks/useGroupConversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupsBoardProps {
  groups: GroupConversation[];
  onGroupClick: (group: GroupConversation) => void;
}

export function GroupsBoard({ groups, onGroupClick }: GroupsBoardProps) {
  if (groups.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Users className="h-16 w-16 opacity-50" />
        <div className="text-center">
          <p className="text-lg font-medium">Nenhum grupo encontrado</p>
          <p className="text-sm">Os grupos do WhatsApp aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onClick={() => onGroupClick(group)} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

interface GroupCardProps {
  group: GroupConversation;
  onClick: () => void;
}

function GroupCard({ group, onClick }: GroupCardProps) {
  const initials = group.contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const lastMessageTime = group.last_message_at
    ? formatDistanceToNow(new Date(group.last_message_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors text-left group"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {group.contact.avatar_url ? (
            <AvatarImage src={group.contact.avatar_url} alt={group.contact.name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {group.contact.name}
            </h3>
            {group.unread_count > 0 && (
              <Badge variant="default" className="flex-shrink-0">
                {group.unread_count}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{group.contact.phone}</p>
          {lastMessageTime && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{lastMessageTime}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
