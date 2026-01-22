import { Stage } from '@/core/domain/entities/Stage';

/**
 * Port/Interface para acesso a dados de Stage.
 * Segue o padrão Repository da Clean Architecture.
 */
export interface StageRepository {
  /**
   * Busca um estágio por ID
   */
  findById(id: string): Promise<Stage | null>;

  /**
   * Busca todos os estágios de um pipeline ordenados por posição
   */
  findByPipelineId(pipelineId: string): Promise<Stage[]>;

  /**
   * Busca estágios por workspace
   */
  findByWorkspaceId(workspaceId: string): Promise<Stage[]>;

  /**
   * Busca o primeiro estágio de um pipeline
   */
  findFirstByPipelineId(pipelineId: string): Promise<Stage | null>;

  /**
   * Busca o último estágio de um pipeline
   */
  findLastByPipelineId(pipelineId: string): Promise<Stage | null>;

  /**
   * Busca o próximo estágio na sequência
   */
  findNextStage(pipelineId: string, currentPosition: number): Promise<Stage | null>;

  /**
   * Busca o estágio anterior na sequência
   */
  findPreviousStage(pipelineId: string, currentPosition: number): Promise<Stage | null>;

  /**
   * Salva um novo estágio
   */
  save(stage: Stage): Promise<Stage>;

  /**
   * Atualiza um estágio existente
   */
  update(stage: Stage): Promise<Stage>;

  /**
   * Atualiza a posição de um estágio
   */
  updatePosition(id: string, newPosition: number): Promise<void>;

  /**
   * Remove um estágio
   */
  delete(id: string): Promise<void>;

  /**
   * Conta total de estágios em um pipeline
   */
  countByPipelineId(pipelineId: string): Promise<number>;

  /**
   * Reordena estágios após remoção ou inserção
   */
  reorderStages(pipelineId: string): Promise<void>;

  /**
   * Verifica se um estágio existe
   */
  exists(id: string): Promise<boolean>;

  /**
   * Busca estágios por IDs
   */
  findByIds(ids: string[]): Promise<Stage[]>;
}
