/**
 * Component: Agent KPI Card
 * Displays a single metric for the agent dashboard
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AgentKpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'warning' | 'success';
  onClick?: () => void;
}

export function AgentKpiCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
  onClick,
}: AgentKpiCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    warning: 'bg-orange-500/10 border-orange-500/30',
    success: 'bg-green-500/10 border-green-500/30',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-orange-500',
    success: 'text-green-500',
  };

  return (
    <Card
      className={cn(
        'border transition-all',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-full bg-muted/50', iconStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
