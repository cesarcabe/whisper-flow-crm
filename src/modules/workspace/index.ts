// Domain Entities
export { Workspace } from './domain/entities/Workspace';
export type { WorkspaceProps } from './domain/entities/Workspace';
export { WorkspaceMember } from './domain/entities/WorkspaceMember';
export type { WorkspaceMemberProps, WorkspaceRole } from './domain/entities/WorkspaceMember';

// Ports
export type { WorkspaceRepository } from './domain/ports/WorkspaceRepository';
export type { IWorkspaceRepository } from './application/ports/IWorkspaceRepository';

// Application (Use Cases)
export { CreateWorkspaceUseCase } from './application/use-cases/CreateWorkspace';
export type { CreateWorkspaceDTO } from './application/use-cases/CreateWorkspace';
export { InviteMemberUseCase } from './application/use-cases/InviteMember';
export type { InviteMemberDTO, InviteMemberResult } from './application/use-cases/InviteMember';

// Infrastructure
export { SupabaseWorkspaceRepository } from './infrastructure/repositories/SupabaseWorkspaceRepository';
export { WorkspaceMapper } from './infrastructure/mappers/WorkspaceMapper';

// Presentation
export { useUserWorkspaces } from './presentation/hooks/useUserWorkspaces';
export type { WorkspaceWithMembership } from './presentation/hooks/useUserWorkspaces';
export { WorkspaceSelector } from './presentation/components/WorkspaceSelector';
