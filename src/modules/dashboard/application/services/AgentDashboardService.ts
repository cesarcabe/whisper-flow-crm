/**
 * Application Service: Agent Dashboard
 * Coordinates fetching of agent dashboard metrics
 */
import type { DashboardRepository, DashboardPeriod, PaginationParams } from '../../domain/ports/DashboardRepository';
import type { AgentDashboardMetrics, PendingReply } from '../../domain/entities/AgentDashboardMetrics';

export class AgentDashboardService {
  constructor(private repository: DashboardRepository) {}

  async getMetrics(
    workspaceId: string,
    userId: string,
    period: DashboardPeriod
  ): Promise<AgentDashboardMetrics> {
    return this.repository.getAgentMetrics(workspaceId, userId, period);
  }

  async getPendingReplies(
    workspaceId: string,
    userId: string,
    pagination: PaginationParams
  ): Promise<PendingReply[]> {
    return this.repository.getPendingReplies(workspaceId, userId, pagination);
  }
}
