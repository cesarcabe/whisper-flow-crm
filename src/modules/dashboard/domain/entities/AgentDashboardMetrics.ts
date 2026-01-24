/**
 * Domain entity: Agent Dashboard Metrics
 * Represents the key metrics shown to an agent on their dashboard
 */
export interface AgentDashboardMetrics {
  leadsInPipeline: number;
  pendingReplies: number;
  salesThisMonth: number;
}

export interface PendingReply {
  conversationId: string;
  contactName: string;
  remoteJid: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  waitingMinutes: number;
}

/**
 * Format waiting time for display
 */
export function formatWaitingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
