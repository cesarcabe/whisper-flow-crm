/**
 * Component: Admin Overview Tab
 * Main admin reports view with all metrics
 */
import { useAdminReports } from '../hooks/useAdminReports';
import { AdminOverviewCards } from './AdminOverviewCards';
import { AdsVsOrganicChart } from './AdsVsOrganicChart';
import { AgentPerformanceTable } from './AgentPerformanceTable';
import { PeriodSelector } from './PeriodSelector';

export function AdminOverviewTab() {
  const {
    overview,
    agentPerformance,
    adsVsOrganic,
    isLoading,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    refetch,
  } = useAdminReports();

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
          <p className="text-sm text-muted-foreground">Métricas consolidadas do workspace</p>
        </div>
        <PeriodSelector
          periodPreset={periodPreset}
          onPeriodChange={setPeriodPreset}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
          onRefresh={refetch}
          isRefreshing={isLoading}
        />
      </div>

      {/* KPI Cards */}
      <AdminOverviewCards metrics={overview} isLoading={isLoading} />

      {/* Ads vs Organic */}
      <AdsVsOrganicChart 
        metrics={overview} 
        timeseries={adsVsOrganic} 
        isLoading={isLoading} 
      />

      {/* Agent Performance */}
      <AgentPerformanceTable data={agentPerformance} isLoading={isLoading} />
    </div>
  );
}
