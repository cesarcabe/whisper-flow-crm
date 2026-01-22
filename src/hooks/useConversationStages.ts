/**
 * @deprecated Este hook foi movido para @/modules/kanban/presentation/hooks/useConversationStages
 * Este arquivo existe apenas para compatibilidade com imports existentes.
 * Favor atualizar para: import { useConversationStages } from '@/modules/kanban';
 */
export { 
  useConversationStages,
  type ConversationWithStage,
  type StageWithConversations,
  type LeadInboxStage,
  type PipelineWithConversations,
} from '@/modules/kanban/presentation/hooks/useConversationStages';
