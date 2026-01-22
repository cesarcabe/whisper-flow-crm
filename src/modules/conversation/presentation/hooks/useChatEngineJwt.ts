import { useEffect, useMemo, useState } from 'react';
import { CHATENGINE_BASE_URL } from '../../infrastructure/chatengine/config';
import { useAuth } from '@/contexts/AuthContext';

interface ChatEngineJwtState {
  token: string | null;
  isLoading: boolean;
  isConfigured: boolean;
}

export function useChatEngineJwt(workspaceId: string | null): ChatEngineJwtState {
  const { session, loading: authLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => {
    return Boolean(CHATENGINE_BASE_URL);
  }, []);

  useEffect(() => {
    if (!workspaceId || !isConfigured) {
      setToken(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(authLoading);

    if (session?.access_token) {
      setToken(session.access_token);
    } else {
      setToken(null);
    }
  }, [workspaceId, isConfigured, session?.access_token, authLoading]);

  return {
    token,
    isLoading,
    isConfigured,
  };
}
