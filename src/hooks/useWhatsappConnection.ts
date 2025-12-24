import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

// Supabase URL for reference (not currently used)
const SUPABASE_URL = 'https://tiaojwumxgdnobknlyqp.supabase.co';

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
  qr_code?: string;
  pairing_code?: string;
}

export type ConnectionStatusType = 'DISCONNECTED' | 'PAIRING' | 'CONNECTED' | 'ERROR' | 'ERROR_TIMEOUT' | 'CONNECTED_THEN_DISCONNECTED';

export interface ConnectionStatus {
  status: ConnectionStatusType;
  message?: string;
  rawStatus?: string;
}

// Map Evolution API status to internal status
function normalizeEvolutionStatus(raw: string | null | undefined): ConnectionStatusType {
  if (!raw) return 'DISCONNECTED';
  
  const s = raw.toLowerCase().trim();
  
  // Connected states
  if (s === 'connected' || s === 'open' || s === 'authenticated') {
    return 'CONNECTED';
  }
  
  // Pairing/connecting states
  if (s === 'pairing' || s === 'connecting' || s === 'qrcode' || s === 'qr' || s === 'waiting') {
    return 'PAIRING';
  }
  
  // Error states
  if (s === 'error' || s === 'refused' || s === 'conflict' || s === 'unauthorized') {
    return 'ERROR';
  }
  
  // Disconnected states
  if (s === 'disconnected' || s === 'close' || s === 'closed' || s === 'logout') {
    return 'DISCONNECTED';
  }
  
  // Default to disconnected for unknown states
  console.log('[WA_CONNECT] unknown_status', { raw: s });
  return 'DISCONNECTED';
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const pollingStartTimeRef = useRef<number>(0);

  const POLLING_TIMEOUT_MS = 90000; // 90 seconds
  const POLLING_INTERVAL_MS = 2500; // 2.5 seconds

  const stopPolling = useCallback(() => {
    console.log('[WA_CONNECT] stop_polling');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPollingRef.current = false;
    wasConnectedRef.current = false;
    pollingStartTimeRef.current = 0;
  }, []);

  // Reset state for new connection attempt
  const resetState = useCallback(() => {
    console.log('[WA_CONNECT] reset_state');
    setQrCode(null);
    setPairingCode(null);
    setConnectionStatus({ status: 'DISCONNECTED' });
    setError(null);
    wasConnectedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createInstance = useCallback(async (internalName: string, phoneNumber?: string): Promise<CreateInstanceResponse> => {
    console.log('[WA_CONNECT] createInstance:start', { 
      workspaceId, 
      internalName, 
      hasUser: !!user
    });

    if (!workspaceId) {
      const errMsg = 'Workspace não encontrado. Faça login novamente.';
      console.log('[WA_CONNECT] createInstance:error', { reason: 'no_workspace_id' });
      setError(errMsg);
      return { ok: false, message: errMsg };
    }

    if (!user) {
      const errMsg = 'Usuário não autenticado. Faça login novamente.';
      console.log('[WA_CONNECT] createInstance:error', { reason: 'no_user' });
      setError(errMsg);
      return { ok: false, message: errMsg };
    }

    setCreating(true);
    setError(null);
    resetState();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.log('[WA_CONNECT] createInstance:session_error', { error: sessionError?.message });
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      console.log('[WA_CONNECT] invoke:start', { 
        functionName: 'whatsapp-create-instance',
        payload: { workspace_id: workspaceId, internal_name: internalName }
      });

      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-create-instance', {
        body: {
          workspace_id: workspaceId,
          internal_name: internalName,
          phone_number: phoneNumber || '',
          user_id: user.id,
        },
      });

      console.log('[WA_CONNECT] invoke:response', { 
        ok: data?.ok, 
        hasQr: !!data?.qr_code,
        instanceName: data?.instance_name,
        whatsappNumberId: data?.whatsapp_number_id
      });

      if (fnError) {
        console.log('[WA_CONNECT] invoke:error', { message: fnError.message });
        throw new Error(fnError.message || 'Erro ao chamar Edge Function');
      }

      if (!data?.ok) {
        console.log('[WA_CONNECT] invoke:api_error', { message: data?.message });
        throw new Error(data?.message || 'Erro ao criar instância WhatsApp');
      }

      // Store QR code from creation response if available
      if (data.qr_code) {
        console.log('[WA_CONNECT] qr_received', { 
          connectionId: data.whatsapp_number_id, 
          hasQr: true 
        });
        setQrCode(data.qr_code);
        setConnectionStatus({ status: 'PAIRING' });
      }
      if (data.pairing_code) {
        setPairingCode(data.pairing_code);
      }

      return data as CreateInstanceResponse;
    } catch (err: any) {
      console.log('[WA_CONNECT] createInstance:catch', { error: err.message });
      const errorMsg = err.message || 'Erro ao criar instância. Verifique se a Edge Function está deployada.';
      setError(errorMsg);
      setConnectionStatus({ status: 'ERROR', message: errorMsg });
      return { ok: false, message: errorMsg };
    } finally {
      setCreating(false);
    }
  }, [workspaceId, user, resetState]);

  const fetchQrCode = useCallback(async (whatsappNumberId?: string): Promise<QrResponse> => {
    if (!workspaceId) {
      return { ok: false, message: 'Workspace não encontrado' };
    }

    console.log('[WA_CONNECT] fetchQrCode:start', { workspaceId, whatsappNumberId });

    setLoadingQr(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-get-qr', {
        body: { workspace_id: workspaceId, whatsapp_number_id: whatsappNumberId },
      });

      console.log('[WA_CONNECT] fetchQrCode:response', { 
        ok: data?.ok, 
        hasCode: !!data?.code,
        count: data?.count 
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao obter QR Code');
      }

      if (!data?.ok) {
        throw new Error(data?.message || 'Erro ao obter QR Code');
      }

      if (data.code) {
        setQrCode(data.code);
        setConnectionStatus({ status: 'PAIRING' });
      }
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      }

      return data as QrResponse;
    } catch (err: any) {
      console.log('[WA_CONNECT] fetchQrCode:error', { error: err.message });
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
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('status')
        .eq('id', whatsappNumberId)
        .single();

      if (error || !data) {
        console.log('[WA_CONNECT] checkStatus:db_error', { error: error?.message });
        return { status: 'DISCONNECTED' };
      }

      const rawStatus = data.status || '';
      const normalizedStatus = normalizeEvolutionStatus(rawStatus);

      console.log('[WA_CONNECT] status_tick', { 
        connectionId: whatsappNumberId, 
        status: normalizedStatus, 
        raw: rawStatus 
      });

      return { status: normalizedStatus, rawStatus };
    } catch (err: any) {
      console.log('[WA_CONNECT] checkStatus:error', { error: err.message });
      return { status: 'DISCONNECTED', message: err.message };
    }
  }, [workspaceId]);

  const startPolling = useCallback((whatsappNumberId: string, onConnected: () => void) => {
    stopPolling();
    isPollingRef.current = true;
    wasConnectedRef.current = false;
    pollingStartTimeRef.current = Date.now();

    console.log('[WA_CONNECT] start_polling', { 
      connectionId: whatsappNumberId, 
      timeoutMs: POLLING_TIMEOUT_MS 
    });

    // Set timeout for polling
    timeoutRef.current = setTimeout(() => {
      if (isPollingRef.current) {
        console.log('[WA_CONNECT] polling_timeout', { connectionId: whatsappNumberId });
        stopPolling();
        setConnectionStatus({ 
          status: 'ERROR_TIMEOUT', 
          message: 'Tempo limite excedido. O QR Code expirou. Tente gerar um novo.' 
        });
        setError('Tempo limite excedido. Tente gerar um novo QR Code.');
      }
    }, POLLING_TIMEOUT_MS);

    const poll = async () => {
      if (!isPollingRef.current) return;

      const result = await checkConnectionStatus(whatsappNumberId);
      
      // Detect connected → disconnected pattern
      if (wasConnectedRef.current && (result.status === 'DISCONNECTED' || result.status === 'ERROR')) {
        console.log('[WA_CONNECT] connected_then_disconnected', { connectionId: whatsappNumberId });
        stopPolling();
        setConnectionStatus({ 
          status: 'CONNECTED_THEN_DISCONNECTED', 
          message: 'Conexão caiu logo após autenticar. Verifique se o número não está ativo em outro dispositivo/instância.',
          rawStatus: result.rawStatus
        });
        setError('Conexão caiu logo após autenticar. Tente novamente.');
        return;
      }

      // Track if we ever reached connected state
      if (result.status === 'CONNECTED') {
        wasConnectedRef.current = true;
      }

      setConnectionStatus(result);

      if (result.status === 'CONNECTED') {
        console.log('[WA_CONNECT] done', { connectionId: whatsappNumberId, status: 'CONNECTED' });
        stopPolling();
        onConnected();
      } else if (result.status === 'ERROR') {
        console.log('[WA_CONNECT] error_status', { connectionId: whatsappNumberId, raw: result.rawStatus });
        stopPolling();
        setError(result.message || 'Erro na conexão WhatsApp');
      }
    };

    poll(); // Initial check
    pollingRef.current = setInterval(poll, POLLING_INTERVAL_MS);
  }, [checkConnectionStatus, stopPolling]);

  const disconnectInstance = useCallback(async (whatsappNumberId: string): Promise<boolean> => {
    console.log('[WA_CONNECT] disconnect_instance', { whatsappNumberId });
    // TODO: Implement when whatsapp-disconnect-instance edge function exists
    return false;
  }, []);

  const retryConnection = useCallback(async (whatsappNumberId: string): Promise<void> => {
    console.log('[WA_CONNECT] retry_connection', { whatsappNumberId });
    resetState();
    setLoadingQr(true);
    
    try {
      const result = await fetchQrCode(whatsappNumberId);
      if (result.ok) {
        setConnectionStatus({ status: 'PAIRING' });
      }
    } finally {
      setLoadingQr(false);
    }
  }, [fetchQrCode, resetState]);

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
    retryConnection,
    resetState,
    setError,
    setQrCode,
    setConnectionStatus,
  };
}
