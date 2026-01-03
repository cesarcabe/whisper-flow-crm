import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GroupWithClass } from '@/hooks/useGroupClasses';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupCardProps {
  group: GroupWithClass;
  onClick: () => void;
  isDragging?: boolean;
}

export function GroupCard({ group, onClick, isDragging }: GroupCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const lastMessageTime = group.last_message_at
    ? formatDistanceToNow(new Date(group.last_message_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          {group.contact.avatar_url ? (
            <AvatarImage src={group.contact.avatar_url} alt={group.contact.name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{group.contact.name}</h4>
            {group.unread_count > 0 && (
              <Badge variant="default" className="flex-shrink-0 text-xs">
                {group.unread_count}
              </Badge>
            )}
          </div>
          {lastMessageTime && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{lastMessageTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
