/**
 * Empty State Component
 * Shown when no data is available for the selected period
 */
import { BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'chart' | 'calendar';
}

export function EmptyState({
  title = 'Nenhum dado encontrado',
  description = 'Não há registros para o período selecionado. Tente selecionar um período diferente ou aguarde novos dados.',
  icon = 'chart'
}: EmptyStateProps) {
  const Icon = icon === 'chart' ? BarChart3 : Calendar;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
