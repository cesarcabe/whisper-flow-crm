/**
 * Port: Dashboard Repository Interface
 * Defines the contract for fetching dashboard metrics
 */
import type { AgentDashboardMetrics, PendingReply } from '../entities/AgentDashboardMetrics';

export interface DashboardPeriod {
  startDate: Date;
  endDate: Date;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface DashboardRepository {
  getAgentMetrics(
    workspaceId: string,
    userId: string,
    period: DashboardPeriod
  ): Promise<AgentDashboardMetrics>;

  getPendingReplies(
    workspaceId: string,
    userId: string,
    pagination: PaginationParams
  ): Promise<PendingReply[]>;
}
