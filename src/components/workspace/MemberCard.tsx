import { useState } from 'react';
import { MoreVertical, Trash2, Shield, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { WorkspaceMemberWithProfile, WorkspaceRole } from '@/hooks/useWorkspaceMembers';

interface MemberCardProps {
  member: WorkspaceMemberWithProfile;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onUpdateRole: (memberId: string, role: WorkspaceRole) => Promise<boolean>;
  onRemove: (memberId: string) => Promise<boolean>;
}

const roleLabels: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Agente',
};

const roleBadgeVariants: Record<WorkspaceRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  agent: 'outline',
};

export function MemberCard({
  member,
  currentUserId,
  isAdmin,
  onUpdateRole,
  onRemove,
}: MemberCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCurrentUser = member.user_id === currentUserId;
  const isOwner = member.role === 'owner';
  const canModify = isAdmin && !isCurrentUser;

  const displayName = member.profile?.full_name || member.profile?.email || 'Usuário';
  const email = member.profile?.email || '';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleRoleChange = async (newRole: WorkspaceRole) => {
    if (newRole === member.role) return;
    
    setIsUpdating(true);
    await onUpdateRole(member.id, newRole);
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    setIsDeleting(true);
    await onRemove(member.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">{displayName}</p>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">Você</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>

            <div className="flex items-center gap-2">
              {canModify && !isOwner ? (
                <Select
                  value={member.role}
                  onValueChange={handleRoleChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-28">
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={roleBadgeVariants[member.role]}>
                  {roleLabels[member.role]}
                </Badge>
              )}

              {canModify && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {!isOwner && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    )}
                    {isOwner && (
                      <DropdownMenuItem disabled>
                        <Shield className="h-4 w-4 mr-2" />
                        Owner não pode ser removido
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{displayName}</strong> do workspace?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
