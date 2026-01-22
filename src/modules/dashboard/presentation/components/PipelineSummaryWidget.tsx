import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kanban } from "lucide-react";
import { PipelineSummary } from "../hooks/useDashboardMetrics";
import { useNavigate } from "react-router-dom";

interface PipelineSummaryWidgetProps {
  summary: PipelineSummary | null;
  loading?: boolean;
}

export function PipelineSummaryWidget({ summary, loading }: PipelineSummaryWidgetProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/kanban");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Kanban className="h-4 w-4 text-primary" />
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Kanban className="h-4 w-4 text-primary" />
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum pipeline configurado
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCards = summary.stages.reduce((sum, s) => sum + s.cardCount, 0);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Kanban className="h-4 w-4 text-primary" />
          {summary.pipelineName}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {totalCards} {totalCards === 1 ? "card" : "cards"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {summary.stages.map((stage) => (
            <div
              key={stage.stageId}
              className="flex-1 min-w-24 p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stage.stageColor || "#6B7280" }}
                />
                <span className="text-xs font-medium truncate">{stage.stageName}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stage.cardCount}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
