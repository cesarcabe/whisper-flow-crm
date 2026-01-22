import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContactWithClass } from "@/hooks/useContactClasses";
import { Avatar } from "@/components/crm/Avatar";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RelationshipCardProps {
  contact: ContactWithClass;
  onClick: () => void;
  isDragging?: boolean;
}

export function RelationshipCard({ contact, onClick, isDragging = false }: RelationshipCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: contact.id });

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
        "bg-card rounded-lg p-3 shadow-sm border border-border/50 cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/30 transition-all duration-200",
        dragging && "opacity-50 shadow-xl rotate-2 scale-105",
      )}
      onClick={(e) => {
        if (!dragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Contact Info */}
      <div className="flex items-center gap-3">
        <Avatar name={contact.name} src={contact.avatar_url || undefined} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{contact.name}</p>
          <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
        </div>
      </div>

      {/* Quick Action */}
      <div className="flex justify-end mt-3 pt-2 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('crm:open-chat', {
              detail: { contactId: contact.id, conversationId: null }
            }));
          }}
        >
          <MessageSquare className="h-3 w-3" />
          Abrir Chat
        </Button>
      </div>
    </div>
  );
}
