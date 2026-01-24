import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Tables } from '@/integrations/supabase/types';

export type WhatsappNumber = Tables<'whatsapp_numbers'>;

export type WhatsappStatus = 'DISCONNECTED' | 'PAIRING' | 'CONNECTED' | 'ERROR';

export function mapStatus(dbStatus: string | null): WhatsappStatus {
  if (!dbStatus) return 'DISCONNECTED';
  const s = dbStatus.toLowerCase();
  if (s === 'connected' || s === 'open') return 'CONNECTED';
  if (s === 'pairing' || s === 'connecting' || s === 'qrcode') return 'PAIRING';
  if (s === 'error' || s === 'close' || s === 'refused') return 'ERROR';
  return 'DISCONNECTED';
}

export function useWhatsappNumbers() {
  const { workspaceId } = useWorkspace();
  const [numbers, setNumbers] = useState<WhatsappNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Flag to prevent refetch on focus/visibility change
  const hasInitialFetchRef = useRef<boolean>(false);

  const fetchNumbers = useCallback(async () => {
    if (!workspaceId) {
      setNumbers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNumbers(data || []);
    } catch (err: any) {
      console.error('[useWhatsappNumbers]', 'fetch_error', err);
      setError(err.message || 'Erro ao carregar conexões WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const updatePipeline = useCallback(async (id: string, pipelineId: string | null) => {
    console.log('[WhatsappConnectionCard]', 'pipeline_update', { whatsappNumberId: id, pipelineId });
    
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ pipeline_preferential_id: pipelineId })
      .eq('id', id);

    if (updateError) {
      console.error('[useWhatsappNumbers]', 'pipeline_update_error', updateError);
      throw updateError;
    }

    setNumbers(prev => prev.map(n => 
      n.id === id ? { ...n, pipeline_preferential_id: pipelineId } : n
    ));
  }, []);

  const updateInternalName = useCallback(async (id: string, internalName: string) => {
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ internal_name: internalName })
      .eq('id', id);

    if (updateError) {
      console.error('[useWhatsappNumbers]', 'name_update_error', updateError);
      throw updateError;
    }

    setNumbers(prev => prev.map(n => 
      n.id === id ? { ...n, internal_name: internalName } : n
    ));
  }, []);

  const deleteNumber = useCallback(async (id: string) => {
    console.log('[DeleteConnection] delete_start', { whatsappNumberId: id, workspaceId });
    
    if (!workspaceId) {
      console.error('[DeleteConnection] no_workspace_id');
      throw new Error('Workspace não encontrado');
    }

    // Call edge function to delete from Evolution API and database
    console.log('[DeleteConnection] calling_edge_function');
    
    const { data, error: invokeError } = await supabase.functions.invoke('whatsapp-delete-instance', {
      body: { 
        whatsapp_number_id: id,
        workspace_id: workspaceId,
      },
    });

    console.log('[DeleteConnection] edge_function_response', { data, error: invokeError });

    if (invokeError) {
      console.error('[DeleteConnection] invoke_error', invokeError);
      throw new Error(invokeError.message || 'Erro ao chamar função de exclusão');
    }

    if (!data?.ok) {
      console.error('[DeleteConnection] function_returned_error', data);
      throw new Error(data?.message || 'Erro ao excluir conexão');
    }

    // Log warning if Evolution deletion had issues but DB was cleaned
    if (data.evolution_error) {
      console.warn('[DeleteConnection] evolution_warning', data.evolution_error);
    }

    console.log('[DeleteConnection] delete_success', { 
      id, 
      evolutionDeleted: data.evolution_deleted,
      message: data.message 
    });
    
    // Update local state
    setNumbers(prev => prev.filter(n => n.id !== id));
    
    return data;
  }, [workspaceId]);

  // Initial fetch - only once per workspace
  useEffect(() => {
    if (!workspaceId) {
      hasInitialFetchRef.current = false;
      setNumbers([]);
      setLoading(false);
      return;
    }
    
    // Only fetch if we haven't fetched for this workspace yet
    if (!hasInitialFetchRef.current) {
      hasInitialFetchRef.current = true;
      fetchNumbers();
    }
  }, [workspaceId, fetchNumbers]);

  return {
    numbers,
    loading,
    error,
    refetch: fetchNumbers,
    updatePipeline,
    updateInternalName,
    deleteNumber,
  };
}
