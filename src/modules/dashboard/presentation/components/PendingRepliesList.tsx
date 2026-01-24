/**
 * Component: Pending Replies List
 * Shows conversations waiting for agent response
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { formatWaitingTime, type PendingReply } from '../../domain/entities/AgentDashboardMetrics';
import { cn } from '@/lib/utils';

interface PendingRepliesListProps {
  replies: PendingReply[];
  isLoading?: boolean;
}

export function PendingRepliesList({ replies, isLoading }: PendingRepliesListProps) {
  const navigate = useNavigate();

  const handleClick = (conversationId: string) => {
    navigate(`/conversations?id=${conversationId}`);
  };

  const handleViewAll = () => {
    navigate('/conversations');
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Aguardando sua resposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Aguardando sua resposta
            {replies.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-600 rounded-full">
                {replies.length}
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleViewAll}>
            Ver todas
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {replies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma conversa pendente</p>
            <p className="text-sm">Você está em dia! 🎉</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {replies.map((reply) => (
                <div
                  key={reply.conversationId}
                  className={cn(
                    'p-3 rounded-lg border border-border bg-muted/30',
                    'hover:bg-muted/50 cursor-pointer transition-colors'
                  )}
                  onClick={() => handleClick(reply.conversationId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {reply.contactName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {reply.lastMessageBody || 'Mensagem de mídia'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-orange-600 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatWaitingTime(reply.waitingMinutes)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
