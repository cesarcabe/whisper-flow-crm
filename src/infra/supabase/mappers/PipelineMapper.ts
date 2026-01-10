import { Tables } from '@/integrations/supabase/types';
import { Pipeline, PipelineProps } from '@/core/domain/entities/Pipeline';

type PipelineRow = Tables<'pipelines'>;

/**
 * Mapper para converter entre Pipeline (domain) e pipelines (database)
 */
export class PipelineMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: PipelineRow): Pipeline {
    const props: PipelineProps = {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description,
      color: row.color ?? '#3B82F6',
      createdBy: row.created_by,
      ownerUserId: row.owner_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Pipeline.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(pipeline: Pipeline): Omit<PipelineRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      workspace_id: pipeline.workspaceId,
      name: pipeline.name,
      description: pipeline.description,
      color: pipeline.color,
      created_by: pipeline.createdBy,
      owner_user_id: pipeline.ownerId,
    };
  }

  /**
   * Converte uma entidade de domínio para formato de atualização no banco
   */
  static toUpdate(pipeline: Pipeline): Partial<PipelineRow> {
    return {
      name: pipeline.name,
      description: pipeline.description,
      color: pipeline.color,
      owner_user_id: pipeline.ownerId,
    };
  }

  /**
   * Converte múltiplas rows para entidades de domínio
   */
  static toDomainList(rows: PipelineRow[]): Pipeline[] {
    return rows.map(row => PipelineMapper.toDomain(row));
  }
}
