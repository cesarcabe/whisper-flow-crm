import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/types/ui';
import { Avatar } from '@/components/crm/Avatar';
import { cn } from '@/lib/utils';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
  isDragging?: boolean;
}

const priorityColors = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export function KanbanCard({ card, onClick, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

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
      {/* Priority Indicator */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            priorityColors[card.priority]
          )}
        />
        {card.due_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(card.due_date), 'dd MMM', { locale: ptBR })}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.title}</h4>

      {/* Description */}
      {card.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Contact Info */}
      {card.contact && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Avatar
            name={card.contact.name}
            src={card.contact.avatar_url || undefined}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{card.contact.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {card.contact.phone}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              // Open conversation
            }}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Need to import Button
import { Button } from '@/components/ui/button';
