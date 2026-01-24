/**
 * Dashboard Page
 * Renders different views based on user role:
 * - Agent: Personal metrics and pending replies
 * - Admin/Owner: Redirects to full dashboard or shows summary
 */
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { AgentDashboard } from './AgentDashboard';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { NewLeadsWidget } from './NewLeadsWidget';
import { UnreadWidget } from './UnreadWidget';
import { PipelineSummaryWidget } from './PipelineSummaryWidget';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPage() {
  const { isAdmin, isLoading: roleLoading } = useWorkspaceRole();
  const { metrics, loading: metricsLoading } = useDashboardMetrics();

  // Show loading skeleton while determining role
  if (roleLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Agent view: Personal dashboard with their metrics
  if (!isAdmin) {
    return (
      <div className="p-6">
        <AgentDashboard />
      </div>
    );
  }

  // Admin view: Overview dashboard (existing widgets)
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Início</h1>
        <p className="text-muted-foreground">Visão geral do seu CRM</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NewLeadsWidget leads={metrics.newLeads} loading={metricsLoading} />
        <UnreadWidget
          summary={metrics.unreadSummary}
          totalUnread={metrics.totalUnread}
          loading={metricsLoading}
        />
      </div>

      <PipelineSummaryWidget summary={metrics.pipelineSummary} loading={metricsLoading} />
    </div>
  );
}
