import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export type WorkspaceRole = 'owner' | 'admin' | 'agent';

export interface WorkspaceMemberWithProfile {
  id: string;
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  created_at: string;
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useWorkspaceMembers() {
  const { workspaceId, workspaceMember } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = workspaceMember?.role === 'owner' || workspaceMember?.role === 'admin';

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch workspace members
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('[WorkspaceMembers] Error fetching members:', membersError);
        setError('Erro ao carregar membros');
        setMembers([]);
        setLoading(false);
        return;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for each member
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('[WorkspaceMembers] Error fetching profiles:', profilesError);
      }

      // Merge members with profiles
      const membersWithProfiles: WorkspaceMemberWithProfile[] = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id) || null;
        return {
          id: member.id,
          user_id: member.user_id,
          workspace_id: member.workspace_id,
          role: member.role as WorkspaceRole,
          created_at: member.created_at,
          profile,
        };
      });

      setMembers(membersWithProfiles);
    } catch (err) {
      console.error('[WorkspaceMembers] Exception:', err);
      setError('Erro inesperado ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (email: string, role: WorkspaceRole): Promise<boolean> => {
    if (!workspaceId || !isAdmin) {
      toast.error('Você não tem permissão para adicionar membros');
      return false;
    }

    try {
      // First, find the user by email in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) {
        console.error('[WorkspaceMembers] Error finding profile:', profileError);
        toast.error('Erro ao buscar usuário');
        return false;
      }

      if (!profileData) {
        toast.error('Usuário não encontrado. Verifique se o email está correto e se o usuário já se cadastrou.');
        return false;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (existingMember) {
        toast.error('Este usuário já é membro do workspace');
        return false;
      }

      // Add the member
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: profileData.id,
          role,
        });

      if (insertError) {
        console.error('[WorkspaceMembers] Error adding member:', insertError);
        toast.error('Erro ao adicionar membro');
        return false;
      }

      toast.success('Membro adicionado com sucesso');
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('[WorkspaceMembers] Exception adding member:', err);
      toast.error('Erro inesperado ao adicionar membro');
      return false;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: WorkspaceRole): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Você não tem permissão para alterar papéis');
      return false;
    }

    // Find the member to check if it's the owner
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner' && newRole !== 'owner') {
      // Check if there's at least one other owner
      const otherOwners = members.filter(m => m.role === 'owner' && m.id !== memberId);
      if (otherOwners.length === 0) {
        toast.error('Não é possível remover o último owner do workspace');
        return false;
      }
    }

    try {
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) {
        console.error('[WorkspaceMembers] Error updating role:', updateError);
        toast.error('Erro ao atualizar papel');
        return false;
      }

      toast.success('Papel atualizado com sucesso');
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('[WorkspaceMembers] Exception updating role:', err);
      toast.error('Erro inesperado ao atualizar papel');
      return false;
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Você não tem permissão para remover membros');
      return false;
    }

    // Find the member to check if it's the owner
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      const otherOwners = members.filter(m => m.role === 'owner' && m.id !== memberId);
      if (otherOwners.length === 0) {
        toast.error('Não é possível remover o último owner do workspace');
        return false;
      }
    }

    try {
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        console.error('[WorkspaceMembers] Error removing member:', deleteError);
        toast.error('Erro ao remover membro');
        return false;
      }

      toast.success('Membro removido com sucesso');
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('[WorkspaceMembers] Exception removing member:', err);
      toast.error('Erro inesperado ao remover membro');
      return false;
    }
  };

  return {
    members,
    loading,
    error,
    isAdmin,
    addMember,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
}
