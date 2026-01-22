import { Workspace } from '../entities/Workspace';
import { WorkspaceMember } from '../entities/WorkspaceMember';

/**
 * WorkspaceRepository Port
 * 
 * Defines the contract for workspace data access.
 * Infrastructure layer implements this interface.
 */
export interface WorkspaceRepository {
  // ============ Workspace Operations ============
  
  /**
   * Find workspace by ID
   */
  findById(id: string): Promise<Workspace | null>;

  /**
   * Find all workspaces a user belongs to
   */
  findByUserId(userId: string): Promise<Workspace[]>;

  // ============ Membership Operations ============

  /**
   * Find all memberships for a user
   */
  findMembershipsByUserId(userId: string): Promise<WorkspaceMember[]>;

  /**
   * Find specific membership for a user in a workspace
   */
  findMembershipByUserAndWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceMember | null>;
}
