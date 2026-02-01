import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { PipelineWithStages, Card, StageWithCards } from '@/types/ui';
import type { IKanbanRepository } from '../../application/ports/IKanbanRepository';

type Pipeline = Tables<'pipelines'>;
type Stage = Tables<'stages'>;

export class SupabaseKanbanRepository implements IKanbanRepository {
  async fetchPipelines(workspaceId: string): Promise<Pipeline[]> {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[KanbanRepository] Error fetching pipelines:', error);
      throw error;
    }

    return data || [];
  }

  async fetchPipelineWithStages(pipelineId: string, workspaceId: string): Promise<PipelineWithStages | null> {
    // Fetch pipeline
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', pipelineId)
      .eq('workspace_id', workspaceId)
      .single();

    if (pipelineError) {
      console.error('[KanbanRepository] Error fetching pipeline:', pipelineError);
      return null;
    }

    // Fetch stages
    const { data: stagesData, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true });

    if (stagesError) {
      console.error('[KanbanRepository] Error fetching stages:', stagesError);
      return null;
    }

    // Fetch cards for all stages
    const stageIds = stagesData?.map(s => s.id) || [];

    let cardsData: Card[] = [];
    if (stageIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select(`*, contact:contacts(*)`)
        .in('stage_id', stageIds)
        .order('position', { ascending: true });

      if (cardsError) {
        console.error('[KanbanRepository] Error fetching cards:', cardsError);
      } else {
        cardsData = (cards || []) as Card[];
      }
    }

    const stagesWithCards: StageWithCards[] = (stagesData || []).map(stage => ({
      ...stage,
      cards: cardsData.filter(card => card.stage_id === stage.id),
    }));

    return {
      ...pipelineData,
      stages: stagesWithCards,
    };
  }

  async createPipeline(name: string, workspaceId: string, createdBy: string, description?: string): Promise<Pipeline | null> {
    const { data, error } = await supabase
      .from('pipelines')
      .insert({
        name,
        description,
        workspace_id: workspaceId,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error('[KanbanRepository] Error creating pipeline:', error);
      return null;
    }

    return data;
  }

  async updatePipeline(id: string, workspaceId: string, updates: Partial<Pipeline>): Promise<boolean> {
    const { error } = await supabase
      .from('pipelines')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('[KanbanRepository] Error updating pipeline:', error);
      return false;
    }

    return true;
  }

  async deletePipeline(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('[KanbanRepository] Error deleting pipeline:', error);
      return false;
    }

    return true;
  }

  async createStage(pipelineId: string, workspaceId: string, name: string, color: string, position: number): Promise<boolean> {
    const { error } = await supabase
      .from('stages')
      .insert({
        pipeline_id: pipelineId,
        workspace_id: workspaceId,
        name,
        color,
        position,
      });

    if (error) {
      console.error('[KanbanRepository] Error creating stage:', error);
      return false;
    }

    return true;
  }

  async updateStage(stageId: string, data: Partial<Stage>): Promise<boolean> {
    const { error } = await supabase
      .from('stages')
      .update(data)
      .eq('id', stageId);

    if (error) {
      console.error('[KanbanRepository] Error updating stage:', error);
      return false;
    }

    return true;
  }

  async deleteStage(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[KanbanRepository] Error deleting stage:', error);
      return false;
    }

    return true;
  }

  async reorderStages(stageIds: string[]): Promise<boolean> {
    const updates = stageIds.map((stageId, index) =>
      supabase
        .from('stages')
        .update({ position: index })
        .eq('id', stageId)
    );

    const results = await Promise.all(updates);
    return !results.some(r => r.error);
  }

  async moveCard(cardId: string, newStageId: string, newPosition: number): Promise<boolean> {
    const { error } = await supabase
      .from('cards')
      .update({
        stage_id: newStageId,
        position: newPosition,
      })
      .eq('id', cardId);

    if (error) {
      console.error('[KanbanRepository] Error moving card:', error);
      return false;
    }

    return true;
  }

  async createCard(stageId: string, workspaceId: string, contactId: string, title: string, position: number, description?: string): Promise<Card | null> {
    const { data, error } = await supabase
      .from('cards')
      .insert({
        stage_id: stageId,
        workspace_id: workspaceId,
        contact_id: contactId,
        title,
        description,
        position,
      })
      .select()
      .single();

    if (error) {
      console.error('[KanbanRepository] Error creating card:', error);
      return null;
    }

    return data as Card;
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<boolean> {
    const { error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[KanbanRepository] Error updating card:', error);
      return false;
    }

    return true;
  }

  async deleteCard(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[KanbanRepository] Error deleting card:', error);
      return false;
    }

    return true;
  }
}
