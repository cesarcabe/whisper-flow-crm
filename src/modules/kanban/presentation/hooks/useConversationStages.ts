import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Stage = Tables<'stages'>;
type Pipeline = Tables<'pipelines'>;

export interface ConversationWithStage {
  id: string | null; // null if no conversation exists yet
  contact_id: string;
  stage_id: string | null;
  pipeline_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  contact: {
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

// Virtual stage for unassigned contacts
export interface LeadInboxStage {
  id: 'lead-inbox';
  name: string;
  color: string;
  position: -1;
  conversations: ConversationWithStage[];
}

export interface PipelineWithConversations extends Pipeline {
  stages: StageWithConversations[];
  leadInbox: LeadInboxStage;
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

      // Fetch group conversations to exclude those contacts
      const { data: groupConversations } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('is_group', true);

      const groupContactIds = new Set((groupConversations || []).map(c => c.contact_id));

      // Fetch ALL contacts (not just those with conversations) - only real, visible contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, phone, email, avatar_url')
        .eq('workspace_id', workspaceId)
        .eq('is_visible', true)
        .eq('is_real', true);

      if (contactsError) {
        console.error('[ConversationStages] Error fetching contacts:', contactsError);
        return;
      }

      // Fetch conversations for this pipeline (excluding groups)
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, contact_id, stage_id, pipeline_id, last_message_at, unread_count, is_group')
        .eq('workspace_id', workspaceId)
        .eq('pipeline_id', pipelineId)
        .or('is_group.is.null,is_group.eq.false');

      if (conversationsError) {
        console.error('[ConversationStages] Error fetching conversations:', conversationsError);
        return;
      }

      // Create a map of contact_id -> conversation for quick lookup
      const conversationsByContact = new Map<string, typeof conversationsData[0]>();
      (conversationsData || []).forEach(conv => {
        conversationsByContact.set(conv.contact_id, conv);
      });

      // Build contact entries with LEFT JOIN logic, excluding group contacts
      const contactEntries: ConversationWithStage[] = (contactsData || [])
        .filter(contact => !groupContactIds.has(contact.id))
        .map(contact => {
          const conversation = conversationsByContact.get(contact.id);
          return {
            id: conversation?.id || null,
            contact_id: contact.id,
            stage_id: conversation?.stage_id || null,
            pipeline_id: conversation?.pipeline_id || null,
            last_message_at: conversation?.last_message_at || null,
            unread_count: conversation?.unread_count || 0,
            contact: contact,
          };
        });

      // Build stages with contacts
      const stagesWithConversations: StageWithConversations[] = (stagesData || []).map(stage => ({
        ...stage,
        conversations: contactEntries.filter(entry => entry.stage_id === stage.id),
      }));

      // Create virtual "Entrada de Leads" stage for unassigned contacts
      const unassignedContacts = contactEntries.filter(entry => !entry.stage_id);
      const leadInbox: LeadInboxStage = {
        id: 'lead-inbox',
        name: 'Entrada de Leads',
        color: '#6B7280', // muted gray
        position: -1,
        conversations: unassignedContacts,
      };

      setActivePipelineState({
        ...pipelineData,
        stages: stagesWithConversations,
        leadInbox,
      });
    } catch (err) {
      console.error('[ConversationStages] Exception fetching pipeline:', err);
    }
  };

  const moveConversation = async (contactId: string, newStageId: string, existingConversationId: string | null) => {
    if (!activePipeline || !workspaceId) return false;

    try {
      if (existingConversationId) {
        // Update existing conversation with stage and pipeline
        const { error } = await supabase
          .from('conversations')
          .update({ 
            stage_id: newStageId,
            pipeline_id: activePipeline.id,
          })
          .eq('id', existingConversationId);

        if (error) {
          console.error('[ConversationStages] Error moving conversation:', error);
          toast.error('Erro ao mover conversa');
          return false;
        }
      } else {
        // Check if there's ANY existing conversation for this contact (regardless of pipeline)
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('contact_id', contactId)
          .limit(1)
          .maybeSingle();

        if (existingConversation) {
          // Update the existing conversation to this pipeline/stage
          const { error } = await supabase
            .from('conversations')
            .update({ 
              stage_id: newStageId,
              pipeline_id: activePipeline.id,
            })
            .eq('id', existingConversation.id);

          if (error) {
            console.error('[ConversationStages] Error updating conversation:', error);
            toast.error('Erro ao atualizar conversa');
            return false;
          }
        } else {
          // Need a whatsapp_number_id to create a conversation - get first available
          const { data: whatsappNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id')
            .eq('workspace_id', workspaceId)
            .limit(1)
            .maybeSingle();

          if (!whatsappNumber) {
            console.error('[ConversationStages] No WhatsApp number available');
            toast.error('Configure um número WhatsApp primeiro');
            return false;
          }

          // Create new conversation for this contact
          const { error } = await supabase
            .from('conversations')
            .insert({
              contact_id: contactId,
              stage_id: newStageId,
              pipeline_id: activePipeline.id,
              workspace_id: workspaceId,
              whatsapp_number_id: whatsappNumber.id,
            });

          if (error) {
            console.error('[ConversationStages] Error creating conversation:', error);
            toast.error('Erro ao criar conversa');
            return false;
          }
        }
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

  /**
   * Updates a conversation's stage in the database.
   * Does NOT trigger toast - caller is responsible for side effects.
   * @returns true on success, false on error
   */
  const updateConversationStage = async (conversationId: string, stageId: string | null): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ stage_id: stageId })
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationStages] Error updating conversation stage:', error);
        return false;
      }

      // Refresh pipeline data after update
      if (activePipeline) {
        await fetchPipelineWithConversations(activePipeline.id);
      }

      return true;
    } catch (err) {
      console.error('[ConversationStages] Exception updating conversation stage:', err);
      return false;
    }
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
    updateConversationStage,
  };
}
