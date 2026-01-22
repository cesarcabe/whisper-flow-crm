import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWhatsappConnection, ConnectionStatusType } from '@/hooks/useWhatsappConnection';

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
    retryConnection,
    resetState,
    setConnectionStatus,
  } = useWhatsappConnection();

  const [retryCount, setRetryCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for elapsed seconds
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (open && connectionStatus.status === 'PAIRING') {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open, connectionStatus.status]);

  useEffect(() => {
    if (open && whatsappNumberId) {
      console.log('[WA_CONNECT] modal_opened', { 
        whatsappNumberId, 
        hasQrCode: !!qrCode,
        currentStatus: connectionStatus.status 
      });
      
      // Only fetch QR if we don't already have one from creation
      if (!qrCode) {
        fetchQrCode(whatsappNumberId);
      } else {
        // If we have QR, set status to PAIRING
        setConnectionStatus({ status: 'PAIRING' });
      }
      
      startPolling(whatsappNumberId, onConnected);
    }

    return () => {
      if (open) {
        stopPolling();
      }
    };
  }, [open, whatsappNumberId]);

  const handleRetry = useCallback(async () => {
    if (!whatsappNumberId) return;
    
    console.log('[WA_CONNECT] retry_click', { whatsappNumberId, retryCount: retryCount + 1 });
    setRetryCount(prev => prev + 1);
    setElapsedSeconds(0);
    
    await retryConnection(whatsappNumberId);
    startPolling(whatsappNumberId, onConnected);
  }, [whatsappNumberId, retryCount, retryConnection, startPolling, onConnected]);

  const handleClose = useCallback(() => {
    console.log('[WA_CONNECT] modal_closed', { status: connectionStatus.status });
    stopPolling();
    resetState();
    onOpenChange(false);
  }, [stopPolling, resetState, onOpenChange, connectionStatus.status]);

  const renderStatusIcon = (status: ConnectionStatusType) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="h-16 w-16 text-primary" />;
      case 'ERROR':
      case 'CONNECTED_THEN_DISCONNECTED':
        return <XCircle className="h-16 w-16 text-destructive" />;
      case 'ERROR_TIMEOUT':
        return <Clock className="h-16 w-16 text-amber-500" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    // Loading state
    if (loadingQr) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Gerando QR Code...</p>
        </div>
      );
    }

    // Connected state
    if (connectionStatus.status === 'CONNECTED') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CheckCircle className="h-16 w-16 text-primary" />
          <p className="text-lg font-medium text-foreground">WhatsApp conectado!</p>
          <p className="text-sm text-muted-foreground">Conexão estabelecida com sucesso.</p>
          <Button onClick={handleClose}>Fechar</Button>
        </div>
      );
    }

    // Timeout error
    if (connectionStatus.status === 'ERROR_TIMEOUT') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Clock className="h-16 w-16 text-amber-500" />
          <p className="text-lg font-medium text-foreground">QR Code expirado</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            O tempo limite foi excedido. Gere um novo QR Code para tentar novamente.
          </p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar novo QR Code
          </Button>
        </div>
      );
    }

    // Connected then disconnected (special case)
    if (connectionStatus.status === 'CONNECTED_THEN_DISCONNECTED') {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-16 w-16 text-amber-500" />
          <p className="text-lg font-medium text-foreground">Conexão instável</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {connectionStatus.message || 'Conexão caiu logo após autenticar. Verifique se o número não está ativo em outro dispositivo.'}
          </p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    // Error state
    if (connectionStatus.status === 'ERROR' || error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <p className="text-lg font-medium text-destructive">Erro na conexão</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {error || connectionStatus.message || 'Não foi possível conectar. Tente novamente.'}
          </p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    // No QR code available
    if (!qrCode) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum QR Code disponível</p>
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar QR Code
          </Button>
        </div>
      );
    }

    // PAIRING state - Show QR code
    const trimmed = qrCode.trim();
    const isDataImage = trimmed.startsWith('data:image');
    const isRawBase64 = trimmed.length > 200 && /^[A-Za-z0-9+/=]+$/.test(trimmed);
    const isImage = isDataImage || isRawBase64;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {isImage ? (
            <img
              src={isDataImage ? trimmed : `data:image/png;base64,${trimmed}`}
              alt="QR Code WhatsApp"
              className="w-64 h-64"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded">
              <p className="text-xs text-muted-foreground text-center p-4 break-all">
                {trimmed.length > 100 ? `${trimmed.slice(0, 100)}...` : trimmed}
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
          <span>Aguardando conexão... ({elapsedSeconds}s)</span>
        </div>

        {elapsedSeconds > 60 && (
          <p className="text-xs text-amber-500 text-center">
            Demorando mais que o esperado? O QR pode ter expirado.
          </p>
        )}

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
            {connectionStatus.status === 'PAIRING' 
              ? 'Escaneie o QR Code com seu WhatsApp para conectar.'
              : connectionStatus.status === 'CONNECTED'
              ? 'Conexão estabelecida com sucesso!'
              : 'Aguardando...'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
