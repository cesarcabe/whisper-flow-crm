import { BarChart3 } from "lucide-react";

export function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Análise de dados do seu CRM</p>
      </div>

      <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Em breve: Relatório de Volume de Mensagens
          </p>
        </div>
      </div>
    </div>
  );
}
