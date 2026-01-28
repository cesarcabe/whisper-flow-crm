import { BoardViewType } from '@/types/ui';
import { RelationshipBoard } from '../RelationshipBoard';
import { StageBoard } from '../StageBoard';
import { GroupsBoard } from '../GroupsBoard';
import type { ContactClass } from '@/hooks/useContactClasses';
import type { PipelineWithConversations } from '@/hooks/useConversationStages';

interface GroupClass {
  id: string;
  name: string;
  color?: string | null;
  position: number;
}

interface KanbanMainViewProps {
  boardType: BoardViewType;
  // Relationship board props
  contactClasses: ContactClass[];
  contactsByClass: Record<string, any[]>;
  unclassifiedContacts: any[];
  onMoveContact: (contactId: string, newClassId: string | null) => Promise<boolean>;
  onContactClick: (contact: any) => void;
  onAddClass: () => void;
  onEditClass: (classId: string) => void;
  onDeleteClass: (classId: string) => Promise<boolean>;
  // Groups board props
  groupClasses: GroupClass[];
  groupsByClass: Record<string, any[]>;
  unclassifiedGroups: any[];
  onMoveGroup: (groupId: string, newClassId: string | null) => Promise<boolean>;
  onGroupClick: (group: any) => void;
  // Stage board props
  stagePipeline: PipelineWithConversations | null;
  onMoveConversation: (contactId: string, newStageId: string, existingConversationId?: string) => Promise<boolean>;
  onConversationClick: (conversation: any) => void;
  onAddStage: () => void;
  onEditStage: (stageId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onReorderStages?: (stageIds: string[]) => Promise<boolean>;
}

export function KanbanMainView({
  boardType,
  // Relationship
  contactClasses,
  contactsByClass,
  unclassifiedContacts,
  onMoveContact,
  onContactClick,
  onAddClass,
  onEditClass,
  onDeleteClass,
  // Groups
  groupClasses,
  groupsByClass,
  unclassifiedGroups,
  onMoveGroup,
  onGroupClick,
  // Stage
  stagePipeline,
  onMoveConversation,
  onConversationClick,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onReorderStages,
}: KanbanMainViewProps) {
  if (boardType === 'relationship') {
    return (
      <RelationshipBoard
        contactClasses={contactClasses}
        contactsByClass={contactsByClass}
        unclassifiedContacts={unclassifiedContacts}
        onMoveContact={onMoveContact}
        onContactClick={onContactClick}
        onAddClass={onAddClass}
        onEditClass={onEditClass}
        onDeleteClass={onDeleteClass}
      />
    );
  }

  if (boardType === 'groups') {
    return (
      <GroupsBoard
        contactClasses={groupClasses as any}
        groupsByClass={groupsByClass}
        unclassifiedGroups={unclassifiedGroups}
        onMoveGroup={onMoveGroup}
        onGroupClick={onGroupClick}
        onAddClass={onAddClass}
        onEditClass={onEditClass}
        onDeleteClass={onDeleteClass}
      />
    );
  }

  if (stagePipeline) {
    return (
      <StageBoard
        pipeline={stagePipeline}
        onMoveConversation={onMoveConversation}
        onConversationClick={onConversationClick}
        onAddStage={onAddStage}
        onEditStage={onEditStage}
        onDeleteStage={onDeleteStage}
        onReorderStages={onReorderStages}
      />
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-muted-foreground">Nenhum pipeline selecionado</p>
    </div>
  );
}
