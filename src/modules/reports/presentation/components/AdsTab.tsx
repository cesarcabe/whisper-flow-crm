/**
 * Ads Tab Component
 * Tab content for Ads & Acquisition reports
 */
import { Target, MessageSquare, MessagesSquare, TrendingUp } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { AdChart } from './AdChart';
import { TopAdsChart } from './TopAdsChart';
import { AdTable } from './AdTable';
import type { AdKpis, AdTimeseriesPoint, TopAdData, AdReportTableResult } from '../../domain/entities/AdReportData';

interface AdsTabProps {
  kpis: AdKpis | null | undefined;
  timeseries: AdTimeseriesPoint[];
  topAds: TopAdData[];
  tableData: AdReportTableResult;
  tablePage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function AdsTab({
  kpis,
  timeseries,
  topAds,
  tableData,
  tablePage,
  pageSize,
  onPageChange,
  loading
}: AdsTabProps) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Leads de Anúncio"
          value={kpis?.totalAdLeads ?? 0}
          icon={Target}
          loading={loading}
        />
        <KpiCard
          title="Mensagens de Ads"
          value={kpis?.adMessages ?? 0}
          icon={MessageSquare}
          loading={loading}
        />
        <KpiCard
          title="Conversas de Ads"
          value={kpis?.adConversations ?? 0}
          icon={MessagesSquare}
          loading={loading}
        />
        <KpiCard
          title="Top Fonte"
          value={kpis?.topConversionSource || 'N/A'}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <AdChart data={timeseries} loading={loading} />
        <TopAdsChart data={topAds} loading={loading} />
      </div>

      {/* Table */}
      <AdTable
        rows={tableData.rows}
        totalCount={tableData.totalCount}
        page={tablePage}
        pageSize={pageSize}
        onPageChange={onPageChange}
        loading={loading}
      />
    </div>
  );
}
