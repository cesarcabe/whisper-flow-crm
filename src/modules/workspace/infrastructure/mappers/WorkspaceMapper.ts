import { Workspace, WorkspaceProps } from '../../domain/entities/Workspace';
import { WorkspaceMember, WorkspaceMemberProps, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { Tables } from '@/integrations/supabase/types';

type WorkspaceRow = Tables<'workspaces'>;
type MemberRow = Tables<'workspace_members'>;

/**
 * WorkspaceMapper
 * 
 * Transforms between Supabase row types and domain entities.
 * Single Responsibility: Only handles data transformation.
 */
export class WorkspaceMapper {
  /**
   * Map Supabase workspaces row to Workspace entity
   */
  static toDomain(row: WorkspaceRow): Workspace {
    const props: WorkspaceProps = {
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return Workspace.create(props);
  }

  /**
   * Map Supabase workspace_members row to WorkspaceMember entity
   */
  static memberToDomain(row: MemberRow): WorkspaceMember {
    const props: WorkspaceMemberProps = {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role as WorkspaceRole,
      createdAt: new Date(row.created_at),
    };
    return WorkspaceMember.create(props);
  }
}
