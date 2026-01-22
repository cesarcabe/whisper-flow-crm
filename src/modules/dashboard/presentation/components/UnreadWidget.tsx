import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone } from "lucide-react";
import { UnreadSummary } from "../hooks/useDashboardMetrics";
import { useNavigate } from "react-router-dom";

interface UnreadWidgetProps {
  summary: UnreadSummary[];
  totalUnread: number;
  loading?: boolean;
}

export function UnreadWidget({ summary, totalUnread, loading }: UnreadWidgetProps) {
  const navigate = useNavigate();

  const handleClick = (whatsappNumberId: string) => {
    navigate(`/conversations?whatsapp=${whatsappNumberId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <MessageCircle className="h-4 w-4 text-primary" />
            Não Lidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <MessageCircle className="h-4 w-4 text-primary" />
          Não Lidas
          {totalUnread > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {totalUnread}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Tudo em dia! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhuma mensagem não lida
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.map((item) => (
              <div
                key={item.whatsappNumberId}
                onClick={() => handleClick(item.whatsappNumberId)}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.whatsappNumberName}
                  </p>
                </div>
                <Badge variant="destructive">{item.unreadCount}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
