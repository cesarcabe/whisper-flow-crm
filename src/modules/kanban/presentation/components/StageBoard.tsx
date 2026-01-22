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
import { PipelineWithConversations, ConversationWithStage, LeadInboxStage } from '@/hooks/useConversationStages';
import { StageColumn } from './StageColumn';
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
}

export function StageBoard({
  pipeline,
  onMoveConversation,
  onConversationClick,
  onAddStage,
  onEditStage,
  onDeleteStage,
}: StageBoardProps) {
  const [activeConversation, setActiveConversation] = useState<ConversationWithStage | null>(null);

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

    if (!over) return;

    const contactId = active.id as string;
    const overId = over.id as string;

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

  return (
    <div className="h-full overflow-x-auto scrollbar-thin">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 min-h-full">
          {/* Lead Inbox Column */}
          <LeadInboxColumn
            leadInbox={pipeline.leadInbox}
            onConversationClick={onConversationClick}
          />

          {/* Regular Stage Columns */}
          {pipeline.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              onConversationClick={onConversationClick}
              onEdit={() => onEditStage(stage.id)}
              onDelete={() => onDeleteStage(stage.id)}
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
          {activeConversation && (
            <StageCard
              conversation={activeConversation}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
