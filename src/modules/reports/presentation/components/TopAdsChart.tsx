/**
 * Top Ads Chart Component
 * Bar chart showing top performing ads
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import type { TopAdData } from '../../domain/entities/AdReportData';
import { EmptyState } from './EmptyState';

interface TopAdsChartProps {
  data: TopAdData[];
  loading?: boolean;
}

const chartConfig: ChartConfig = {
  leadCount: {
    label: 'Leads',
    color: 'hsl(var(--primary))',
  },
};

export function TopAdsChart({ data, loading }: TopAdsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Anúncios</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Anúncios</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            title="Sem dados de anúncios" 
            description="Nenhum anúncio registrado no período." 
          />
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((item, index) => ({
    name: item.adTitle || item.adSourceId || `Anúncio ${index + 1}`,
    leadCount: item.leadCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Anúncios</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                width={120}
                tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="leadCount" fill="var(--color-leadCount)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
