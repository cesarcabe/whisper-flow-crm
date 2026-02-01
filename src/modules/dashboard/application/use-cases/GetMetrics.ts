import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import type { DashboardRepository, DashboardPeriod } from '../../domain/ports/DashboardRepository';
import type { AgentDashboardMetrics } from '../../domain/entities/AgentDashboardMetrics';

export interface GetMetricsDTO {
  workspaceId: string;
  userId: string;
  period: DashboardPeriod;
}

export class GetMetricsUseCase {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(dto: GetMetricsDTO): Promise<Result<AgentDashboardMetrics, AppError>> {
    try {
      const metrics = await this.repository.getAgentMetrics(
        dto.workspaceId,
        dto.userId,
        dto.period,
      );
      return success(metrics);
    } catch (error) {
      return failure(new InfrastructureError('Failed to fetch dashboard metrics', error));
    }
  }
}
