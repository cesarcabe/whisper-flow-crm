import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StageWithConversations, ConversationWithStage } from '@/hooks/useConversationStages';
import { StageColumn } from './StageColumn';

interface SortableStageColumnProps {
  stage: StageWithConversations;
  onConversationClick: (conversation: ConversationWithStage) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableStageColumn({
  stage,
  onConversationClick,
  onEdit,
  onDelete,
}: SortableStageColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `stage-${stage.id}`,
    data: {
      type: 'stage',
      stage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <StageColumn
        stage={stage}
        onConversationClick={onConversationClick}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  );
}
