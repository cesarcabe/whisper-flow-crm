import { supabase } from '@/integrations/supabase/client';
import { Pipeline } from '@/core/domain/entities/Pipeline';
import { PipelineRepository } from '@/core/ports/repositories/PipelineRepository';
import { PipelineMapper } from '../mappers/PipelineMapper';

/**
 * Implementação do PipelineRepository usando Supabase
 * Segue o padrão Adapter da Clean Architecture
 */
export class SupabasePipelineRepository implements PipelineRepository {
  async findById(id: string): Promise<Pipeline | null> {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return PipelineMapper.toDomain(data);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Pipeline[]> {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return PipelineMapper.toDomainList(data);
  }

  async findByOwnerId(workspaceId: string, ownerId: string): Promise<Pipeline[]> {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('owner_user_id', ownerId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return PipelineMapper.toDomainList(data);
  }

  async save(pipeline: Pipeline): Promise<Pipeline> {
    const insertData = PipelineMapper.toInsert(pipeline);
    
    const { data, error } = await supabase
      .from('pipelines')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save pipeline: ${error?.message}`);
    }
    
    return PipelineMapper.toDomain(data);
  }

  async update(pipeline: Pipeline): Promise<Pipeline> {
    const updateData = PipelineMapper.toUpdate(pipeline);
    
    const { data, error } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', pipeline.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update pipeline: ${error?.message}`);
    }
    
    return PipelineMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    // First delete all stages associated with this pipeline
    const { error: stagesError } = await supabase
      .from('stages')
      .delete()
      .eq('pipeline_id', id);

    if (stagesError) {
      throw new Error(`Failed to delete pipeline stages: ${stagesError.message}`);
    }

    // Then delete the pipeline
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete pipeline: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  async count(workspaceId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (error) return 0;
    return count ?? 0;
  }

  async findDefault(workspaceId: string): Promise<Pipeline | null> {
    // Returns the first pipeline created (oldest one) as default
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;
    return PipelineMapper.toDomain(data);
  }
}
