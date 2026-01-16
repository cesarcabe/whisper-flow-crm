import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Workspace, 
  WorkspaceMember, 
  SupabaseWorkspaceRepository 
} from '@/modules/workspace';

/**
 * Combined workspace with its membership info
 */
export interface WorkspaceWithMembership {
  workspace: Workspace;
  membership: WorkspaceMember;
}

/**
 * useUserWorkspaces Hook
 * 
 * Fetches all workspaces the current user belongs to, along with membership info.
 * Follows Single Responsibility Principle - only handles workspace listing.
 */
export function useUserWorkspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create repository instance - could be injected for testing
  const repository = useMemo(() => new SupabaseWorkspaceRepository(), []);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch workspaces and memberships in parallel
      const [workspaceList, membershipList] = await Promise.all([
        repository.findByUserId(user.id),
        repository.findMembershipsByUserId(user.id),
      ]);

      // Combine workspace with its membership
      const combined: WorkspaceWithMembership[] = workspaceList
        .map(workspace => {
          const membership = membershipList.find(m => m.workspaceId === workspace.id);
          if (!membership) return null;
          return { workspace, membership };
        })
        .filter((item): item is WorkspaceWithMembership => item !== null);

      setWorkspaces(combined);
    } catch (err) {
      console.error('[useUserWorkspaces] Error fetching workspaces:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch workspaces'));
    } finally {
      setLoading(false);
    }
  }, [user, repository]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    loading,
    error,
    refetch: fetchWorkspaces,
    hasMultipleWorkspaces: workspaces.length > 1,
  };
}
