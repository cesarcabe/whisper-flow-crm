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
      createdBy: row.owner_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tier: row.tier,
      subscriptionStatus: row.subscription_status,
      subscriptionEndsAt: row.subscription_ends_at ? new Date(row.subscription_ends_at) : null,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
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
