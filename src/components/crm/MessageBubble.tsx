import { cn } from '@/lib/utils';
import { Message } from '@/types/crm';
import { MessageStatus } from './MessageStatus';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { body, isOutgoing, timestamp, status } = message;

  return (
    <div
      className={cn(
        'flex animate-fade-in',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] sm:max-w-[65%] px-4 py-2 relative',
          isOutgoing ? 'message-bubble-sent' : 'message-bubble-received'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{body}</p>
        
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOutgoing ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(timestamp), 'HH:mm')}
          </span>
          {isOutgoing && <MessageStatus status={status} className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
}
