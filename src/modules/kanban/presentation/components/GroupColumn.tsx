import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GroupWithClass } from '@/hooks/useGroupClasses';
import { GroupCard } from './GroupCard';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupColumnProps {
  id: string;
  name: string;
  color: string;
  groups: GroupWithClass[];
  onGroupClick: (group: GroupWithClass) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GroupColumn({
  id,
  name,
  color,
  groups,
  onGroupClick,
  onEdit,
  onDelete,
}: GroupColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg border ${
        isOver ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-medium text-sm truncate">{name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {groups.length}
          </span>
        </div>
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Groups */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} onClick={() => onGroupClick(group)} />
            ))}
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum grupo
              </p>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
