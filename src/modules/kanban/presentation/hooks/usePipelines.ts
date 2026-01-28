import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { StageWithCards, PipelineWithStages, Card } from '@/types/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { calculateNextStagePosition, calculateNextCardPosition } from '@/core/use-cases/pipeline/calculateCardPosition';

type Pipeline = Tables<'pipelines'>;
type Stage = Tables<'stages'>;

export function usePipelines() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<PipelineWithStages | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const activePipelineRef = useRef(activePipeline);
  activePipelineRef.current = activePipeline;

  const fetchPipelines = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[CRM Kanban] Error fetching pipelines:', error);
        toast.error('Erro ao carregar pipelines');
        return;
      }

      setPipelines(data || []);

      // Set first pipeline as active if none selected
      if (data && data.length > 0 && !activePipelineRef.current) {
        await fetchPipelineWithStages(data[0].id);
      }
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  const fetchPipelineWithStages = async (pipelineId: string) => {
    if (!user || !workspaceId) return;

    try {
      // Fetch pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('workspace_id', workspaceId)
        .single();

      if (pipelineError) {
        console.error('[CRM Kanban] Error fetching pipeline:', pipelineError);
        return;
      }

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (stagesError) {
        console.error('[CRM Kanban] Error fetching stages:', stagesError);
        return;
      }

      // Fetch cards for all stages
      const stageIds = stagesData?.map(s => s.id) || [];
      
      let cardsData: Card[] = [];
      if (stageIds.length > 0) {
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select(`
            *,
            contact:contacts(*)
          `)
          .in('stage_id', stageIds)
          .order('position', { ascending: true });

        if (cardsError) {
          console.error('[CRM Kanban] Error fetching cards:', cardsError);
        } else {
          cardsData = (cards || []) as Card[];
        }
      }

      // Build stages with cards
      const stagesWithCards: StageWithCards[] = (stagesData || []).map(stage => ({
        ...stage,
        cards: cardsData.filter(card => card.stage_id === stage.id),
      }));

      setActivePipeline({
        ...pipelineData,
        stages: stagesWithCards,
      });
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching pipeline with stages:', err);
    }
  };

  const createPipeline = async (name: string, description?: string) => {
    if (!user || !workspaceId) return null;

    try {
      const { data, error } = await supabase
        .from('pipelines')
        .insert({
          name,
          description,
          workspace_id: workspaceId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[CRM Kanban] Error creating pipeline:', error);
        toast.error('Erro ao criar pipeline');
        return null;
      }

      toast.success('Pipeline criado com sucesso!');
      await fetchPipelines();
      return data;
    } catch (err) {
      console.error('[CRM Kanban] Exception creating pipeline:', err);
      return null;
    }
  };

  const updatePipeline = async (id: string, updates: Partial<Pipeline>) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('pipelines')
        .update(updates)
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[CRM Kanban] Error updating pipeline:', error);
        toast.error('Erro ao atualizar pipeline');
        return false;
      }

      toast.success('Pipeline atualizado!');
      await fetchPipelines();
      if (activePipeline?.id === id) {
        await fetchPipelineWithStages(id);
      }
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception updating pipeline:', err);
      return false;
    }
  };

  const deletePipeline = async (id: string) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[CRM Kanban] Error deleting pipeline:', error);
        toast.error('Erro ao deletar pipeline');
        return false;
      }

      toast.success('Pipeline deletado!');
      if (activePipeline?.id === id) {
        setActivePipeline(null);
      }
      await fetchPipelines();
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception deleting pipeline:', err);
      return false;
    }
  };

  // Stage operations
  const createStage = async (pipelineId: string, name: string, color?: string) => {
    if (!workspaceId) return false;

    try {
      // Get next position using pure function
      const nextPosition = calculateNextStagePosition(activePipeline?.stages || []);

      const { error } = await supabase
        .from('stages')
        .insert({
          pipeline_id: pipelineId,
          workspace_id: workspaceId,
          name,
          color: color || '#6B7280',
          position: nextPosition,
        });

      if (error) {
        console.error('[CRM Kanban] Error creating stage:', error);
        toast.error('Erro ao criar estágio');
        return false;
      }

      toast.success('Estágio criado!');
      await fetchPipelineWithStages(pipelineId);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception creating stage:', err);
      return false;
    }
  };

  /**
   * Updates a stage in the database.
   * Does NOT trigger toast or refetch - caller is responsible for side effects.
   * @returns true on success, false on error
   */
  const updateStage = async (stageId: string, data: Partial<Stage>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('stages')
        .update(data)
        .eq('id', stageId);

      if (error) {
        console.error('[CRM Kanban] Error updating stage:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception updating stage:', err);
      return false;
    }
  };

  const deleteStage = async (id: string) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[CRM Kanban] Error deleting stage:', error);
        toast.error('Erro ao deletar estágio');
        return false;
      }

      toast.success('Estágio deletado!');
      await fetchPipelineWithStages(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception deleting stage:', err);
      return false;
    }
  };

  /**
   * Reorders stages by updating their positions.
   * @param stageIds - Array of stage IDs in the new order
   * @returns true on success, false on error
   */
  const reorderStages = async (stageIds: string[]): Promise<boolean> => {
    if (!activePipeline) return false;

    try {
      // Update each stage with its new position
      const updates = stageIds.map((stageId, index) =>
        supabase
          .from('stages')
          .update({ position: index })
          .eq('id', stageId)
      );

      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);

      if (hasError) {
        console.error('[CRM Kanban] Error reordering stages');
        toast.error('Erro ao reordenar estágios');
        return false;
      }

      await fetchPipelineWithStages(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception reordering stages:', err);
      return false;
    }
  };

  // Card operations
  const moveCard = async (cardId: string, newStageId: string, newPosition: number) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('cards')
        .update({
          stage_id: newStageId,
          position: newPosition,
        })
        .eq('id', cardId);

      if (error) {
        console.error('[CRM Kanban] Error moving card:', error);
        toast.error('Erro ao mover card');
        return false;
      }

      await fetchPipelineWithStages(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception moving card:', err);
      return false;
    }
  };

  const createCard = async (stageId: string, contactId: string, title: string, description?: string) => {
    if (!activePipeline || !workspaceId) return null;

    try {
      // Get next position using pure function
      const stage = activePipeline.stages.find(s => s.id === stageId);
      const nextPosition = calculateNextCardPosition(stage?.cards || []);

      const { data, error } = await supabase
        .from('cards')
        .insert({
          stage_id: stageId,
          workspace_id: workspaceId,
          contact_id: contactId,
          title,
          description,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) {
        console.error('[CRM Kanban] Error creating card:', error);
        toast.error('Erro ao criar card');
        return null;
      }

      toast.success('Card criado!');
      await fetchPipelineWithStages(activePipeline.id);
      return data;
    } catch (err) {
      console.error('[CRM Kanban] Exception creating card:', err);
      return null;
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('[CRM Kanban] Error updating card:', error);
        toast.error('Erro ao atualizar card');
        return false;
      }

      toast.success('Card atualizado!');
      await fetchPipelineWithStages(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception updating card:', err);
      return false;
    }
  };

  const deleteCard = async (id: string) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[CRM Kanban] Error deleting card:', error);
        toast.error('Erro ao deletar card');
        return false;
      }

      toast.success('Card deletado!');
      await fetchPipelineWithStages(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[CRM Kanban] Exception deleting card:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user && workspaceId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchPipelines();
    }
  }, [user, workspaceId, fetchPipelines]);

  // Reset fetch flag when workspace changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [workspaceId]);

  return {
    pipelines,
    activePipeline,
    loading,
    setActivePipeline: (pipeline: Pipeline) => fetchPipelineWithStages(pipeline.id),
    fetchPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    moveCard,
    createCard,
    updateCard,
    deleteCard,
  };
}
