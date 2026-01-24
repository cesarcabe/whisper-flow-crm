/**
 * Reports Page Component
 * Main page component for the Reports module
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, MessageSquare, Target } from 'lucide-react';
import { useReportsData } from '../hooks/useReportsData';
import { PeriodSelector } from './PeriodSelector';
import { MessagesTab } from './MessagesTab';
import { AdsTab } from './AdsTab';

export function ReportsPage() {
  const {
    // Filters
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,

    // Message Reports
    messageKpis,
    messageTimeseries,
    messageTable,
    messageTablePage,
    setMessageTablePage,

    // Ad Reports
    adKpis,
    adTimeseries,
    topAds,
    adTable,
    adTablePage,
    setAdTablePage,

    // State
    pageSize,
    isLoading,
    isRefetching,
    refresh
  } = useReportsData();

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral das conversas e performance de aquisição
            </p>
          </div>
        </div>

        <PeriodSelector
          periodPreset={periodPreset}
          onPeriodChange={setPeriodPreset}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
          onRefresh={refresh}
          isRefreshing={isRefetching}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens & Atendimento
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-2">
            <Target className="h-4 w-4" />
            Anúncios & Aquisição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-6">
          <MessagesTab
            kpis={messageKpis}
            timeseries={messageTimeseries}
            tableData={messageTable}
            tablePage={messageTablePage}
            pageSize={pageSize}
            onPageChange={setMessageTablePage}
            loading={isLoading}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-6">
          <AdsTab
            kpis={adKpis}
            timeseries={adTimeseries}
            topAds={topAds}
            tableData={adTable}
            tablePage={adTablePage}
            pageSize={pageSize}
            onPageChange={setAdTablePage}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
