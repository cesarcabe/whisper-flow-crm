import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ContactWithClass } from '@/hooks/useContactClasses';
import { RelationshipCard } from './RelationshipCard';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RelationshipColumnProps {
  id: string;
  name: string;
  color: string;
  contacts: ContactWithClass[];
  onContactClick: (contact: ContactWithClass) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RelationshipColumn({
  id,
  name,
  color,
  contacts,
  onContactClick,
  onEdit,
  onDelete,
}: RelationshipColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-xl flex flex-col max-h-[calc(100vh-200px)] transition-colors ${
        isOver ? 'bg-accent/50 ring-2 ring-primary/30' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-sm">{name}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {contacts.length}
          </span>
        </div>

        {onEdit && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Contacts Container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[100px]"
      >
        <SortableContext
          items={contacts.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.map((contact) => (
            <RelationshipCard
              key={contact.id}
              contact={contact}
              onClick={() => onContactClick(contact)}
            />
          ))}
        </SortableContext>

        {contacts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum contato
          </div>
        )}
      </div>
    </div>
  );
}
