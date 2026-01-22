import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const onlineIndicatorSize = {
  sm: 'w-2 h-2 right-0 bottom-0',
  md: 'w-2.5 h-2.5 right-0 bottom-0',
  lg: 'w-3 h-3 right-0.5 bottom-0.5',
};

export function Avatar({ name, src, isOnline, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colors = [
    'bg-rose-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-pink-500',
  ];

  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium text-white',
            sizeClasses[size],
            colors[colorIndex]
          )}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-card',
            onlineIndicatorSize[size],
            isOnline ? 'bg-online' : 'bg-muted-foreground'
          )}
        />
      )}
    </div>
  );
}
