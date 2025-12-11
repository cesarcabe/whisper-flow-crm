import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  className?: string;
}

const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 border-amber-200',
  Lead: 'bg-blue-100 text-blue-700 border-blue-200',
  Cliente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Suporte: 'bg-purple-100 text-purple-700 border-purple-200',
};

export function TagBadge({ name, className }: TagBadgeProps) {
  const colorClass = tagColors[name] || 'bg-muted text-muted-foreground border-border';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {name}
    </span>
  );
}
