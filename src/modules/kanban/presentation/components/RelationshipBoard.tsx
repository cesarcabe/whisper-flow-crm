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
import { ContactClass, ContactWithClass } from '@/hooks/useContactClasses';
import { RelationshipColumn } from './RelationshipColumn';
import { RelationshipCard } from './RelationshipCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RelationshipBoardProps {
  contactClasses: ContactClass[];
  contactsByClass: Record<string, ContactWithClass[]>;
  unclassifiedContacts: ContactWithClass[];
  onMoveContact: (contactId: string, newClassId: string | null) => Promise<boolean>;
  onContactClick: (contact: ContactWithClass) => void;
  onAddClass: () => void;
  onEditClass: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
}

export function RelationshipBoard({
  contactClasses,
  contactsByClass,
  unclassifiedContacts,
  onMoveContact,
  onContactClick,
  onAddClass,
  onEditClass,
  onDeleteClass,
}: RelationshipBoardProps) {
  const [activeContact, setActiveContact] = useState<ContactWithClass | null>(null);

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
    const contactId = active.id as string;

    // Find the contact
    for (const [, contacts] of Object.entries(contactsByClass)) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setActiveContact(contact);
        return;
      }
    }
    
    const contact = unclassifiedContacts.find(c => c.id === contactId);
    if (contact) {
      setActiveContact(contact);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContact(null);

    if (!over) return;

    const contactId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a class column
    const overClass = contactClasses.find(c => c.id === overId);
    if (overClass) {
      await onMoveContact(contactId, overClass.id);
      return;
    }

    // Check if dropped on unclassified column
    if (overId === 'unclassified') {
      await onMoveContact(contactId, null);
      return;
    }

    // Check if dropped on another contact - get its class
    for (const [classId, contacts] of Object.entries(contactsByClass)) {
      const overContact = contacts.find(c => c.id === overId);
      if (overContact) {
        await onMoveContact(contactId, classId);
        return;
      }
    }

    // Check if dropped on unclassified contact
    const overUnclassified = unclassifiedContacts.find(c => c.id === overId);
    if (overUnclassified) {
      await onMoveContact(contactId, null);
    }
  };

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
          <RelationshipColumn
            id="unclassified"
            name="Sem Classificação"
            color="#9CA3AF"
            contacts={unclassifiedContacts}
            onContactClick={onContactClick}
          />

          {/* Classification Columns */}
          {contactClasses.map((contactClass) => (
            <RelationshipColumn
              key={contactClass.id}
              id={contactClass.id}
              name={contactClass.name}
              color={contactClass.color}
              contacts={contactsByClass[contactClass.id] || []}
              onContactClick={onContactClick}
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
          {activeContact && (
            <RelationshipCard
              contact={activeContact}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
