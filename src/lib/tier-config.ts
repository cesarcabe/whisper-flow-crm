/**
 * Configuração centralizada dos tiers/planos do sistema
 * 
 * Mapeamento de Price IDs do Stripe para configurações de tier
 */

export type TierName = 'starter' | 'professional' | 'enterprise';

export interface TierConfig {
  id: TierName;
  name: string;
  displayName: string;
  priceId: string;
  price: number; // Em centavos (BRL)
  memberLimit: number | null; // null = ilimitado
  features: string[];
}

// Price IDs do Stripe (produção)
export const STRIPE_PRICE_IDS = {
  starter: 'price_1RTv8VE5SkMoSFzluQRDJfqE',
  professional: 'price_1RTv99E5SkMoSFzlPo5o22YI',
  enterprise: 'price_1RTv9lE5SkMoSFzlyB1WCX2B',
} as const;

// Configuração completa de cada tier
export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  starter: {
    id: 'starter',
    name: 'starter',
    displayName: 'Essencial',
    priceId: STRIPE_PRICE_IDS.starter,
    price: 4990, // R$ 49,90
    memberLimit: 3,
    features: [
      'Até 3 membros',
      'WhatsApp integrado',
      'Pipeline básico',
      'Relatórios essenciais',
    ],
  },
  professional: {
    id: 'professional',
    name: 'professional',
    displayName: 'Avançado',
    priceId: STRIPE_PRICE_IDS.professional,
    price: 7990, // R$ 79,90
    memberLimit: 6,
    features: [
      'Até 6 membros',
      'WhatsApp integrado',
      'Múltiplos pipelines',
      'Relatórios avançados',
      'Automações básicas',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Premium',
    priceId: STRIPE_PRICE_IDS.enterprise,
    price: 12990, // R$ 129,90
    memberLimit: null, // Ilimitado
    features: [
      'Membros ilimitados',
      'WhatsApp integrado',
      'Pipelines ilimitados',
      'Relatórios completos',
      'Automações avançadas',
      'Suporte prioritário',
    ],
  },
};

// Mapeamento de Price ID para Tier
export const PRICE_TO_TIER: Record<string, TierName> = {
  [STRIPE_PRICE_IDS.starter]: 'starter',
  [STRIPE_PRICE_IDS.professional]: 'professional',
  [STRIPE_PRICE_IDS.enterprise]: 'enterprise',
};

// Helpers
export function getTierByPriceId(priceId: string): TierConfig | null {
  const tierName = PRICE_TO_TIER[priceId];
  return tierName ? TIER_CONFIGS[tierName] : null;
}

export function getTierConfig(tierName: TierName | string | null | undefined): TierConfig {
  if (tierName && tierName in TIER_CONFIGS) {
    return TIER_CONFIGS[tierName as TierName];
  }
  // Default para starter se não encontrar
  return TIER_CONFIGS.starter;
}

export function getMemberLimit(tierName: TierName | string | null | undefined): number | null {
  const config = getTierConfig(tierName);
  return config.memberLimit;
}

export function canAddMember(
  tierName: TierName | string | null | undefined,
  currentMemberCount: number
): boolean {
  const limit = getMemberLimit(tierName);
  if (limit === null) return true; // Ilimitado
  return currentMemberCount < limit;
}

export function getRemainingMemberSlots(
  tierName: TierName | string | null | undefined,
  currentMemberCount: number
): number | null {
  const limit = getMemberLimit(tierName);
  if (limit === null) return null; // Ilimitado
  return Math.max(0, limit - currentMemberCount);
}
