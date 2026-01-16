import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatEngineToken {
  token: string;
  expiresAt: Date;
  workspaceId: string;
}

/**
 * Hook to manage ChatEngine JWT tokens
 * Fetches tokens from the chatengine-token edge function
 * Automatically refreshes tokens before expiration
 */
export function useChatEngineToken(workspaceId: string | null) {
  const [tokenData, setTokenData] = useState<ChatEngineToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async (wsId: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('chatengine-token', {
        body: { workspace_id: wsId },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch ChatEngine token');
      }

      if (!data?.token) {
        throw new Error('No token received from server');
      }

      // Calculate expiration time (subtract 5 minutes for buffer)
      const expiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);

      setTokenData({
        token: data.token,
        expiresAt,
        workspaceId: data.workspace_id,
      });

      return data.token;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to fetch ChatEngine token:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current valid token or fetch new one
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!workspaceId) return null;

    // Check if we have a valid token
    if (tokenData && tokenData.expiresAt > new Date() && tokenData.workspaceId === workspaceId) {
      return tokenData.token;
    }

    // Fetch new token
    return fetchToken(workspaceId);
  }, [workspaceId, tokenData, fetchToken]);

  // Fetch token when workspaceId changes
  useEffect(() => {
    if (workspaceId && (!tokenData || tokenData.workspaceId !== workspaceId)) {
      fetchToken(workspaceId);
    }
  }, [workspaceId, tokenData, fetchToken]);

  // Set up automatic refresh before expiration
  useEffect(() => {
    if (!tokenData || !workspaceId) return;

    const timeUntilRefresh = tokenData.expiresAt.getTime() - Date.now();
    if (timeUntilRefresh <= 0) return;

    const refreshTimer = setTimeout(() => {
      fetchToken(workspaceId);
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [tokenData, workspaceId, fetchToken]);

  return {
    token: tokenData?.token ?? null,
    isLoading,
    error,
    getToken,
    refreshToken: () => workspaceId ? fetchToken(workspaceId) : Promise.resolve(null),
  };
}
