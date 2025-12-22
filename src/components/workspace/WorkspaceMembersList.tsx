import { Users, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { MemberCard } from './MemberCard';
import { AddMemberDialog } from './AddMemberDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function WorkspaceMembersList() {
  const { user } = useAuth();
  const {
    members,
    loading,
    error,
    isAdmin,
    addMember,
    updateMemberRole,
    removeMember,
  } = useWorkspaceMembers();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Membros</h2>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'membro' : 'membros'} no workspace
            </p>
          </div>
        </div>

        {isAdmin && <AddMemberDialog onAddMember={addMember} />}
      </div>

      {members.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Nenhum membro</CardTitle>
            <CardDescription>
              Adicione membros ao workspace para colaborar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onUpdateRole={updateMemberRole}
              onRemove={removeMember}
            />
          ))}
        </div>
      )}

      {!isAdmin && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Apenas administradores podem gerenciar membros do workspace.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
