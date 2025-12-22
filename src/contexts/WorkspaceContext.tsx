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
      setWorkspace(null);
      setWorkspaceMember(null);
      setLoading(false);
      return;
    }

    try {
      // Get user's workspace membership
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          workspace:workspaces(*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

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
        
        if (memberData.workspace) {
          const ws = memberData.workspace as any;
          setWorkspace({
            id: ws.id,
            name: ws.name,
            city: ws.city,
            state: ws.state,
            created_by: ws.created_by,
            created_at: ws.created_at,
            updated_at: ws.updated_at,
          });
        }
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
