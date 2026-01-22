/**
 * Kanban Presentation Components
 * 
 * Componentes React para visualização e interação com o Kanban.
 */

// Main views
export { KanbanView } from './KanbanView';
export { ChatView } from './views/ChatView';
export { KanbanMainView } from './views/KanbanMainView';

// Boards
export { KanbanBoard } from './KanbanBoard';
export { StageBoard } from './StageBoard';
export { RelationshipBoard } from './RelationshipBoard';
export { GroupsBoard } from './GroupsBoard';

// Columns
export { KanbanColumn } from './KanbanColumn';
export { StageColumn } from './StageColumn';
export { RelationshipColumn } from './RelationshipColumn';
export { GroupColumn } from './GroupColumn';
export { LeadInboxColumn } from './LeadInboxColumn';

// Cards
export { KanbanCard } from './KanbanCard';
export { StageCard } from './StageCard';
export { RelationshipCard } from './RelationshipCard';
export { GroupCard } from './GroupCard';

// Header and selectors
export { PipelineHeader } from './PipelineHeader';
export { BoardTypeSelector } from './BoardTypeSelector';

// Dialogs
export { CreatePipelineDialog } from './dialogs/CreatePipelineDialog';
export { CreateStageDialog } from './dialogs/CreateStageDialog';
export { CreateCardDialog } from './dialogs/CreateCardDialog';
export { CreateContactDialog } from './dialogs/CreateContactDialog';
export { DeleteConfirmDialog } from './dialogs/DeleteConfirmDialog';
export { EditStageDialog } from './dialogs/EditStageDialog';
export { EditClassDialog } from './dialogs/EditClassDialog';
export { ContactDetailsDialog } from './dialogs/ContactDetailsDialog';
