import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pipeline, Stage, Card, PipelineWithStages, StageWithCards } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePipelines() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<PipelineWithStages | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipelines = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[CRM Kanban] Error fetching pipelines:', error);
        toast.error('Erro ao carregar pipelines');
        return;
      }

      setPipelines(data || []);
      
      // Set first pipeline as active if none selected
      if (data && data.length > 0 && !activePipeline) {
        await fetchPipelineWithStages(data[0].id);
      }
    } catch (err) {
      console.error('[CRM Kanban] Exception fetching pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activePipeline]);

  const fetchPipelineWithStages = async (pipelineId: string) => {
    if (!user) return;

    try {
      // Fetch pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
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
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('pipelines')
        .insert({
          name,
          description,
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
    try {
      const { error } = await supabase
        .from('pipelines')
        .update(updates)
        .eq('id', id);

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
    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id);

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
    try {
      // Get max position
      const maxPosition = activePipeline?.stages.reduce(
        (max, s) => Math.max(max, s.position),
        -1
      ) ?? -1;

      const { error } = await supabase
        .from('stages')
        .insert({
          pipeline_id: pipelineId,
          name,
          color: color || '#6B7280',
          position: maxPosition + 1,
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

  const updateStage = async (id: string, updates: Partial<Stage>) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('stages')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('[CRM Kanban] Error updating stage:', error);
        toast.error('Erro ao atualizar estágio');
        return false;
      }

      await fetchPipelineWithStages(activePipeline.id);
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
    if (!activePipeline) return null;

    try {
      // Get max position in stage
      const stage = activePipeline.stages.find(s => s.id === stageId);
      const maxPosition = stage?.cards.reduce((max, c) => Math.max(max, c.position), -1) ?? -1;

      const { data, error } = await supabase
        .from('cards')
        .insert({
          stage_id: stageId,
          contact_id: contactId,
          title,
          description,
          position: maxPosition + 1,
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
    if (user) {
      fetchPipelines();
    }
  }, [user, fetchPipelines]);

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
    moveCard,
    createCard,
    updateCard,
    deleteCard,
  };
}
