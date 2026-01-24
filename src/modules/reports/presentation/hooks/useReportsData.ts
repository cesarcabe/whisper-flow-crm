/**
 * useReportsData Hook
 * Manages reports data fetching and state
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ReportsService } from '../../application/services/ReportsService';
import { reportsRepository } from '../../infrastructure/repositories/SupabaseReportsRepository';
import { getDateRangeFromPreset, type PeriodPreset, type ReportFilter, type ReportPagination } from '../../domain/entities/ReportFilter';

const reportsService = new ReportsService(reportsRepository);

export function useReportsData() {
  const { workspaceId } = useWorkspace();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('7days');
  const [customDateRange, setCustomDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [messageTablePage, setMessageTablePage] = useState(1);
  const [adTablePage, setAdTablePage] = useState(1);
  const pageSize = 20;

  const dateRange = useMemo(() => {
    return getDateRangeFromPreset(periodPreset, customDateRange.start, customDateRange.end);
  }, [periodPreset, customDateRange]);

  const filter: ReportFilter | null = useMemo(() => {
    if (!workspaceId) return null;
    return {
      workspaceId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      periodLabel: periodPreset
    };
  }, [workspaceId, dateRange, periodPreset]);

  const messagePagination: ReportPagination = useMemo(() => ({
    page: messageTablePage,
    pageSize
  }), [messageTablePage]);

  const adPagination: ReportPagination = useMemo(() => ({
    page: adTablePage,
    pageSize
  }), [adTablePage]);

  // Message Reports Queries
  const messageKpisQuery = useQuery({
    queryKey: ['reports', 'message-kpis', filter],
    queryFn: () => filter ? reportsService.getMessageKpis(filter) : Promise.resolve(null),
    enabled: !!filter,
    staleTime: 30000
  });

  const messageTimeseriesQuery = useQuery({
    queryKey: ['reports', 'message-timeseries', filter],
    queryFn: () => filter ? reportsService.getMessageTimeseries(filter) : Promise.resolve([]),
    enabled: !!filter,
    staleTime: 30000
  });

  const messageTableQuery = useQuery({
    queryKey: ['reports', 'message-table', filter, messagePagination],
    queryFn: () => filter ? reportsService.getMessageTable(filter, messagePagination) : Promise.resolve({ rows: [], totalCount: 0 }),
    enabled: !!filter,
    staleTime: 30000
  });

  // Ad Reports Queries
  const adKpisQuery = useQuery({
    queryKey: ['reports', 'ad-kpis', filter],
    queryFn: () => filter ? reportsService.getAdKpis(filter) : Promise.resolve(null),
    enabled: !!filter,
    staleTime: 30000
  });

  const adTimeseriesQuery = useQuery({
    queryKey: ['reports', 'ad-timeseries', filter],
    queryFn: () => filter ? reportsService.getAdTimeseries(filter) : Promise.resolve([]),
    enabled: !!filter,
    staleTime: 30000
  });

  const topAdsQuery = useQuery({
    queryKey: ['reports', 'top-ads', filter],
    queryFn: () => filter ? reportsService.getTopAds(filter, 5) : Promise.resolve([]),
    enabled: !!filter,
    staleTime: 30000
  });

  const adTableQuery = useQuery({
    queryKey: ['reports', 'ad-table', filter, adPagination],
    queryFn: () => filter ? reportsService.getAdTable(filter, adPagination) : Promise.resolve({ rows: [], totalCount: 0 }),
    enabled: !!filter,
    staleTime: 30000
  });

  const refresh = useCallback(() => {
    messageKpisQuery.refetch();
    messageTimeseriesQuery.refetch();
    messageTableQuery.refetch();
    adKpisQuery.refetch();
    adTimeseriesQuery.refetch();
    topAdsQuery.refetch();
    adTableQuery.refetch();
  }, [messageKpisQuery, messageTimeseriesQuery, messageTableQuery, adKpisQuery, adTimeseriesQuery, topAdsQuery, adTableQuery]);

  const isLoading = messageKpisQuery.isLoading || adKpisQuery.isLoading;
  const isRefetching = messageKpisQuery.isRefetching || adKpisQuery.isRefetching;

  return {
    // Filters
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    dateRange,

    // Message Reports
    messageKpis: messageKpisQuery.data,
    messageTimeseries: messageTimeseriesQuery.data || [],
    messageTable: messageTableQuery.data || { rows: [], totalCount: 0 },
    messageTablePage,
    setMessageTablePage,

    // Ad Reports
    adKpis: adKpisQuery.data,
    adTimeseries: adTimeseriesQuery.data || [],
    topAds: topAdsQuery.data || [],
    adTable: adTableQuery.data || { rows: [], totalCount: 0 },
    adTablePage,
    setAdTablePage,

    // State
    pageSize,
    isLoading,
    isRefetching,
    refresh
  };
}
