import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ContactClass } from '@/hooks/useContactClasses';
import { GroupWithClass } from '@/hooks/useGroupClasses';
import { GroupColumn } from './GroupColumn';
import { GroupCard } from './GroupCard';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GroupsBoardProps {
  contactClasses: ContactClass[];
  groupsByClass: Record<string, GroupWithClass[]>;
  unclassifiedGroups: GroupWithClass[];
  onMoveGroup: (groupId: string, newClassId: string | null) => Promise<boolean>;
  onGroupClick: (group: GroupWithClass) => void;
  onAddClass: () => void;
  onEditClass: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
}

export function GroupsBoard({
  contactClasses,
  groupsByClass,
  unclassifiedGroups,
  onMoveGroup,
  onGroupClick,
  onAddClass,
  onEditClass,
  onDeleteClass,
}: GroupsBoardProps) {
  const [activeGroup, setActiveGroup] = useState<GroupWithClass | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const groupId = active.id as string;

    // Find the group
    for (const [, groups] of Object.entries(groupsByClass)) {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setActiveGroup(group);
        return;
      }
    }

    const group = unclassifiedGroups.find((g) => g.id === groupId);
    if (group) {
      setActiveGroup(group);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroup(null);

    if (!over) return;

    const groupId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a class column
    const overClass = contactClasses.find((c) => c.id === overId);
    if (overClass) {
      const success = await onMoveGroup(groupId, overClass.id);
      if (success) {
        toast.success('Grupo movido!');
      }
      return;
    }

    // Check if dropped on unclassified column
    if (overId === 'unclassified') {
      const success = await onMoveGroup(groupId, null);
      if (success) {
        toast.success('Grupo movido!');
      }
      return;
    }

    // Check if dropped on another group - get its class
    for (const [classId, groups] of Object.entries(groupsByClass)) {
      const overGroup = groups.find((g) => g.id === overId);
      if (overGroup) {
        const success = await onMoveGroup(groupId, classId);
        if (success) {
          toast.success('Grupo movido!');
        }
        return;
      }
    }

    // Check if dropped on unclassified group
    const overUnclassified = unclassifiedGroups.find((g) => g.id === overId);
    if (overUnclassified) {
      const success = await onMoveGroup(groupId, null);
      if (success) {
        toast.success('Grupo movido!');
      }
    }
  };

  const totalGroups = unclassifiedGroups.length + 
    Object.values(groupsByClass).reduce((sum, groups) => sum + groups.length, 0);

  if (totalGroups === 0) {
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
    <div className="h-full overflow-x-auto scrollbar-thin">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 min-h-full">
          {/* Unclassified Column */}
          <GroupColumn
            id="unclassified"
            name="Sem Classificação"
            color="#9CA3AF"
            groups={unclassifiedGroups}
            onGroupClick={onGroupClick}
          />

          {/* Classification Columns */}
          {contactClasses.map((contactClass) => (
            <GroupColumn
              key={contactClass.id}
              id={contactClass.id}
              name={contactClass.name}
              color={contactClass.color}
              groups={groupsByClass[contactClass.id] || []}
              onGroupClick={onGroupClick}
              onEdit={() => onEditClass(contactClass.id)}
              onDelete={() => onDeleteClass(contactClass.id)}
            />
          ))}

          {/* Add Class Button */}
          <div className="flex-shrink-0 w-72">
            <Button
              variant="ghost"
              className="w-full h-12 border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-accent/30"
              onClick={onAddClass}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Classificação
            </Button>
          </div>
        </div>

        <DragOverlay>
          {activeGroup && (
            <GroupCard group={activeGroup} onClick={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
