import { useState } from 'react';
import { Smartphone, Plus, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhatsappNumbers } from '@/hooks/useWhatsappNumbers';
import { usePipelines } from '@/hooks/usePipelines';
import { WhatsappConnectionCard } from './WhatsappConnectionCard';
import { CreateWhatsappDialog } from './CreateWhatsappDialog';
import { WhatsappQrModal } from './WhatsappQrModal';

export function WhatsappSettingsTab() {
  const { numbers, loading, error, refetch, updatePipeline, updateInternalName } = useWhatsappNumbers();
  const { pipelines } = usePipelines();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const handleShowQr = (id: string) => {
    setSelectedNumber(id);
    setQrModalOpen(true);
  };

  const handleQrConnected = () => {
    setQrModalOpen(false);
    setSelectedNumber(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Conexões WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              {numbers.length} {numbers.length === 1 ? 'conexão' : 'conexões'} configuradas
            </p>
          </div>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Conectar WhatsApp
        </Button>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Nenhuma conexão</CardTitle>
            <CardDescription>
              Conecte seu WhatsApp para começar a receber e enviar mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Conectar WhatsApp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {numbers.map(number => (
            <WhatsappConnectionCard
              key={number.id}
              number={number}
              pipelines={pipelines}
              onUpdatePipeline={updatePipeline}
              onUpdateName={updateInternalName}
              onShowQr={handleShowQr}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      <CreateWhatsappDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          refetch();
          handleShowQr(id);
        }}
      />

      <WhatsappQrModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        whatsappNumberId={selectedNumber}
        onConnected={handleQrConnected}
      />
    </div>
  );
}
