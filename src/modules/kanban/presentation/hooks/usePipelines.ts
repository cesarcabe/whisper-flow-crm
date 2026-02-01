import { useState, useEffect, useCallback, useRef } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { PipelineWithStages, Card } from '@/types/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { calculateNextStagePosition, calculateNextCardPosition } from '@/core/use-cases/pipeline/calculateCardPosition';
import { SupabaseKanbanRepository } from '../../infrastructure/repositories/SupabaseKanbanRepository';

type Pipeline = Tables<'pipelines'>;
type Stage = Tables<'stages'>;

const kanbanRepository = new SupabaseKanbanRepository();

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
      const data = await kanbanRepository.fetchPipelines(workspaceId);
      setPipelines(data);

      if (data.length > 0 && !activePipelineRef.current) {
        await fetchPipelineWithStages(data[0].id);
      }
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching pipelines:', err);
      toast.error('Erro ao carregar pipelines');
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  const fetchPipelineWithStages = async (pipelineId: string) => {
    if (!user || !workspaceId) return;

    try {
      const result = await kanbanRepository.fetchPipelineWithStages(pipelineId, workspaceId);
      if (result) {
        setActivePipeline(result);
      }
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching pipeline with stages:', err);
    }
  };

  const createPipeline = async (name: string, description?: string) => {
    if (!user || !workspaceId) return null;

    try {
      const data = await kanbanRepository.createPipeline(name, workspaceId, user.id, description);
      if (!data) {
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
      const success = await kanbanRepository.updatePipeline(id, workspaceId, updates);
      if (!success) {
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
      const success = await kanbanRepository.deletePipeline(id, workspaceId);
      if (!success) {
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

  const createStage = async (pipelineId: string, name: string, color?: string) => {
    if (!workspaceId) return false;

    try {
      const nextPosition = calculateNextStagePosition(activePipeline?.stages || []);
      const success = await kanbanRepository.createStage(
        pipelineId, workspaceId, name, color || '#6B7280', nextPosition
      );

      if (!success) {
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

  const updateStage = async (stageId: string, data: Partial<Stage>): Promise<boolean> => {
    try {
      return await kanbanRepository.updateStage(stageId, data);
    } catch (err) {
      console.error('[CRM Kanban] Exception updating stage:', err);
      return false;
    }
  };

  const deleteStage = async (id: string) => {
    if (!activePipeline) return false;

    try {
      const success = await kanbanRepository.deleteStage(id);
      if (!success) {
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

  const reorderStages = async (stageIds: string[]): Promise<boolean> => {
    if (!activePipeline) return false;

    try {
      const success = await kanbanRepository.reorderStages(stageIds);
      if (!success) {
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

  const moveCard = async (cardId: string, newStageId: string, newPosition: number) => {
    if (!activePipeline) return false;

    try {
      const success = await kanbanRepository.moveCard(cardId, newStageId, newPosition);
      if (!success) {
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
      const stage = activePipeline.stages.find(s => s.id === stageId);
      const nextPosition = calculateNextCardPosition(stage?.cards || []);
      const data = await kanbanRepository.createCard(
        stageId, workspaceId, contactId, title, nextPosition, description
      );

      if (!data) {
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
      const success = await kanbanRepository.updateCard(id, updates);
      if (!success) {
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
      const success = await kanbanRepository.deleteCard(id);
      if (!success) {
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
