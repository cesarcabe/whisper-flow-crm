/**
 * Supabase Reports Repository
 * Implements ReportsRepository using Supabase/Postgres analytics schema
 */
import { supabase } from '@/integrations/supabase/client';
import type { ReportsRepository } from '../../domain/ports/ReportsRepository';
import type { ReportFilter, ReportPagination } from '../../domain/entities/ReportFilter';
import type { MessageKpis, MessageTimeseriesPoint, MessageReportTableResult, MessageReportRow } from '../../domain/entities/MessageReportData';
import type { AdKpis, AdTimeseriesPoint, TopAdData, AdReportTableResult, AdReportRow } from '../../domain/entities/AdReportData';

interface MessageKpisRow {
  total_messages: number;
  messages_received: number;
  messages_sent: number;
  unique_contacts: number;
  active_conversations: number;
}

interface MessageTimeseriesRow {
  report_date: string;
  messages: number;
  contacts: number;
}

interface MessageTableRow {
  event_id: string;
  event_timestamp: string;
  push_name: string | null;
  remote_jid: string;
  message_type: string | null;
  status: string | null;
  from_me: boolean;
}

interface AdKpisRow {
  total_ad_leads: number;
  ad_messages: number;
  ad_conversations: number;
  top_conversion_source: string | null;
}

interface AdTimeseriesRow {
  report_date: string;
  leads: number;
  messages: number;
}

interface TopAdRow {
  ad_title: string | null;
  ad_source_id: string | null;
  lead_count: number;
}

interface AdTableRow {
  event_id: string;
  event_timestamp: string;
  push_name: string | null;
  remote_jid: string;
  conversion_source: string | null;
  entry_point_app: string | null;
  entry_point_source: string | null;
  ad_title: string | null;
  ad_source_id: string | null;
  ad_media_type: number | null;
  show_ad_attribution: boolean | null;
  automated_greeting_shown: boolean | null;
}

/**
 * Type assertion helper for Supabase RPC calls.
 * Supabase's auto-generated types don't include custom RPCs,
 * so we need to cast the function name and params.
 */
const rpc = (name: string, params: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc(name as any, params as any);

export class SupabaseReportsRepository implements ReportsRepository {
  
  private formatDateForQuery(date: Date): string {
    return date.toISOString();
  }

  // =====================
  // MESSAGE REPORTS (non-ad)
  // =====================

  async getMessageKpis(filter: ReportFilter): Promise<MessageKpis> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);

    const { data, error } = await rpc('get_message_report_kpis', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching message KPIs:', error);
      return {
        totalMessages: 0,
        messagesReceived: 0,
        messagesSent: 0,
        uniqueContacts: 0,
        activeConversations: 0,
        responseRate: 0
      };
    }

    const rows = data as MessageKpisRow[] | null;
    const result = rows?.[0];
    const received = Number(result?.messages_received) || 0;
    const sent = Number(result?.messages_sent) || 0;
    
    return {
      totalMessages: Number(result?.total_messages) || 0,
      messagesReceived: received,
      messagesSent: sent,
      uniqueContacts: Number(result?.unique_contacts) || 0,
      activeConversations: Number(result?.active_conversations) || 0,
      responseRate: received > 0 ? Math.round((sent / received) * 100) : 0
    };
  }

  async getMessageTimeseries(filter: ReportFilter): Promise<MessageTimeseriesPoint[]> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);

    const { data, error } = await rpc('get_message_report_timeseries', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching message timeseries:', error);
      return [];
    }

    const rows = data as MessageTimeseriesRow[] | null;
    return (rows || []).map((row) => ({
      date: row.report_date,
      messages: Number(row.messages) || 0,
      contacts: Number(row.contacts) || 0
    }));
  }

  async getMessageTable(filter: ReportFilter, pagination: ReportPagination): Promise<MessageReportTableResult> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);
    const offset = (pagination.page - 1) * pagination.pageSize;

    const { data, error } = await rpc('get_message_report_table', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: pagination.pageSize,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching message table:', error);
      return { rows: [], totalCount: 0 };
    }

    const tableData = data as MessageTableRow[] | null;
    const rows: MessageReportRow[] = (tableData || []).map((row) => ({
      id: row.event_id,
      timestamp: row.event_timestamp,
      pushName: row.push_name,
      remoteJid: row.remote_jid || '',
      messageType: row.message_type,
      status: row.status,
      fromMe: row.from_me ?? false
    }));

    // Get total count
    const { data: countData } = await rpc('get_message_report_count', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    return {
      rows,
      totalCount: Number(countData) || rows.length
    };
  }

  // =====================
  // AD REPORTS
  // =====================

  async getAdKpis(filter: ReportFilter): Promise<AdKpis> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);

    const { data, error } = await rpc('get_ad_report_kpis', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching ad KPIs:', error);
      return {
        totalAdLeads: 0,
        adMessages: 0,
        adConversations: 0,
        topConversionSource: null
      };
    }

    const rows = data as AdKpisRow[] | null;
    const result = rows?.[0];
    
    return {
      totalAdLeads: Number(result?.total_ad_leads) || 0,
      adMessages: Number(result?.ad_messages) || 0,
      adConversations: Number(result?.ad_conversations) || 0,
      topConversionSource: result?.top_conversion_source || null
    };
  }

  async getAdTimeseries(filter: ReportFilter): Promise<AdTimeseriesPoint[]> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);

    const { data, error } = await rpc('get_ad_report_timeseries', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching ad timeseries:', error);
      return [];
    }

    const rows = data as AdTimeseriesRow[] | null;
    return (rows || []).map((row) => ({
      date: row.report_date,
      leads: Number(row.leads) || 0,
      messages: Number(row.messages) || 0
    }));
  }

  async getTopAds(filter: ReportFilter, limit: number = 5): Promise<TopAdData[]> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);

    const { data, error } = await rpc('get_top_ads', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching top ads:', error);
      return [];
    }

    const rows = data as TopAdRow[] | null;
    return (rows || []).map((row) => ({
      adTitle: row.ad_title,
      adSourceId: row.ad_source_id,
      leadCount: Number(row.lead_count) || 0
    }));
  }

  async getAdTable(filter: ReportFilter, pagination: ReportPagination): Promise<AdReportTableResult> {
    const startDate = this.formatDateForQuery(filter.startDate);
    const endDate = this.formatDateForQuery(filter.endDate);
    const offset = (pagination.page - 1) * pagination.pageSize;

    const { data, error } = await rpc('get_ad_report_table', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: pagination.pageSize,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching ad table:', error);
      return { rows: [], totalCount: 0 };
    }

    const tableData = data as AdTableRow[] | null;
    const rows: AdReportRow[] = (tableData || []).map((row) => ({
      id: row.event_id,
      timestamp: row.event_timestamp,
      pushName: row.push_name,
      remoteJid: row.remote_jid || '',
      conversionSource: row.conversion_source,
      entryPointApp: row.entry_point_app,
      entryPointSource: row.entry_point_source,
      adTitle: row.ad_title,
      adSourceId: row.ad_source_id,
      adMediaType: row.ad_media_type,
      showAdAttribution: row.show_ad_attribution,
      automatedGreetingShown: row.automated_greeting_shown
    }));

    // Get total count
    const { data: countData } = await rpc('get_ad_report_count', {
      p_workspace_id: filter.workspaceId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    return {
      rows,
      totalCount: Number(countData) || rows.length
    };
  }
}

// Singleton instance
export const reportsRepository = new SupabaseReportsRepository();
