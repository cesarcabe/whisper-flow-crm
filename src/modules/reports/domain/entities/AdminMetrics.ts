/**
 * Domain entity: Admin Overview Metrics
 * Represents the key metrics shown to admins/managers in reports
 */
export interface AdminOverviewMetrics {
  totalNewLeads: number;
  pendingReplies: number;
  salesThisMonth: number;
  adsLeads: number;
  organicLeads: number;
  abandonedConversations: number;
}

export interface AgentPerformanceRow {
  agentUserId: string;
  agentName: string;
  avgResponseTimeMinutes: number;
  leadsCount: number;
  pendingReplies: number;
  salesCount: number;
}

export interface AdsVsOrganicPoint {
  date: string;
  adsLeads: number;
  organicLeads: number;
}

/**
 * Format response time for display
 */
export function formatResponseTime(minutes: number): string {
  if (minutes === 0) return '-';
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
