import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConversationService } from '../../application/services/ConversationService';
import { SupabaseConversationRepository } from '../../infrastructure/supabase/SupabaseConversationRepository';
import { SupabaseMessageRepository } from '../../infrastructure/supabase/SupabaseMessageRepository';
import { CHATENGINE_BASE_URL } from '../../infrastructure/chatengine/config';
import { useChatEngineJwt } from '../hooks/useChatEngineJwt';

/**
 * ConversationContext Type
 */
interface ConversationContextType {
  service: ConversationService;
  workspaceId: string | null;
  isChatEngineEnabled: boolean;
  isTokenLoading: boolean;
}

/**
 * Context for providing ConversationService to components
 * Follows the same pattern as WorkspaceContext
 */
const ConversationContext = createContext<ConversationContextType | null>(null);

/**
 * Props for ConversationProvider
 */
interface ConversationProviderProps {
  children: ReactNode;
  /** Override ChatEngine base URL (defaults to production URL) */
  chatEngineBaseUrl?: string;
}

/**
 * ConversationProvider - Injects ConversationService into React tree
 * 
 * Features:
 * - Creates ConversationService with appropriate repositories
 * - Automatically fetches JWT tokens for ChatEngine
 * - Recreates service when workspaceId or token changes
 */
export function ConversationProvider({ 
  children, 
  chatEngineBaseUrl = CHATENGINE_BASE_URL 
}: ConversationProviderProps) {
  const { workspaceId } = useWorkspace();
  const { token, isLoading: isTokenLoading, isConfigured } = useChatEngineJwt(workspaceId);
  
  // Track if ChatEngine is properly configured (has URL, secret, and valid token)
  const isChatEngineEnabled = Boolean(chatEngineBaseUrl && isConfigured && token);

  // Create service instance
  // Memoized and recreated when token changes
  const service = useMemo(() => {
    // Always create repositories - they implement the ports
    const conversationRepo = new SupabaseConversationRepository();
    const messageRepo = new SupabaseMessageRepository();

    // Create service with or without ChatEngine config
    const chatEngineServiceConfig = isChatEngineEnabled 
      ? { baseUrl: chatEngineBaseUrl, apiKey: token! }
      : undefined;

    return new ConversationService(
      conversationRepo,
      messageRepo,
      workspaceId ?? '',
      chatEngineServiceConfig
    );
  }, [workspaceId, chatEngineBaseUrl, token, isChatEngineEnabled]);

  const contextValue = useMemo(() => ({
    service,
    workspaceId,
    isChatEngineEnabled,
    isTokenLoading,
  }), [service, workspaceId, isChatEngineEnabled, isTokenLoading]);

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}

/**
 * Hook to access ConversationService
 * 
 * @throws Error if used outside ConversationProvider
 */
export function useConversation(): ConversationContextType {
  const context = useContext(ConversationContext);
  
  if (!context) {
    throw new Error(
      'useConversation must be used within a ConversationProvider. ' +
      'Make sure to wrap your component tree with <ConversationProvider>.'
    );
  }
  
  return context;
}

/**
 * Hook to access just the ConversationService
 * Shorthand for useConversation().service
 */
export function useConversationService(): ConversationService {
  const { service } = useConversation();
  return service;
}
