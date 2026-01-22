import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceSelector as WorkspaceSelectorBase } from './WorkspaceSelector';

/**
 * Connected WorkspaceSelector
 * 
 * Wrapper that connects WorkspaceSelector to the WorkspaceContext.
 * Use this in layouts/headers.
 */
export function ConnectedWorkspaceSelector() {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace();

  return (
    <WorkspaceSelectorBase
      workspaces={workspaces}
      activeWorkspace={activeWorkspace}
      onSelectWorkspace={selectWorkspace}
    />
  );
}
