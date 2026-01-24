/**
 * Hook: useAdminReports
 * Fetches admin-level report data
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { adminReportsRepository, type ReportPeriod } from '../../infrastructure/repositories/AdminReportsRepository';
import type { AdminOverviewMetrics, AgentPerformanceRow, AdsVsOrganicPoint } from '../../domain/entities/AdminMetrics';
import { getDateRangeFromPreset, type PeriodPreset } from '../../domain/entities/ReportFilter';

interface UseAdminReportsResult {
  overview: AdminOverviewMetrics | null;
  agentPerformance: AgentPerformanceRow[];
  adsVsOrganic: AdsVsOrganicPoint[];
  isLoading: boolean;
  error: string | null;
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customDateRange: { start?: Date; end?: Date };
  setCustomDateRange: (range: { start?: Date; end?: Date }) => void;
  refetch: () => void;
}

export function useAdminReports(): UseAdminReportsResult {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30days');
  const [customDateRange, setCustomDateRange] = useState<{ start?: Date; end?: Date }>({});

  const period: ReportPeriod = useMemo(() => {
    const range = getDateRangeFromPreset(periodPreset, customDateRange.start, customDateRange.end);
    return { startDate: range.startDate, endDate: range.endDate };
  }, [periodPreset, customDateRange]);

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

  const refetch = () => {
    overviewQuery.refetch();
    performanceQuery.refetch();
    adsOrganicQuery.refetch();
  };

  return {
    overview: overviewQuery.data ?? null,
    agentPerformance: performanceQuery.data ?? [],
    adsVsOrganic: adsOrganicQuery.data ?? [],
    isLoading: overviewQuery.isLoading || performanceQuery.isLoading || adsOrganicQuery.isLoading,
    error: overviewQuery.error?.message ?? performanceQuery.error?.message ?? null,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    refetch,
  };
}
