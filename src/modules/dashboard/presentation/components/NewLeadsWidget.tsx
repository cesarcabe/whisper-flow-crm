import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NewLead } from "../hooks/useDashboardMetrics";
import { useNavigate } from "react-router-dom";

interface NewLeadsWidgetProps {
  leads: NewLead[];
  loading?: boolean;
}

export function NewLeadsWidget({ leads, loading }: NewLeadsWidgetProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLeadClick = (lead: NewLead) => {
    navigate(`/conversations?conversation=${lead.id}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <UserPlus className="h-4 w-4 text-primary" />
            Novos Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
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
          <UserPlus className="h-4 w-4 text-primary" />
          Novos Leads
          {leads.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {leads.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum novo lead nas últimas 24h
          </p>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleLeadClick(lead)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={lead.contactAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(lead.contactName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lead.contactName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.contactPhone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                  {lead.whatsappNumberName && (
                    <p className="text-xs text-muted-foreground truncate max-w-20">
                      {lead.whatsappNumberName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
