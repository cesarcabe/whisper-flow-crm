/**
 * @deprecated Este hook foi movido para @/modules/kanban/presentation/hooks/useKanbanState
 * Este arquivo existe apenas para compatibilidade com imports existentes.
 * Favor atualizar para: import { useKanbanState } from '@/modules/kanban';
 */
export { 
  useKanbanState,
  type KanbanDialogState,
  type EditStageState,
  type EditClassState,
  type SelectedItemsState,
  type KanbanView,
} from '@/modules/kanban/presentation/hooks/useKanbanState';
