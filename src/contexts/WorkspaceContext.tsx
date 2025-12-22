import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Workspace, WorkspaceMember } from '@/types/database';

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaceMember: WorkspaceMember | null;
  workspaceId: string | null;
  loading: boolean;
  refetchWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMember, setWorkspaceMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    if (!user) {
      console.log('[Workspace] No user, clearing workspace');
      setWorkspace(null);
      setWorkspaceMember(null);
      setLoading(false);
      return;
    }

    console.log('[Workspace] Fetching workspace for user:', user.id);

    try {
      // First, get user's workspace membership
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[Workspace] Member data:', memberData, 'Error:', memberError);

      if (memberError) {
        console.error('[Workspace] Error fetching workspace member:', memberError);
        setLoading(false);
        return;
      }

      if (memberData) {
        setWorkspaceMember({
          id: memberData.id,
          workspace_id: memberData.workspace_id,
          user_id: memberData.user_id,
          role: memberData.role as 'owner' | 'admin' | 'agent',
          created_at: memberData.created_at,
        });
        
        // Fetch workspace separately to avoid RLS join issues
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', memberData.workspace_id)
          .maybeSingle();

        console.log('[Workspace] Workspace data:', workspaceData, 'Error:', workspaceError);

        if (workspaceData) {
          setWorkspace({
            id: workspaceData.id,
            name: workspaceData.name,
            city: workspaceData.city,
            state: workspaceData.state,
            created_by: workspaceData.created_by,
            created_at: workspaceData.created_at,
            updated_at: workspaceData.updated_at,
          });
        }
      } else {
        console.log('[Workspace] No workspace membership found for user');
      }
    } catch (err) {
      console.error('[Workspace] Exception fetching workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceMember,
        workspaceId: workspace?.id || null,
        loading,
        refetchWorkspace: fetchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
