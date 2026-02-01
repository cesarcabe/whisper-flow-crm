import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import type { PipelineRepository } from '@/core/ports/repositories/PipelineRepository';
import type { StageRepository } from '@/core/ports/repositories/StageRepository';
import { Pipeline } from '@/core/domain/entities/Pipeline';
import { Stage } from '@/core/domain/entities/Stage';

export interface PipelineSummary {
  pipeline: Pipeline;
  stages: Array<{
    stage: Stage;
    cardCount: number;
  }>;
}

export interface GetPipelineSummaryDTO {
  workspaceId: string;
}

export class GetPipelineSummaryUseCase {
  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly stageRepository: StageRepository,
  ) {}

  async execute(dto: GetPipelineSummaryDTO): Promise<Result<PipelineSummary | null, AppError>> {
    try {
      const pipeline = await this.pipelineRepository.findDefault(dto.workspaceId);
      if (!pipeline) {
        return success(null);
      }

      const stages = await this.stageRepository.findByPipelineId(pipeline.id);
      const stagesWithCounts = await Promise.all(
        stages.map(async (stage) => {
          const cardCount = await this.stageRepository.countByPipelineId(pipeline.id);
          return { stage, cardCount };
        }),
      );

      return success({ pipeline, stages: stagesWithCounts });
    } catch (error) {
      return failure(new InfrastructureError('Failed to fetch pipeline summary', error));
    }
  }
}
