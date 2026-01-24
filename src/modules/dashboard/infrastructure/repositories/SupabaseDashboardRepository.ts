/**
 * Infrastructure: Supabase Dashboard Repository
 * Implements dashboard metrics fetching via RPCs
 */
import { supabase } from '@/integrations/supabase/client';
import type { DashboardRepository, DashboardPeriod, PaginationParams } from '../../domain/ports/DashboardRepository';
import type { AgentDashboardMetrics, PendingReply } from '../../domain/entities/AgentDashboardMetrics';

class SupabaseDashboardRepositoryImpl implements DashboardRepository {
  async getAgentMetrics(
    workspaceId: string,
    userId: string,
    period: DashboardPeriod
  ): Promise<AgentDashboardMetrics> {
    const { data, error } = await supabase.rpc('get_agent_dashboard_metrics', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_start_date: period.startDate.toISOString(),
      p_end_date: period.endDate.toISOString(),
    });

    if (error) {
      console.error('[DashboardRepository] Error fetching agent metrics:', error);
      throw error;
    }

    const row = data?.[0];
    return {
      leadsInPipeline: Number(row?.leads_in_pipeline ?? 0),
      pendingReplies: Number(row?.pending_replies ?? 0),
      salesThisMonth: Number(row?.sales_this_month ?? 0),
    };
  }

  async getPendingReplies(
    workspaceId: string,
    userId: string,
    pagination: PaginationParams
  ): Promise<PendingReply[]> {
    const { data, error } = await supabase.rpc('get_pending_replies_list', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_limit: pagination.limit,
      p_offset: pagination.offset,
    });

    if (error) {
      console.error('[DashboardRepository] Error fetching pending replies:', error);
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      conversationId: row.conversation_id,
      contactName: row.contact_name ?? 'Desconhecido',
      remoteJid: row.remote_jid ?? '',
      lastMessageBody: row.last_message_body ?? '',
      lastMessageAt: new Date(row.last_message_at),
      waitingMinutes: Number(row.waiting_minutes ?? 0),
    }));
  }
}

export const dashboardRepository = new SupabaseDashboardRepositoryImpl();
