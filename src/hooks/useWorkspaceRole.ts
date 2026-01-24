/**
 * Hook to get the current user's role in the active workspace
 * Returns: owner, admin, or agent
 * isAdmin = owner or admin (can see full reports)
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

export type WorkspaceRoleType = 'owner' | 'admin' | 'agent';

interface WorkspaceRoleResult {
  role: WorkspaceRoleType | null;
  isAdmin: boolean;
  isOwner: boolean;
  isAgent: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWorkspaceRole(): WorkspaceRoleResult {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace-role', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;

      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role as WorkspaceRoleType | null;
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const result = useMemo(() => {
    const role = data ?? null;
    return {
      role,
      isAdmin: role === 'owner' || role === 'admin',
      isOwner: role === 'owner',
      isAgent: role === 'agent',
      isLoading,
      error: error?.message ?? null,
    };
  }, [data, isLoading, error]);

  return result;
}
