import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConversationService } from '../../application/services/ConversationService';
import { SupabaseConversationRepository } from '../../infrastructure/supabase/SupabaseConversationRepository';
import { SupabaseMessageRepository } from '../../infrastructure/supabase/SupabaseMessageRepository';
import { ChatEngineConfig, DEFAULT_CHATENGINE_CONFIG, isChatEngineConfigured } from '../../infrastructure/chatengine/config';

/**
 * ConversationContext Type
 */
interface ConversationContextType {
  service: ConversationService;
  workspaceId: string | null;
  isChatEngineEnabled: boolean;
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
  /** Optional ChatEngine configuration. If not provided, uses Supabase as fallback */
  chatEngineConfig?: ChatEngineConfig;
}

/**
 * ConversationProvider - Injects ConversationService into React tree
 * 
 * Features:
 * - Creates ConversationService with appropriate repositories
 * - Uses ChatEngine if configured, otherwise falls back to Supabase
 * - Recreates service when workspaceId changes
 * 
 * Usage:
 * ```tsx
 * <ConversationProvider>
 *   <App />
 * </ConversationProvider>
 * 
 * // Or with custom ChatEngine config
 * <ConversationProvider chatEngineConfig={{ baseUrl: '...', apiKey: '...' }}>
 *   <App />
 * </ConversationProvider>
 * ```
 */
export function ConversationProvider({ 
  children, 
  chatEngineConfig = DEFAULT_CHATENGINE_CONFIG 
}: ConversationProviderProps) {
  const { workspaceId } = useWorkspace();

  const isChatEngineEnabled = isChatEngineConfigured(chatEngineConfig);

  // Create service instance
  // Memoized to prevent unnecessary recreation
  const service = useMemo(() => {
    // Always create repositories - they implement the ports
    const conversationRepo = new SupabaseConversationRepository();
    const messageRepo = new SupabaseMessageRepository();

    // Create service with or without ChatEngine config
    // Map ChatEngineConfig to what ConversationService expects
    const chatEngineServiceConfig = isChatEngineEnabled 
      ? { baseUrl: chatEngineConfig.baseUrl, apiKey: chatEngineConfig.jwtToken }
      : undefined;

    return new ConversationService(
      conversationRepo,
      messageRepo,
      workspaceId ?? '',
      chatEngineServiceConfig
    );
  }, [workspaceId, chatEngineConfig, isChatEngineEnabled]);

  const contextValue = useMemo(() => ({
    service,
    workspaceId,
    isChatEngineEnabled,
  }), [service, workspaceId, isChatEngineEnabled]);

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
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { service, isChatEngineEnabled } = useConversation();
 *   
 *   const handleSend = async () => {
 *     const result = await service.sendTextMessage(conversationId, 'Hello');
 *     if (result.success) {
 *       console.log('Sent:', result.data);
 *     }
 *   };
 * }
 * ```
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
