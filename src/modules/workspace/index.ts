/**
 * Workspace Module - Public API
 * 
 * This is the only file that should be imported from outside this module.
 * All internal implementation details are hidden behind this facade.
 */

// ============ Domain Entities ============
export { Workspace } from './domain/entities/Workspace';
export type { WorkspaceProps } from './domain/entities/Workspace';

export { WorkspaceMember } from './domain/entities/WorkspaceMember';
export type { WorkspaceMemberProps, WorkspaceRole } from './domain/entities/WorkspaceMember';

// ============ Ports (Interfaces) ============
export type { WorkspaceRepository } from './domain/ports/WorkspaceRepository';

// ============ Infrastructure ============
export { SupabaseWorkspaceRepository } from './infrastructure/repositories/SupabaseWorkspaceRepository';
export { WorkspaceMapper } from './infrastructure/mappers/WorkspaceMapper';

// ============ Presentation ============
export { useUserWorkspaces } from './presentation/hooks/useUserWorkspaces';
export type { WorkspaceWithMembership } from './presentation/hooks/useUserWorkspaces';

export { WorkspaceSelector } from './presentation/components/WorkspaceSelector';
