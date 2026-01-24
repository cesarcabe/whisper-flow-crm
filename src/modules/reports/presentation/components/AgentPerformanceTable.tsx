/**
 * Component: Agent Performance Table
 * Ranking of agents by response time
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Trophy, Clock, Users, MessageSquare, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatResponseTime, type AgentPerformanceRow } from '../../domain/entities/AdminMetrics';
import { cn } from '@/lib/utils';

interface AgentPerformanceTableProps {
  data: AgentPerformanceRow[];
  isLoading: boolean;
}

type SortField = 'avgResponseTimeMinutes' | 'leadsCount' | 'pendingReplies' | 'salesCount';

export function AgentPerformanceTable({ data, isLoading }: AgentPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('avgResponseTimeMinutes');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const diff = aVal - bVal;
    return sortAsc ? diff : -diff;
  });

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Trophy className="h-4 w-4 text-amber-700" />;
    return <span className="text-muted-foreground text-sm">{index + 1}º</span>;
  };

  const getResponseTimeBadge = (minutes: number) => {
    if (minutes === 0) return <Badge variant="secondary">-</Badge>;
    if (minutes <= 5) return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">Excelente</Badge>;
    if (minutes <= 15) return <Badge className="bg-blue-500/20 text-blue-600 hover:bg-blue-500/30">Bom</Badge>;
    if (minutes <= 60) return <Badge className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30">Regular</Badge>;
    return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30">Lento</Badge>;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Performance por Atendente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-muted rounded" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum atendente com pipeline atribuído</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('avgResponseTimeMinutes')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Tempo Médio
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('leadsCount')}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Leads
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('pendingReplies')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Pendentes
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('salesCount')}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Vendas
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((agent, index) => (
                  <TableRow key={agent.agentUserId}>
                    <TableCell className="font-medium">
                      {getRankBadge(index)}
                    </TableCell>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {formatResponseTime(agent.avgResponseTimeMinutes)}
                        </span>
                        {getResponseTimeBadge(agent.avgResponseTimeMinutes)}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{agent.leadsCount}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'tabular-nums',
                        agent.pendingReplies > 5 && 'text-orange-500 font-medium'
                      )}>
                        {agent.pendingReplies}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'tabular-nums',
                        agent.salesCount > 0 && 'text-green-500 font-medium'
                      )}>
                        {agent.salesCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
