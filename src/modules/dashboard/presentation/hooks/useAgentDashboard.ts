/**
 * Hook: useAgentDashboard
 * Fetches agent-specific dashboard metrics and pending replies
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AgentDashboardService } from '../../application/services/AgentDashboardService';
import { dashboardRepository } from '../../infrastructure/repositories/SupabaseDashboardRepository';
import type { AgentDashboardMetrics, PendingReply } from '../../domain/entities/AgentDashboardMetrics';

const service = new AgentDashboardService(dashboardRepository);

interface UseAgentDashboardResult {
  metrics: AgentDashboardMetrics | null;
  pendingReplies: PendingReply[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAgentDashboard(): UseAgentDashboardResult {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();

  // Current month period
  const period = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: startOfMonth, endDate: endOfMonth };
  }, []);

  const metricsQuery = useQuery({
    queryKey: ['agent-dashboard-metrics', workspaceId, user?.id, period.startDate.toISOString()],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;
      return service.getMetrics(workspaceId, user.id, period);
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const pendingQuery = useQuery({
    queryKey: ['agent-pending-replies', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];
      return service.getPendingReplies(workspaceId, user.id, { limit: 10, offset: 0 });
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refetch = () => {
    metricsQuery.refetch();
    pendingQuery.refetch();
  };

  return {
    metrics: metricsQuery.data ?? null,
    pendingReplies: pendingQuery.data ?? [],
    isLoading: metricsQuery.isLoading || pendingQuery.isLoading,
    error: metricsQuery.error?.message ?? pendingQuery.error?.message ?? null,
    refetch,
  };
}
