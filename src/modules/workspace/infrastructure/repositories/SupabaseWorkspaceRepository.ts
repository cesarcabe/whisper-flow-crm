import { supabase } from '@/integrations/supabase/client';
import { WorkspaceRepository } from '../../domain/ports/WorkspaceRepository';
import { Workspace } from '../../domain/entities/Workspace';
import { WorkspaceMember } from '../../domain/entities/WorkspaceMember';
import { WorkspaceMapper } from '../mappers/WorkspaceMapper';

/**
 * SupabaseWorkspaceRepository
 * 
 * Implements WorkspaceRepository using Supabase as the data source.
 * Follows Liskov Substitution Principle - can be swapped with any implementation.
 */
export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  async findById(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[WorkspaceRepository] Error finding workspace:', error);
      return null;
    }

    if (!data) return null;
    return WorkspaceMapper.toDomain(data);
  }

  async findByUserId(userId: string): Promise<Workspace[]> {
    // First get all workspace IDs the user is a member of
    const { data: members, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    if (memberError) {
      console.error('[WorkspaceRepository] Error finding memberships:', memberError);
      return [];
    }

    if (!members?.length) return [];

    const workspaceIds = members.map(m => m.workspace_id);

    // Then fetch the workspaces
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .order('name');

    if (error) {
      console.error('[WorkspaceRepository] Error finding workspaces:', error);
      return [];
    }

    return (data ?? []).map(WorkspaceMapper.toDomain);
  }

  async findMembershipsByUserId(userId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[WorkspaceRepository] Error finding memberships:', error);
      return [];
    }

    return (data ?? []).map(WorkspaceMapper.memberToDomain);
  }

  async findMembershipByUserAndWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceMember | null> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[WorkspaceRepository] Error finding membership:', error);
      return null;
    }

    if (!data) return null;
    return WorkspaceMapper.memberToDomain(data);
  }
}
