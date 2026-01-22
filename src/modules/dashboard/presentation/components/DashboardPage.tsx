import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { NewLeadsWidget } from "./NewLeadsWidget";
import { UnreadWidget } from "./UnreadWidget";
import { PipelineSummaryWidget } from "./PipelineSummaryWidget";

export function DashboardPage() {
  const { metrics, loading } = useDashboardMetrics();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Início</h1>
        <p className="text-muted-foreground">Visão geral do seu CRM</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NewLeadsWidget leads={metrics.newLeads} loading={loading} />
        <UnreadWidget
          summary={metrics.unreadSummary}
          totalUnread={metrics.totalUnread}
          loading={loading}
        />
      </div>

      <PipelineSummaryWidget summary={metrics.pipelineSummary} loading={loading} />
    </div>
  );
}
