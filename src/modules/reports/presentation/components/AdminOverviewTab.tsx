/**
 * Component: Admin Overview Tab
 * Main admin reports view with all metrics
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { adminReportsRepository, type ReportPeriod } from '../../infrastructure/repositories/AdminReportsRepository';
import { AdminOverviewCards } from './AdminOverviewCards';
import { AdsVsOrganicChart } from './AdsVsOrganicChart';
import { AgentPerformanceTable } from './AgentPerformanceTable';

interface AdminOverviewTabProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export function AdminOverviewTab({ dateRange }: AdminOverviewTabProps) {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();

  const period: ReportPeriod = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [dateRange]);

  const overviewQuery = useQuery({
    queryKey: ['admin-overview', workspaceId, user?.id, period.startDate.toISOString()],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;
      return adminReportsRepository.getOverviewMetrics(workspaceId, user.id, period);
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const performanceQuery = useQuery({
    queryKey: ['admin-agent-performance', workspaceId, user?.id, period.startDate.toISOString()],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];
      return adminReportsRepository.getAgentPerformance(workspaceId, user.id, period);
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const adsOrganicQuery = useQuery({
    queryKey: ['admin-ads-organic', workspaceId, user?.id, period.startDate.toISOString()],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];
      return adminReportsRepository.getAdsVsOrganicTimeseries(workspaceId, user.id, period);
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = overviewQuery.isLoading || performanceQuery.isLoading || adsOrganicQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
        <p className="text-sm text-muted-foreground">Métricas consolidadas do workspace</p>
      </div>

      {/* KPI Cards */}
      <AdminOverviewCards metrics={overviewQuery.data ?? null} isLoading={isLoading} />

      {/* Ads vs Organic */}
      <AdsVsOrganicChart 
        metrics={overviewQuery.data ?? null} 
        timeseries={adsOrganicQuery.data ?? []} 
        isLoading={isLoading} 
      />

      {/* Agent Performance */}
      <AgentPerformanceTable data={performanceQuery.data ?? []} isLoading={isLoading} />
    </div>
  );
}
