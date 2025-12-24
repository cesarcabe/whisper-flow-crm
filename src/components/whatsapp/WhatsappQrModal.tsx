import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWhatsappConnection } from '@/hooks/useWhatsappConnection';

interface WhatsappQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumberId: string | null;
  onConnected: () => void;
}

export function WhatsappQrModal({ open, onOpenChange, whatsappNumberId, onConnected }: WhatsappQrModalProps) {
  const {
    loadingQr,
    qrCode,
    pairingCode,
    connectionStatus,
    error,
    fetchQrCode,
    startPolling,
    stopPolling,
  } = useWhatsappConnection();

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (open && whatsappNumberId) {
      console.log('[WhatsappQrModal]', { whatsappNumberId, status: 'opening', hasQrCode: !!qrCode });
      
      // Only fetch QR if we don't already have one from creation
      if (!qrCode) {
        fetchQrCode(whatsappNumberId);
      }
      
      startPolling(whatsappNumberId, onConnected);
    }

    return () => {
      if (open) {
        stopPolling();
      }
    };
  }, [open, whatsappNumberId, qrCode]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchQrCode();
    if (whatsappNumberId) {
      startPolling(whatsappNumberId, onConnected);
    }
  };

  const handleClose = () => {
    stopPolling();
    onOpenChange(false);
  };

  const renderQrCode = () => {
    if (loadingQr) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Gerando QR Code...</p>
        </div>
      );
    }

    if (connectionStatus.status === 'CONNECTED') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CheckCircle className="h-16 w-16 text-primary" />
          <p className="text-lg font-medium text-foreground">WhatsApp conectado!</p>
          <Button onClick={handleClose}>Fechar</Button>
        </div>
      );
    }

    if (error || connectionStatus.status === 'ERROR') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <p className="text-lg font-medium text-destructive">Erro na conexão</p>
          <p className="text-sm text-muted-foreground">{error || connectionStatus.message}</p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (!qrCode) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Nenhum QR Code disponível</p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar novo QR Code
          </Button>
        </div>
      );
    }

    // Check if qrCode is an image (data URI or raw base64). Evolution may also return a non-image token (ex: starts with "2@").
    const trimmed = qrCode.trim();
    const isDataImage = trimmed.startsWith('data:image');
    const isRawBase64 = trimmed.length > 200 && /^[A-Za-z0-9+/=]+$/.test(trimmed);
    const isImage = isDataImage || isRawBase64;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg">
          {isImage ? (
            <img
              src={isDataImage ? trimmed : `data:image/png;base64,${trimmed}`}
              alt="QR Code WhatsApp"
              className="w-64 h-64"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded">
              <p className="text-xs text-muted-foreground text-center p-4 break-all">
                {trimmed}
              </p>
            </div>
          )}
        </div>

        {pairingCode && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Ou use o código de pareamento:</p>
            <p className="text-2xl font-mono font-bold text-foreground tracking-wider">
              {pairingCode}
            </p>
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar um aparelho
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Aguardando conexão...</span>
        </div>

        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Gerar novo QR
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderQrCode()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
