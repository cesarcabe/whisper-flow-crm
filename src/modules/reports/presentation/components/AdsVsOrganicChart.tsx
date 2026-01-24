/**
 * Component: Ads vs Organic Chart
 * Shows leads distribution as donut and timeseries
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { AdminOverviewMetrics, AdsVsOrganicPoint } from '../../domain/entities/AdminMetrics';

interface AdsVsOrganicChartProps {
  metrics: AdminOverviewMetrics | null;
  timeseries: AdsVsOrganicPoint[];
  isLoading: boolean;
}

const COLORS = {
  ads: 'hsl(var(--chart-1))',
  organic: 'hsl(var(--chart-2))',
};

export function AdsVsOrganicChart({ metrics, timeseries, isLoading }: AdsVsOrganicChartProps) {
  const pieData = [
    { name: 'Ads', value: metrics?.adsLeads ?? 0, fill: COLORS.ads },
    { name: 'Orgânico', value: metrics?.organicLeads ?? 0, fill: COLORS.organic },
  ];

  const hasData = (metrics?.adsLeads ?? 0) + (metrics?.organicLeads ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Origem dos Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse h-32 w-32 rounded-full bg-muted" />
            </div>
          ) : !hasData ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Area Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Leads por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse h-full w-full bg-muted rounded" />
            </div>
          ) : timeseries.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('pt-BR');
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="adsLeads"
                  name="Ads"
                  stackId="1"
                  stroke={COLORS.ads}
                  fill={COLORS.ads}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="organicLeads"
                  name="Orgânico"
                  stackId="1"
                  stroke={COLORS.organic}
                  fill={COLORS.organic}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
