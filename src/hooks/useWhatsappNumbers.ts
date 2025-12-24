import { useState, useEffect, useCallback } from 'react';
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
    console.log('[useWhatsappNumbers]', 'delete_start', { id });
    
    const { error: deleteError } = await supabase
      .from('whatsapp_numbers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[useWhatsappNumbers]', 'delete_error', deleteError);
      throw deleteError;
    }

    console.log('[useWhatsappNumbers]', 'delete_success', { id });
    setNumbers(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

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
