import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConversationWithStage } from '@/hooks/useConversationStages';
import { Avatar } from '@/components/crm/Avatar';
import { cn } from '@/lib/utils';
import { MessageSquare, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface StageCardProps {
  conversation: ConversationWithStage;
  onClick: () => void;
  isDragging?: boolean;
}

export function StageCard({ conversation, onClick, isDragging = false }: StageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: conversation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  const lastMessageTime = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card rounded-lg p-3 shadow-sm border border-border/50 cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-primary/30 transition-all duration-200',
        dragging && 'opacity-50 shadow-xl rotate-2 scale-105'
      )}
      onClick={(e) => {
        if (!dragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Unread Badge */}
      {conversation.unread_count > 0 && (
        <div className="flex justify-end mb-2">
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {conversation.unread_count} nova{conversation.unread_count > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Contact Info */}
      {conversation.contact && (
        <div className="flex items-center gap-3">
          <Avatar
            name={conversation.contact.name}
            src={conversation.contact.avatar_url || undefined}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{conversation.contact.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.contact.phone}
            </p>
          </div>
        </div>
      )}

      {/* Last Message Time */}
      {lastMessageTime && (
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {lastMessageTime}
        </div>
      )}

      {/* Quick Action */}
      <div className="flex justify-end mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <MessageSquare className="h-3 w-3" />
          Abrir Chat
        </Button>
      </div>
    </div>
  );
}
