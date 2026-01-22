import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Workspace, 
  WorkspaceMember, 
  SupabaseWorkspaceRepository,
  WorkspaceWithMembership,
} from '@/modules/workspace';

const ACTIVE_WORKSPACE_KEY = 'crm_active_workspace_id';

interface WorkspaceContextType {
  // Multi-workspace support
  workspaces: WorkspaceWithMembership[];
  
  // Active workspace (for backward compatibility)
  activeWorkspace: Workspace | null;
  activeMembership: WorkspaceMember | null;
  
  // Legacy alias (for backward compatibility)
  workspace: Workspace | null;
  workspaceMember: WorkspaceMember | null;
  workspaceId: string | null;
  
  // Actions
  selectWorkspace: (workspaceId: string) => Promise<void>;
  
  // State
  loading: boolean;
  refetchWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const repository = new SupabaseWorkspaceRepository();

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

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

      // Auto-select workspace if needed
      if (combined.length > 0) {
        const savedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
        const savedExists = combined.some(w => w.workspace.id === savedId);
        
        if (savedId && savedExists) {
          setActiveWorkspaceId(savedId);
        } else {
          // Default to first workspace
          const firstId = combined[0].workspace.id;
          setActiveWorkspaceId(firstId);
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, firstId);
        }
      }
    } catch (err) {
      console.error('[WorkspaceContext] Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    const exists = workspaces.some(w => w.workspace.id === workspaceId);
    if (!exists) {
      console.error('[WorkspaceContext] Workspace not found:', workspaceId);
      return;
    }

    setActiveWorkspaceId(workspaceId);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  }, [workspaces]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Derive active workspace and membership from state
  const activeWorkspaceData = workspaces.find(w => w.workspace.id === activeWorkspaceId);
  const activeWorkspace = activeWorkspaceData?.workspace ?? null;
  const activeMembership = activeWorkspaceData?.membership ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        // Multi-workspace
        workspaces,
        activeWorkspace,
        activeMembership,
        
        // Legacy aliases for backward compatibility
        workspace: activeWorkspace,
        workspaceMember: activeMembership,
        workspaceId: activeWorkspace?.id ?? null,
        
        // Actions
        selectWorkspace,
        
        // State
        loading,
        refetchWorkspace: fetchWorkspaces,
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
