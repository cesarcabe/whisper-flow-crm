import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { canAddMember, getMemberLimit, getTierConfig } from '@/lib/tier-config';

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'owner' | 'admin' | 'agent';
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useWorkspaceInvitations() {
  const { workspaceId, workspaceMember, workspace } = useWorkspace();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = workspaceMember?.role === 'owner' || workspaceMember?.role === 'admin';
  
  // Tier limits
  const tierName = workspace?.tier || 'starter';
  const tierConfig = getTierConfig(tierName);
  const memberLimit = getMemberLimit(tierName);

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId || !isAdmin) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Invitations] Error fetching:', error);
        setInvitations([]);
      } else {
        setInvitations((data || []) as WorkspaceInvitation[]);
      }
    } catch (err) {
      console.error('[Invitations] Exception:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, isAdmin]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (email: string, role: 'admin' | 'agent', currentMemberCount: number = 0): Promise<boolean> => {
    if (!workspaceId || !isAdmin) {
      toast.error('Você não tem permissão para convidar membros');
      return false;
    }

    // Verificar limite de membros do tier (considerando membros atuais + convites pendentes)
    const totalPending = invitations.length;
    const totalAfterInvite = currentMemberCount + totalPending + 1;
    
    if (memberLimit !== null && totalAfterInvite > memberLimit) {
      const limitMsg = `Seu plano ${tierConfig.displayName} permite até ${memberLimit} membros.`;
      toast.error(`${limitMsg} Faça upgrade para adicionar mais membros.`);
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return false;
      }

      const response = await supabase.functions.invoke('send-invitation', {
        body: { email, role, workspaceId },
      });

      if (response.error) {
        console.error('[Invitations] Error sending:', response.error);
        toast.error(response.error.message || 'Erro ao enviar convite');
        return false;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return false;
      }

      toast.success(`Convite enviado para ${email}`);
      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('[Invitations] Exception sending:', err);
      toast.error('Erro inesperado ao enviar convite');
      return false;
    }
  };

  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Você não tem permissão para cancelar convites');
      return false;
    }

    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('[Invitations] Error canceling:', error);
        toast.error('Erro ao cancelar convite');
        return false;
      }

      toast.success('Convite cancelado');
      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('[Invitations] Exception canceling:', err);
      toast.error('Erro inesperado ao cancelar convite');
      return false;
    }
  };

  return {
    invitations,
    loading,
    isAdmin,
    sendInvitation,
    cancelInvitation,
    refetch: fetchInvitations,
    // Tier info
    tierName,
    tierConfig,
    memberLimit,
  };
}
