/**
 * Component: Admin Overview Cards
 * KPI cards for admin dashboard
 */
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageSquareWarning, DollarSign, Clock, Megaphone, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminOverviewMetrics } from '../../domain/entities/AdminMetrics';

interface AdminOverviewCardsProps {
  metrics: AdminOverviewMetrics | null;
  isLoading: boolean;
}

interface KpiCardData {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'default' | 'warning' | 'success' | 'info';
  description?: string;
}

export function AdminOverviewCards({ metrics, isLoading }: AdminOverviewCardsProps) {
  const cards: KpiCardData[] = [
    {
      title: 'Novos Leads',
      value: metrics?.totalNewLeads ?? 0,
      icon: Users,
      variant: 'info',
      description: 'No período',
    },
    {
      title: 'Aguardando Resposta',
      value: metrics?.pendingReplies ?? 0,
      icon: MessageSquareWarning,
      variant: metrics && metrics.pendingReplies > 5 ? 'warning' : 'default',
      description: 'Conversas pendentes',
    },
    {
      title: 'Vendas',
      value: metrics?.salesThisMonth ?? 0,
      icon: DollarSign,
      variant: 'success',
      description: 'No período',
    },
    {
      title: 'Leads de Ads',
      value: metrics?.adsLeads ?? 0,
      icon: Megaphone,
      variant: 'info',
      description: 'Via anúncios',
    },
    {
      title: 'Leads Orgânicos',
      value: metrics?.organicLeads ?? 0,
      icon: Users,
      variant: 'default',
      description: 'Sem anúncios',
    },
    {
      title: 'Conversas Abandonadas',
      value: metrics?.abandonedConversations ?? 0,
      icon: UserX,
      variant: metrics && metrics.abandonedConversations > 3 ? 'warning' : 'default',
      description: '+24h sem resposta',
    },
  ];

  const variantStyles = {
    default: 'border-border',
    warning: 'border-orange-500/30 bg-orange-500/5',
    success: 'border-green-500/30 bg-green-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-orange-500',
    success: 'text-green-500',
    info: 'text-blue-500',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn('border', variantStyles[card.variant])}>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={cn('h-4 w-4', iconStyles[card.variant])} />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {card.title}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                {card.description && (
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
