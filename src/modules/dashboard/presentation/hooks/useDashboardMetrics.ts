import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface NewLead {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string | null;
  createdAt: string;
  whatsappNumberName: string | null;
}

export interface UnreadSummary {
  whatsappNumberId: string;
  whatsappNumberName: string;
  unreadCount: number;
}

export interface PipelineStageSummary {
  stageId: string;
  stageName: string;
  stageColor: string | null;
  cardCount: number;
}

export interface PipelineSummary {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStageSummary[];
}

export interface DashboardMetrics {
  newLeads: NewLead[];
  unreadSummary: UnreadSummary[];
  pipelineSummary: PipelineSummary | null;
  totalUnread: number;
}

export function useDashboardMetrics() {
  const { workspaceId } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    newLeads: [],
    unreadSummary: [],
    pipelineSummary: null,
    totalUnread: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Flag to prevent refetch on focus/visibility change
  const hasInitialFetchRef = useRef<boolean>(false);

  const fetchMetrics = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch new leads (valid contacts created in last 24h)
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);

      // First get new contacts from last 24h
      const { data: newContactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, phone, avatar_url, created_at')
        .eq('workspace_id', workspaceId)
        .eq('is_visible', true)
        .eq('is_real', true)
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (contactsError) throw contactsError;

      // Get conversation info for these contacts
      const contactIds = (newContactsData || []).map(c => c.id);
      let conversationsMap: Record<string, { id: string; whatsappName: string | null }> = {};

      if (contactIds.length > 0) {
        const { data: convData } = await supabase
          .from('conversations')
          .select(`
            id,
            contact_id,
            whatsapp_number:whatsapp_numbers(internal_name)
          `)
          .eq('workspace_id', workspaceId)
          .in('contact_id', contactIds);

        (convData || []).forEach((conv: any) => {
          conversationsMap[conv.contact_id] = {
            id: conv.id,
            whatsappName: conv.whatsapp_number?.internal_name || null,
          };
        });
      }

      const newLeads: NewLead[] = (newContactsData || []).map((contact: any) => ({
        id: conversationsMap[contact.id]?.id || contact.id,
        contactName: contact.name || 'Desconhecido',
        contactPhone: contact.phone || '',
        contactAvatar: contact.avatar_url,
        createdAt: contact.created_at,
        whatsappNumberName: conversationsMap[contact.id]?.whatsappName || null,
      }));

      // 2. Fetch unread summary by WhatsApp number
      const { data: whatsappNumbers, error: waError } = await supabase
        .from('whatsapp_numbers')
        .select('id, internal_name')
        .eq('workspace_id', workspaceId);

      if (waError) throw waError;

      const unreadSummary: UnreadSummary[] = [];
      let totalUnread = 0;

      for (const wa of whatsappNumbers || []) {
        const { data: convs } = await supabase
          .from('conversations')
          .select('unread_count')
          .eq('workspace_id', workspaceId)
          .eq('whatsapp_number_id', wa.id)
          .gt('unread_count', 0);

        const count = (convs || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
        if (count > 0) {
          unreadSummary.push({
            whatsappNumberId: wa.id,
            whatsappNumberName: wa.internal_name,
            unreadCount: count,
          });
          totalUnread += count;
        }
      }

      // 3. Fetch pipeline summary (first pipeline with stages)
      const { data: pipelines, error: pipeError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (pipeError) throw pipeError;

      let pipelineSummary: PipelineSummary | null = null;

      if (pipelines && pipelines.length > 0) {
        const pipeline = pipelines[0];

        const { data: stages, error: stagesError } = await supabase
          .from('stages')
          .select('id, name, color, position')
          .eq('pipeline_id', pipeline.id)
          .order('position', { ascending: true });

        if (stagesError) throw stagesError;

        const stagesWithCounts: PipelineStageSummary[] = [];

        for (const stage of stages || []) {
          const { count } = await supabase
            .from('cards')
            .select('*', { count: 'exact', head: true })
            .eq('stage_id', stage.id);

          stagesWithCounts.push({
            stageId: stage.id,
            stageName: stage.name,
            stageColor: stage.color,
            cardCount: count || 0,
          });
        }

        pipelineSummary = {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          stages: stagesWithCounts,
        };
      }

      setMetrics({
        newLeads,
        unreadSummary,
        pipelineSummary,
        totalUnread,
      });
    } catch (err: any) {
      console.error('[useDashboardMetrics] Error:', err);
      setError(err.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Initial fetch - only once per workspace
  useEffect(() => {
    if (!workspaceId) {
      hasInitialFetchRef.current = false;
      setLoading(false);
      return;
    }
    
    // Only fetch if we haven't fetched for this workspace yet
    if (!hasInitialFetchRef.current) {
      hasInitialFetchRef.current = true;
      fetchMetrics();
    }
  }, [workspaceId, fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
