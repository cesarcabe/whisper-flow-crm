import { supabase } from '@/integrations/supabase/client';
import { Stage } from '@/core/domain/entities/Stage';
import { StageRepository } from '@/core/ports/repositories/StageRepository';
import { StageMapper } from '../mappers/StageMapper';

/**
 * Implementação do StageRepository usando Supabase
 * Segue o padrão Adapter da Clean Architecture
 */
export class SupabaseStageRepository implements StageRepository {
  async findById(id: string): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return StageMapper.toDomain(data);
  }

  async findByPipelineId(pipelineId: string): Promise<Stage[]> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true });

    if (error || !data) return [];
    return StageMapper.toDomainList(data);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Stage[]> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error || !data) return [];
    return StageMapper.toDomainList(data);
  }

  async findFirstByPipelineId(pipelineId: string): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;
    return StageMapper.toDomain(data);
  }

  async findLastByPipelineId(pipelineId: string): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return StageMapper.toDomain(data);
  }

  async findNextStage(pipelineId: string, currentPosition: number): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .gt('position', currentPosition)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;
    return StageMapper.toDomain(data);
  }

  async findPreviousStage(pipelineId: string, currentPosition: number): Promise<Stage | null> {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .lt('position', currentPosition)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return StageMapper.toDomain(data);
  }

  async save(stage: Stage): Promise<Stage> {
    const insertData = StageMapper.toInsert(stage);
    
    const { data, error } = await supabase
      .from('stages')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save stage: ${error?.message}`);
    }
    
    return StageMapper.toDomain(data);
  }

  async update(stage: Stage): Promise<Stage> {
    const updateData = StageMapper.toUpdate(stage);
    
    const { data, error } = await supabase
      .from('stages')
      .update(updateData)
      .eq('id', stage.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update stage: ${error?.message}`);
    }
    
    return StageMapper.toDomain(data);
  }

  async updatePosition(id: string, newPosition: number): Promise<void> {
    const { error } = await supabase
      .from('stages')
      .update({ position: newPosition })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update stage position: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete stage: ${error.message}`);
    }
  }

  async countByPipelineId(pipelineId: string): Promise<number> {
    const { count, error } = await supabase
      .from('stages')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline_id', pipelineId);

    if (error) return 0;
    return count ?? 0;
  }

  async reorderStages(pipelineId: string): Promise<void> {
    // Fetch all stages in the pipeline ordered by current position
    const { data: stages, error: fetchError } = await supabase
      .from('stages')
      .select('id, position')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true });

    if (fetchError || !stages) {
      throw new Error(`Failed to fetch stages for reordering: ${fetchError?.message}`);
    }

    // Update positions to be sequential (0, 1, 2, ...)
    const updates = stages.map((stage, index) => 
      supabase
        .from('stages')
        .update({ position: index })
        .eq('id', stage.id)
    );

    const results = await Promise.all(updates);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to reorder stages: ${errors[0].error?.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('stages')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  async findByIds(ids: string[]): Promise<Stage[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .in('id', ids)
      .order('position', { ascending: true });

    if (error || !data) return [];
    return StageMapper.toDomainList(data);
  }
}
