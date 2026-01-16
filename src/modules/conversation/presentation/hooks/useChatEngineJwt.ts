import { useState, useCallback, useEffect, useRef } from 'react';
import { generateChatEngineJwt, isChatEngineJwtConfigured } from '../../infrastructure/chatengine/jwtGenerator';
import { useAuth } from '@/contexts/AuthContext';

interface ChatEngineJwtState {
  token: string | null;
  expiresAt: Date | null;
  workspaceId: string | null;
}

/**
 * Hook to manage ChatEngine JWT tokens
 * 
 * Generates JWT tokens locally using VITE_CHATENGINE_JWT_SECRET.
 * Automatically refreshes tokens before expiration.
 * 
 * This hook replaces the edge function approach for simpler,
 * direct JWT generation on the client.
 */
export function useChatEngineJwt(workspaceId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ChatEngineJwtState>({
    token: null,
    expiresAt: null,
    workspaceId: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if generation is in progress to avoid duplicates
  const isGenerating = useRef(false);

  /**
   * Generate a new JWT token
   */
  const generateToken = useCallback(async (wsId: string, userId: string): Promise<string | null> => {
    // Prevent concurrent generation
    if (isGenerating.current) {
      console.log('[useChatEngineJwt] Token generation already in progress');
      return state.token;
    }

    try {
      isGenerating.current = true;
      setIsLoading(true);
      setError(null);

      // Check if JWT secret is configured
      if (!isChatEngineJwtConfigured()) {
        throw new Error('VITE_CHATENGINE_JWT_SECRET not configured');
      }

      // Generate JWT with 1 hour expiration
      const token = await generateChatEngineJwt({
        workspace_id: wsId,
        user_id: userId,
      }, '1h');

      // Calculate expiration (55 minutes to refresh before actual expiry)
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000);

      setState({
        token,
        expiresAt,
        workspaceId: wsId,
      });

      console.log('[useChatEngineJwt] Token generated successfully');
      return token;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate JWT');
      setError(error);
      console.error('[useChatEngineJwt] Token generation failed:', error);
      return null;
    } finally {
      setIsLoading(false);
      isGenerating.current = false;
    }
  }, [state.token]);

  /**
   * Get current valid token or generate a new one
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!workspaceId || !user?.id) {
      console.log('[useChatEngineJwt] Missing workspaceId or userId');
      return null;
    }

    // Check if we have a valid, non-expired token for current workspace
    if (
      state.token &&
      state.expiresAt &&
      state.expiresAt > new Date() &&
      state.workspaceId === workspaceId
    ) {
      return state.token;
    }

    // Generate new token
    return generateToken(workspaceId, user.id);
  }, [workspaceId, user?.id, state, generateToken]);

  // Generate token when workspaceId or user changes
  useEffect(() => {
    if (workspaceId && user?.id) {
      // Only generate if we don't have a valid token for this workspace
      if (!state.token || state.workspaceId !== workspaceId) {
        generateToken(workspaceId, user.id);
      }
    }
  }, [workspaceId, user?.id, state.token, state.workspaceId, generateToken]);

  // Set up automatic refresh before expiration
  useEffect(() => {
    if (!state.expiresAt || !workspaceId || !user?.id) return;

    const timeUntilRefresh = state.expiresAt.getTime() - Date.now();
    if (timeUntilRefresh <= 0) return;

    console.log('[useChatEngineJwt] Scheduling token refresh in', Math.round(timeUntilRefresh / 60000), 'minutes');

    const refreshTimer = setTimeout(() => {
      generateToken(workspaceId, user.id);
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [state.expiresAt, workspaceId, user?.id, generateToken]);

  return {
    token: state.token,
    isLoading,
    error,
    getToken,
    refreshToken: () => workspaceId && user?.id ? generateToken(workspaceId, user.id) : Promise.resolve(null),
    isConfigured: isChatEngineJwtConfigured(),
  };
}
