import { Tables } from '@/integrations/supabase/types';
import { Stage, StageProps } from '@/core/domain/entities/Stage';
import { StagePosition } from '@/core/domain/value-objects/StagePosition';

type StageRow = Tables<'stages'>;

/**
 * Mapper para converter entre Stage (domain) e stages (database)
 */
export class StageMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: StageRow): Stage {
    const props: StageProps = {
      id: row.id,
      pipelineId: row.pipeline_id,
      workspaceId: row.workspace_id,
      name: row.name,
      color: row.color ?? '#6B7280',
      position: StagePosition.create(row.position),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Stage.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(stage: Stage): Omit<StageRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      pipeline_id: stage.pipelineId,
      workspace_id: stage.workspaceId,
      name: stage.name,
      color: stage.color,
      position: stage.position.getValue(),
    };
  }

  /**
   * Converte uma entidade de domínio para formato de atualização no banco
   */
  static toUpdate(stage: Stage): Partial<StageRow> {
    return {
      name: stage.name,
      color: stage.color,
      position: stage.position.getValue(),
    };
  }

  /**
   * Cria um objeto parcial para atualização de posição
   */
  static toPositionUpdate(position: StagePosition): Partial<StageRow> {
    return {
      position: position.getValue(),
    };
  }

  /**
   * Converte múltiplas rows para entidades de domínio
   */
  static toDomainList(rows: StageRow[]): Stage[] {
    return rows.map(row => StageMapper.toDomain(row));
  }
}
