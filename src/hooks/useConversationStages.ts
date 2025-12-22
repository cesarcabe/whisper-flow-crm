import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { Stage, Pipeline } from '@/types/database';

export interface ConversationWithStage {
  id: string;
  contact_id: string;
  stage_id: string | null;
  pipeline_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface StageWithConversations extends Stage {
  conversations: ConversationWithStage[];
}

export interface PipelineWithConversations extends Pipeline {
  stages: StageWithConversations[];
}

export function useConversationStages() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipelineState] = useState<PipelineWithConversations | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipelines = useCallback(async () => {
    if (!user || !workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ConversationStages] Error fetching pipelines:', error);
        toast.error('Erro ao carregar pipelines');
        return;
      }

      setPipelines(data || []);

      // Set first pipeline as active if none selected
      if (data && data.length > 0 && !activePipeline) {
        await fetchPipelineWithConversations(data[0].id);
      }
    } catch (err) {
      console.error('[ConversationStages] Exception fetching pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId, activePipeline]);

  const fetchPipelineWithConversations = async (pipelineId: string) => {
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
        console.error('[ConversationStages] Error fetching pipeline:', pipelineError);
        return;
      }

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (stagesError) {
        console.error('[ConversationStages] Error fetching stages:', stagesError);
        return;
      }

      // Fetch conversations for this pipeline
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          contact_id,
          stage_id,
          pipeline_id,
          last_message_at,
          unread_count,
          contact:contacts(id, name, phone, email, avatar_url)
        `)
        .eq('workspace_id', workspaceId)
        .eq('pipeline_id', pipelineId);

      if (conversationsError) {
        console.error('[ConversationStages] Error fetching conversations:', conversationsError);
        return;
      }

      // Build stages with conversations
      const stagesWithConversations: StageWithConversations[] = (stagesData || []).map(stage => ({
        ...stage,
        conversations: (conversationsData || [])
          .filter(conv => conv.stage_id === stage.id)
          .map(conv => ({
            ...conv,
            contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
          })) as ConversationWithStage[],
      }));

      // Add unassigned conversations (those without stage_id)
      const unassignedConversations = (conversationsData || [])
        .filter(conv => !conv.stage_id)
        .map(conv => ({
          ...conv,
          contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
        })) as ConversationWithStage[];

      // If there are unassigned conversations, add them to the first stage or create a virtual "Sem Estágio" column
      if (unassignedConversations.length > 0 && stagesWithConversations.length > 0) {
        stagesWithConversations[0].conversations = [
          ...unassignedConversations,
          ...stagesWithConversations[0].conversations,
        ];
      }

      setActivePipelineState({
        ...pipelineData,
        stages: stagesWithConversations,
      });
    } catch (err) {
      console.error('[ConversationStages] Exception fetching pipeline:', err);
    }
  };

  const moveConversation = async (conversationId: string, newStageId: string) => {
    if (!activePipeline) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ stage_id: newStageId })
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationStages] Error moving conversation:', error);
        toast.error('Erro ao mover conversa');
        return false;
      }

      await fetchPipelineWithConversations(activePipeline.id);
      return true;
    } catch (err) {
      console.error('[ConversationStages] Exception moving conversation:', err);
      return false;
    }
  };

  const setActivePipeline = async (pipeline: Pipeline) => {
    await fetchPipelineWithConversations(pipeline.id);
  };

  useEffect(() => {
    if (user && workspaceId) {
      fetchPipelines();
    }
  }, [user, workspaceId, fetchPipelines]);

  return {
    pipelines,
    activePipeline,
    loading,
    setActivePipeline,
    fetchPipelines,
    fetchPipelineWithConversations,
    moveConversation,
  };
}
