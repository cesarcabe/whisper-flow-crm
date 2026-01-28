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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { PipelineWithConversations, ConversationWithStage, StageWithConversations } from '@/hooks/useConversationStages';
import { SortableStageColumn } from './SortableStageColumn';
import { LeadInboxColumn } from './LeadInboxColumn';
import { StageCard } from './StageCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StageBoardProps {
  pipeline: PipelineWithConversations;
  onMoveConversation: (contactId: string, newStageId: string, existingConversationId: string | null) => Promise<boolean>;
  onConversationClick: (conversation: ConversationWithStage) => void;
  onAddStage: () => void;
  onEditStage: (stageId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onReorderStages?: (stageIds: string[]) => Promise<boolean>;
}

export function StageBoard({
  pipeline,
  onMoveConversation,
  onConversationClick,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onReorderStages,
}: StageBoardProps) {
  const [activeConversation, setActiveConversation] = useState<ConversationWithStage | null>(null);
  const [activeStage, setActiveStage] = useState<StageWithConversations | null>(null);

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
    const activeId = active.id as string;

    // Check if dragging a stage (column)
    if (activeId.startsWith('stage-')) {
      const stageId = activeId.replace('stage-', '');
      const stage = pipeline.stages.find(s => s.id === stageId);
      if (stage) {
        setActiveStage(stage);
        return;
      }
    }

    // Otherwise, it's a conversation (card)
    const contactId = activeId;

    // Check lead inbox first
    const inLeadInbox = pipeline.leadInbox.conversations.find(c => c.contact_id === contactId);
    if (inLeadInbox) {
      setActiveConversation(inLeadInbox);
      return;
    }

    // Find the contact entry by contact_id in stages
    for (const stage of pipeline.stages) {
      const conversation = stage.conversations.find(c => c.contact_id === contactId);
      if (conversation) {
        setActiveConversation(conversation);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveConversation(null);
    setActiveStage(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle stage (column) reordering
    if (activeId.startsWith('stage-') && overId.startsWith('stage-')) {
      const activeStageId = activeId.replace('stage-', '');
      const overStageId = overId.replace('stage-', '');

      if (activeStageId !== overStageId && onReorderStages) {
        const oldIndex = pipeline.stages.findIndex(s => s.id === activeStageId);
        const newIndex = pipeline.stages.findIndex(s => s.id === overStageId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(
            pipeline.stages.map(s => s.id),
            oldIndex,
            newIndex
          );
          await onReorderStages(newOrder);
        }
      }
      return;
    }

    // Handle conversation (card) movement
    const contactId = activeId;

    // Find existing conversation id - check lead inbox first
    let existingConversationId: string | null = null;
    const inLeadInbox = pipeline.leadInbox.conversations.find(c => c.contact_id === contactId);
    if (inLeadInbox) {
      existingConversationId = inLeadInbox.id;
    } else {
      for (const stage of pipeline.stages) {
        const entry = stage.conversations.find(c => c.contact_id === contactId);
        if (entry) {
          existingConversationId = entry.id;
          break;
        }
      }
    }

    // Determine target stage
    let targetStageId: string | null = null;

    // Check if dropped on a stage
    const overStage = pipeline.stages.find(s => s.id === overId);
    if (overStage) {
      targetStageId = overStage.id;
    } else {
      // Check if dropped on a contact entry
      for (const stage of pipeline.stages) {
        const overEntry = stage.conversations.find(c => c.contact_id === overId);
        if (overEntry) {
          targetStageId = stage.id;
          break;
        }
      }
    }

    if (targetStageId && contactId !== overId) {
      await onMoveConversation(contactId, targetStageId, existingConversationId);
    }
  };

  // Column IDs for sortable context
  const columnIds = pipeline.stages.map(s => `stage-${s.id}`);

  return (
    <div className="h-full overflow-x-auto scrollbar-thin">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 min-h-full">
          {/* Lead Inbox Column - not sortable */}
          <LeadInboxColumn
            leadInbox={pipeline.leadInbox}
            onConversationClick={onConversationClick}
          />

          {/* Sortable Stage Columns */}
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {pipeline.stages.map((stage) => (
              <SortableStageColumn
                key={stage.id}
                stage={stage}
                onConversationClick={onConversationClick}
                onEdit={() => onEditStage(stage.id)}
                onDelete={() => onDeleteStage(stage.id)}
              />
            ))}
          </SortableContext>

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
          {activeConversation && (
            <StageCard
              conversation={activeConversation}
              onClick={() => {}}
              isDragging
            />
          )}
          {activeStage && (
            <div className="flex-shrink-0 w-72 bg-muted/50 rounded-xl flex flex-col max-h-[calc(100vh-200px)] opacity-80 shadow-xl">
              <div className="p-3 flex items-center gap-2 border-b border-border/30">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeStage.color }}
                />
                <h3 className="font-semibold text-sm">{activeStage.name}</h3>
                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                  {activeStage.conversations.length}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
