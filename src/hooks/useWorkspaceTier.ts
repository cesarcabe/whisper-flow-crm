import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import {
  getTierConfig,
  getMemberLimit,
  canAddMember,
  getRemainingMemberSlots,
  type TierConfig,
} from '@/lib/tier-config';

/**
 * Hook para acessar informações do tier do workspace atual
 * e verificar limites de funcionalidades
 */
export function useWorkspaceTier() {
  const { workspace } = useWorkspace();
  const { members } = useWorkspaceMembers();

  const tierName = workspace?.tier || 'starter';
  const tierConfig: TierConfig = getTierConfig(tierName);
  const memberCount = members.length;
  const memberLimit = getMemberLimit(tierName);
  const remainingSlots = getRemainingMemberSlots(tierName, memberCount);

  return {
    // Configuração do tier
    tier: tierConfig,
    tierName: tierConfig.id,
    tierDisplayName: tierConfig.displayName,
    
    // Limites de membros
    memberLimit,
    memberCount,
    remainingSlots,
    isUnlimitedMembers: memberLimit === null,
    
    // Verificações
    canAddMember: () => canAddMember(tierName, memberCount),
    canAddMembers: (count: number) => {
      if (memberLimit === null) return true;
      return memberCount + count <= memberLimit;
    },
    
    // Features (para uso futuro)
    features: tierConfig.features,
    
    // Status da assinatura
    subscriptionStatus: workspace?.subscriptionStatus || 'inactive',
    subscriptionEndsAt: workspace?.subscriptionEndsAt,
    isActive: workspace?.subscriptionStatus === 'active',
  };
}
