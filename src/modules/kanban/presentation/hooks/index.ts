/**
 * Kanban Presentation Hooks
 * 
 * Hooks para gerenciar estado e lógica do Kanban na camada de apresentação.
 */

export { usePipelines } from './usePipelines';
export { useKanbanState } from './useKanbanState';
export type { KanbanDialogState, EditStageState, EditClassState, SelectedItemsState, KanbanView as KanbanViewType } from './useKanbanState';
export { useConversationStages } from './useConversationStages';
export type { ConversationWithStage, StageWithConversations, LeadInboxStage, PipelineWithConversations } from './useConversationStages';
export { useContactClasses } from './useContactClasses';
export type { ContactClass, ContactWithClass } from './useContactClasses';
export { useGroupClasses } from './useGroupClasses';
export type { GroupWithClass } from './useGroupClasses';
export { useGroupConversations } from './useGroupConversations';
export type { GroupConversation } from './useGroupConversations';
