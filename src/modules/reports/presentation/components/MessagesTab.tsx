/**
 * Messages Tab Component
 * Tab content for Messages & Attendance reports
 */
import { MessageSquare, ArrowDownLeft, ArrowUpRight, Users, MessagesSquare, Percent } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { MessageChart } from './MessageChart';
import { MessageTable } from './MessageTable';
import type { MessageKpis, MessageTimeseriesPoint, MessageReportTableResult } from '../../domain/entities/MessageReportData';

interface MessagesTabProps {
  kpis: MessageKpis | null | undefined;
  timeseries: MessageTimeseriesPoint[];
  tableData: MessageReportTableResult;
  tablePage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function MessagesTab({
  kpis,
  timeseries,
  tableData,
  tablePage,
  pageSize,
  onPageChange,
  loading
}: MessagesTabProps) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Total de Mensagens"
          value={kpis?.totalMessages ?? 0}
          icon={MessageSquare}
          loading={loading}
        />
        <KpiCard
          title="Recebidas"
          value={kpis?.messagesReceived ?? 0}
          icon={ArrowDownLeft}
          loading={loading}
        />
        <KpiCard
          title="Enviadas"
          value={kpis?.messagesSent ?? 0}
          icon={ArrowUpRight}
          loading={loading}
        />
        <KpiCard
          title="Contatos Únicos"
          value={kpis?.uniqueContacts ?? 0}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Conversas Ativas"
          value={kpis?.activeConversations ?? 0}
          icon={MessagesSquare}
          loading={loading}
        />
        <KpiCard
          title="Taxa de Resposta"
          value={kpis?.responseRate ?? 0}
          suffix="%"
          icon={Percent}
          loading={loading}
        />
      </div>

      {/* Chart */}
      <MessageChart data={timeseries} loading={loading} />

      {/* Table */}
      <MessageTable
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
