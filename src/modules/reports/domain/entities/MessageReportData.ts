/**
 * Message Report Entities
 * Data structures for Messages & Attendance reports (non-ad)
 */

export interface MessageKpis {
  totalMessages: number;
  messagesReceived: number;
  messagesSent: number;
  uniqueContacts: number;
  activeConversations: number;
  responseRate: number;
}

export interface MessageTimeseriesPoint {
  date: string;
  messages: number;
  contacts: number;
}

export interface MessageReportRow {
  id: string;
  timestamp: string;
  pushName: string | null;
  remoteJid: string;
  messageType: string | null;
  status: string | null;
  fromMe: boolean;
}

export interface MessageReportTableResult {
  rows: MessageReportRow[];
  totalCount: number;
}
