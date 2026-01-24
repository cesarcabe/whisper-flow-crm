/**
 * Ad Report Entities
 * Data structures for Ads & Acquisition reports
 */

export interface AdKpis {
  totalAdLeads: number;
  adMessages: number;
  adConversations: number;
  topConversionSource: string | null;
}

export interface AdTimeseriesPoint {
  date: string;
  leads: number;
  messages: number;
}

export interface TopAdData {
  adTitle: string | null;
  adSourceId: string | null;
  leadCount: number;
}

export interface AdReportRow {
  id: string;
  timestamp: string;
  pushName: string | null;
  remoteJid: string;
  conversionSource: string | null;
  entryPointApp: string | null;
  entryPointSource: string | null;
  adTitle: string | null;
  adSourceId: string | null;
  adMediaType: number | null;
  showAdAttribution: boolean | null;
  automatedGreetingShown: boolean | null;
}

export interface AdReportTableResult {
  rows: AdReportRow[];
  totalCount: number;
}
