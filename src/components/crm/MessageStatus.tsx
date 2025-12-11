import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/crm';

interface MessageStatusProps {
  status: Message['status'];
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  const iconClass = cn('w-4 h-4', className);

  switch (status) {
    case 'sending':
      return <Clock className={cn(iconClass, 'text-muted-foreground animate-pulse-soft')} />;
    case 'sent':
      return <Check className={cn(iconClass, 'text-muted-foreground')} />;
    case 'delivered':
      return <CheckCheck className={cn(iconClass, 'text-muted-foreground')} />;
    case 'read':
      return <CheckCheck className={cn(iconClass, 'text-primary')} />;
    case 'failed':
      return <AlertCircle className={cn(iconClass, 'text-destructive')} />;
    default:
      return null;
  }
}
