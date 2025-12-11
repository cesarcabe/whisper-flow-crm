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
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PipelineWithStages, Card } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanBoardProps {
  pipeline: PipelineWithStages;
  onMoveCard: (cardId: string, newStageId: string, newPosition: number) => Promise<boolean>;
  onCardClick: (card: Card) => void;
  onAddStage: () => void;
  onEditStage: (stageId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onAddCard: (stageId: string) => void;
}

export function KanbanBoard({
  pipeline,
  onMoveCard,
  onCardClick,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onAddCard,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);

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
    const cardId = active.id as string;
    
    // Find the card
    for (const stage of pipeline.stages) {
      const card = stage.cards.find(c => c.id === cardId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle visual feedback during drag
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    // Determine target stage
    let targetStageId: string | null = null;
    let targetPosition = 0;

    // Check if dropped on a stage
    const overStage = pipeline.stages.find(s => s.id === overId);
    if (overStage) {
      targetStageId = overStage.id;
      targetPosition = overStage.cards.length;
    } else {
      // Check if dropped on a card
      for (const stage of pipeline.stages) {
        const overCard = stage.cards.find(c => c.id === overId);
        if (overCard) {
          targetStageId = stage.id;
          targetPosition = overCard.position;
          break;
        }
      }
    }

    if (targetStageId && cardId !== overId) {
      await onMoveCard(cardId, targetStageId, targetPosition);
    }
  };

  return (
    <div className="h-full overflow-x-auto scrollbar-thin">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 min-h-full">
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onCardClick={onCardClick}
              onEdit={() => onEditStage(stage.id)}
              onDelete={() => onDeleteStage(stage.id)}
              onAddCard={() => onAddCard(stage.id)}
            />
          ))}

          {/* Add Stage Button */}
          <div className="flex-shrink-0 w-72">
            <Button
              variant="ghost"
              className="w-full h-12 border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-accent/30"
              onClick={onAddStage}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Estágio
            </Button>
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <KanbanCard
              card={activeCard}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
