/**
 * WorkspaceMember Entity
 * 
 * Represents membership of a user in a workspace with a specific role.
 * Encapsulates permission logic for workspace operations.
 */

export type WorkspaceRole = 'owner' | 'admin' | 'agent';

export interface WorkspaceMemberProps {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
}

export class WorkspaceMember {
  private readonly props: WorkspaceMemberProps;

  private constructor(props: WorkspaceMemberProps) {
    this.props = props;
  }

  static create(props: WorkspaceMemberProps): WorkspaceMember {
    return new WorkspaceMember(props);
  }

  // ============ Getters ============

  get id(): string {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): WorkspaceRole {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // ============ Role Checks ============

  isOwner(): boolean {
    return this.role === 'owner';
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  isAgent(): boolean {
    return this.role === 'agent';
  }

  // ============ Permission Checks ============

  /**
   * Can invite, remove, or change member roles
   */
  canManageMembers(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  /**
   * Can edit workspace settings (name, etc.)
   */
  canEditWorkspace(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  /**
   * Can delete the entire workspace
   */
  canDeleteWorkspace(): boolean {
    return this.isOwner();
  }

  /**
   * Can manage pipelines and stages
   */
  canManagePipelines(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  /**
   * Can manage WhatsApp connections
   */
  canManageWhatsApp(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  /**
   * Returns role display label in Portuguese
   */
  getRoleLabel(): string {
    const labels: Record<WorkspaceRole, string> = {
      owner: 'Proprietário',
      admin: 'Administrador',
      agent: 'Agente',
    };
    return labels[this.role];
  }
}
