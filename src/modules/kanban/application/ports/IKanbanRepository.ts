import type { Tables } from '@/integrations/supabase/types';
import type { PipelineWithStages, Card, StageWithCards } from '@/types/ui';

type Pipeline = Tables<'pipelines'>;
type Stage = Tables<'stages'>;

export interface IKanbanRepository {
  // Pipeline operations
  fetchPipelines(workspaceId: string): Promise<Pipeline[]>;
  fetchPipelineWithStages(pipelineId: string, workspaceId: string): Promise<PipelineWithStages | null>;
  createPipeline(name: string, workspaceId: string, createdBy: string, description?: string): Promise<Pipeline | null>;
  updatePipeline(id: string, workspaceId: string, updates: Partial<Pipeline>): Promise<boolean>;
  deletePipeline(id: string, workspaceId: string): Promise<boolean>;

  // Stage operations
  createStage(pipelineId: string, workspaceId: string, name: string, color: string, position: number): Promise<boolean>;
  updateStage(stageId: string, data: Partial<Stage>): Promise<boolean>;
  deleteStage(id: string): Promise<boolean>;
  reorderStages(stageIds: string[]): Promise<boolean>;

  // Card operations
  moveCard(cardId: string, newStageId: string, newPosition: number): Promise<boolean>;
  createCard(stageId: string, workspaceId: string, contactId: string, title: string, position: number, description?: string): Promise<Card | null>;
  updateCard(id: string, updates: Partial<Card>): Promise<boolean>;
  deleteCard(id: string): Promise<boolean>;
}
