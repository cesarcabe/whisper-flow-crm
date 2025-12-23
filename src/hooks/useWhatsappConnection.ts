import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

interface QrResponse {
  ok: boolean;
  instance_name?: string;
  pairingCode?: string;
  code?: string;
  count?: number;
  message?: string;
}

interface CreateInstanceResponse {
  ok: boolean;
  instance_name?: string;
  whatsapp_number_id?: string;
  message?: string;
}

interface ConnectionStatus {
  status: 'DISCONNECTED' | 'PAIRING' | 'CONNECTED' | 'ERROR';
  message?: string;
}

export function useWhatsappConnection() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'DISCONNECTED' });
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createInstance = useCallback(async (internalName: string, phoneNumber?: string): Promise<CreateInstanceResponse> => {
    if (!workspaceId || !user) {
      return { ok: false, message: 'Workspace ou usuário não encontrado' };
    }

    setCreating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-create-instance', {
        body: {
          workspace_id: workspaceId,
          internal_name: internalName,
          phone_number: phoneNumber || '',
        },
      });

      if (fnError) throw fnError;

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao criar instância');
      }

      return data as CreateInstanceResponse;
    } catch (err: any) {
      console.error('[useWhatsappConnection]', 'create_instance_error', err);
      setError(err.message || 'Erro ao criar instância');
      return { ok: false, message: err.message };
    } finally {
      setCreating(false);
    }
  }, [workspaceId, user]);

  const fetchQrCode = useCallback(async (): Promise<QrResponse> => {
    if (!workspaceId) {
      return { ok: false, message: 'Workspace não encontrado' };
    }

    setLoadingQr(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-get-qr', {
        body: {},
        method: 'GET',
      });

      // Workaround: GET with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-get-qr?workspace_id=${workspaceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result?.ok) {
        throw new Error(result?.message || 'Erro ao obter QR Code');
      }

      setQrCode(result.code || null);
      setPairingCode(result.pairingCode || null);

      return result as QrResponse;
    } catch (err: any) {
      console.error('[useWhatsappConnection]', 'fetch_qr_error', err);
      setError(err.message || 'Erro ao obter QR Code');
      return { ok: false, message: err.message };
    } finally {
      setLoadingQr(false);
    }
  }, [workspaceId]);

  const checkConnectionStatus = useCallback(async (whatsappNumberId: string): Promise<ConnectionStatus> => {
    if (!workspaceId) {
      return { status: 'DISCONNECTED', message: 'Workspace não encontrado' };
    }

    try {
      // Try to call whatsapp-connection-status if exists
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-connection-status?workspace_id=${workspaceId}&whatsapp_number_id=${whatsappNumberId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Fallback: check database status
        const { data, error } = await supabase
          .from('whatsapp_numbers')
          .select('status')
          .eq('id', whatsappNumberId)
          .single();

        if (error || !data) {
          return { status: 'DISCONNECTED' };
        }

        const s = (data.status || '').toLowerCase();
        if (s === 'connected' || s === 'open') return { status: 'CONNECTED' };
        if (s === 'pairing' || s === 'connecting' || s === 'qrcode') return { status: 'PAIRING' };
        if (s === 'error' || s === 'close' || s === 'refused') return { status: 'ERROR' };
        return { status: 'DISCONNECTED' };
      }

      const result = await response.json();
      return result as ConnectionStatus;
    } catch (err: any) {
      console.error('[useWhatsappConnection]', 'check_status_error', err);
      // Fallback to DB check
      return { status: 'DISCONNECTED', message: err.message };
    }
  }, [workspaceId]);

  const startPolling = useCallback((whatsappNumberId: string, onConnected: () => void) => {
    stopPolling();
    isPollingRef.current = true;

    const poll = async () => {
      if (!isPollingRef.current) return;

      const status = await checkConnectionStatus(whatsappNumberId);
      console.log('[WhatsappQrModal]', { whatsappNumberId, status: status.status });
      setConnectionStatus(status);

      if (status.status === 'CONNECTED') {
        stopPolling();
        onConnected();
      }
    };

    poll(); // Initial check
    pollingRef.current = setInterval(poll, 2500);
  }, [checkConnectionStatus, stopPolling]);

  const disconnectInstance = useCallback(async (whatsappNumberId: string): Promise<boolean> => {
    // TODO: Implement when whatsapp-disconnect-instance edge function exists
    console.log('[useWhatsappConnection]', 'disconnect_instance', { whatsappNumberId, todo: true });
    return false;
  }, []);

  return {
    creating,
    loadingQr,
    qrCode,
    pairingCode,
    connectionStatus,
    error,
    createInstance,
    fetchQrCode,
    checkConnectionStatus,
    startPolling,
    stopPolling,
    disconnectInstance,
    setError,
  };
}
