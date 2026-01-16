import { Check, ChevronDown, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Workspace } from '@/modules/workspace';
import { WorkspaceWithMembership } from '../hooks/useUserWorkspaces';

interface WorkspaceSelectorProps {
  workspaces: WorkspaceWithMembership[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (workspaceId: string) => void;
}

/**
 * WorkspaceSelector Component
 * 
 * Dropdown for switching between workspaces.
 * Only visible when user has access to multiple workspaces.
 */
export function WorkspaceSelector({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
}: WorkspaceSelectorProps) {
  // If only one workspace, show simple label without dropdown
  if (workspaces.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium truncate max-w-[140px]">
          {activeWorkspace?.name || 'Workspace'}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-9">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate max-w-[140px]">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map(({ workspace, membership }) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => onSelectWorkspace(workspace.id)}
            className="gap-2 cursor-pointer"
          >
            <Check
              className={cn(
                'h-4 w-4 flex-shrink-0',
                workspace.id === activeWorkspace?.id
                  ? 'opacity-100'
                  : 'opacity-0'
              )}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate">{workspace.name}</span>
              <span className="text-xs text-muted-foreground">
                {membership.getRoleLabel()}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
