/**
 * Infrastructure: Admin Reports Repository
 * Fetches admin-level metrics via RPCs
 */
import { supabase } from '@/integrations/supabase/client';
import type { AdminOverviewMetrics, AgentPerformanceRow, AdsVsOrganicPoint } from '../../domain/entities/AdminMetrics';

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
}

class AdminReportsRepositoryImpl {
  async getOverviewMetrics(
    workspaceId: string,
    userId: string,
    period: ReportPeriod
  ): Promise<AdminOverviewMetrics> {
    const { data, error } = await supabase.rpc('get_admin_overview_metrics', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_start_date: period.startDate.toISOString(),
      p_end_date: period.endDate.toISOString(),
    });

    if (error) {
      console.error('[AdminReportsRepository] Error fetching overview:', error);
      throw error;
    }

    const row = data?.[0];
    return {
      totalNewLeads: Number(row?.total_new_leads ?? 0),
      pendingReplies: Number(row?.pending_replies ?? 0),
      salesThisMonth: Number(row?.sales_this_month ?? 0),
      adsLeads: Number(row?.ads_leads ?? 0),
      organicLeads: Number(row?.organic_leads ?? 0),
      abandonedConversations: Number(row?.abandoned_conversations ?? 0),
    };
  }

  async getAgentPerformance(
    workspaceId: string,
    userId: string,
    period: ReportPeriod
  ): Promise<AgentPerformanceRow[]> {
    const { data, error } = await supabase.rpc('get_agent_performance_ranking', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_start_date: period.startDate.toISOString(),
      p_end_date: period.endDate.toISOString(),
    });

    if (error) {
      console.error('[AdminReportsRepository] Error fetching agent performance:', error);
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      agentUserId: row.agent_user_id,
      agentName: row.agent_name ?? 'Usuário',
      avgResponseTimeMinutes: Number(row.avg_response_time_minutes ?? 0),
      leadsCount: Number(row.leads_count ?? 0),
      pendingReplies: Number(row.pending_replies ?? 0),
      salesCount: Number(row.sales_count ?? 0),
    }));
  }

  async getAdsVsOrganicTimeseries(
    workspaceId: string,
    userId: string,
    period: ReportPeriod
  ): Promise<AdsVsOrganicPoint[]> {
    const { data, error } = await supabase.rpc('get_ads_vs_organic_timeseries', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_start_date: period.startDate.toISOString(),
      p_end_date: period.endDate.toISOString(),
    });

    if (error) {
      console.error('[AdminReportsRepository] Error fetching ads vs organic:', error);
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      date: row.report_date,
      adsLeads: Number(row.ads_leads ?? 0),
      organicLeads: Number(row.organic_leads ?? 0),
    }));
  }
}

export const adminReportsRepository = new AdminReportsRepositoryImpl();
