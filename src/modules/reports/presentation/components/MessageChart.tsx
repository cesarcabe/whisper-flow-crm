/**
 * Message Chart Component
 * Line chart showing messages and contacts over time
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MessageTimeseriesPoint } from '../../domain/entities/MessageReportData';
import { EmptyState } from './EmptyState';

interface MessageChartProps {
  data: MessageTimeseriesPoint[];
  loading?: boolean;
}

const chartConfig: ChartConfig = {
  messages: {
    label: 'Mensagens',
    color: 'hsl(var(--primary))',
  },
  contacts: {
    label: 'Contatos',
    color: 'hsl(var(--secondary))',
  },
};

export function MessageChart({ data, loading }: MessageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mensagens por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mensagens por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            title="Sem dados de mensagens" 
            description="Nenhuma mensagem registrada no período selecionado." 
          />
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((point) => ({
    ...point,
    dateLabel: format(parseISO(point.date), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="var(--color-messages)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="contacts"
                stroke="var(--color-contacts)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
