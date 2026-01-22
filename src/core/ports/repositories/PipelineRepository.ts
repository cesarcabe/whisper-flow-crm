import { Pipeline } from '@/core/domain/entities/Pipeline';

/**
 * Port/Interface para acesso a dados de Pipeline.
 * Segue o padrão Repository da Clean Architecture.
 */
export interface PipelineRepository {
  /**
   * Busca um pipeline por ID
   */
  findById(id: string): Promise<Pipeline | null>;

  /**
   * Busca todos os pipelines de um workspace
   */
  findByWorkspaceId(workspaceId: string): Promise<Pipeline[]>;

  /**
   * Busca pipelines criados por um usuário
   */
  findByOwnerId(workspaceId: string, ownerId: string): Promise<Pipeline[]>;

  /**
   * Salva um novo pipeline
   */
  save(pipeline: Pipeline): Promise<Pipeline>;

  /**
   * Atualiza um pipeline existente
   */
  update(pipeline: Pipeline): Promise<Pipeline>;

  /**
   * Remove um pipeline e seus estágios
   */
  delete(id: string): Promise<void>;

  /**
   * Verifica se um pipeline existe
   */
  exists(id: string): Promise<boolean>;

  /**
   * Conta total de pipelines em um workspace
   */
  count(workspaceId: string): Promise<number>;

  /**
   * Busca o pipeline padrão de um workspace (primeiro criado ou marcado como padrão)
   */
  findDefault(workspaceId: string): Promise<Pipeline | null>;
}
