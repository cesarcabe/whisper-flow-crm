/**
 * Component: Agent Dashboard
 * Main dashboard view for agents (non-admin users)
 */
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquareWarning, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentDashboard } from '../hooks/useAgentDashboard';
import { AgentKpiCard } from './AgentKpiCard';
import { PendingRepliesList } from './PendingRepliesList';

export function AgentDashboard() {
  const navigate = useNavigate();
  const { metrics, pendingReplies, isLoading, refetch } = useAgentDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground">Visão geral do mês atual</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AgentKpiCard
          title="Novos Leads no Meu Pipeline"
          value={isLoading ? '-' : metrics?.leadsInPipeline ?? 0}
          icon={Users}
          description="Este mês"
          onClick={() => navigate('/kanban')}
        />
        <AgentKpiCard
          title="Aguardando Minha Resposta"
          value={isLoading ? '-' : metrics?.pendingReplies ?? 0}
          icon={MessageSquareWarning}
          description="Conversas pendentes"
          variant={metrics && metrics.pendingReplies > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/conversations')}
        />
        <AgentKpiCard
          title="Minhas Vendas"
          value={isLoading ? '-' : metrics?.salesThisMonth ?? 0}
          icon={DollarSign}
          description="Este mês"
          variant={metrics && metrics.salesThisMonth > 0 ? 'success' : 'default'}
        />
      </div>

      {/* Pending Replies List */}
      <PendingRepliesList replies={pendingReplies} isLoading={isLoading} />

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate('/conversations')} variant="default">
          Ir para Conversas
        </Button>
        <Button onClick={() => navigate('/kanban')} variant="outline">
          Ir para Pipeline
        </Button>
      </div>
    </div>
  );
}
