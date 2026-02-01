import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ConversationService } from '../../application/services/ConversationService';
import { getContainer } from '@/config/di-container';
import { CHATENGINE_BASE_URL } from '../../infrastructure/chatengine/config';
import { useChatEngineJwt } from '../hooks/useChatEngineJwt';
import { WebSocketProvider } from '../../infrastructure/websocket/WebSocketContext';

interface ConversationContextType {
  service: ConversationService;
  workspaceId: string | null;
  isChatEngineEnabled: boolean;
  isTokenLoading: boolean;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

interface ConversationProviderProps {
  children: ReactNode;
  chatEngineBaseUrl?: string;
}

export function ConversationProvider({
  children,
  chatEngineBaseUrl = CHATENGINE_BASE_URL,
}: ConversationProviderProps) {
  return (
    <WebSocketProvider baseUrl={chatEngineBaseUrl}>
      <ConversationProviderInner chatEngineBaseUrl={chatEngineBaseUrl}>
        {children}
      </ConversationProviderInner>
    </WebSocketProvider>
  );
}

function ConversationProviderInner({
  children,
  chatEngineBaseUrl = CHATENGINE_BASE_URL,
}: ConversationProviderProps) {
  const { workspaceId } = useWorkspace();
  const { token, isLoading: isTokenLoading, isConfigured } = useChatEngineJwt(workspaceId);

  const isChatEngineEnabled = Boolean(chatEngineBaseUrl && isConfigured && token);

  const service = useMemo(() => {
    const container = getContainer();

    const chatEngineServiceConfig = isChatEngineEnabled
      ? { baseUrl: chatEngineBaseUrl, apiKey: token! }
      : undefined;

    return new ConversationService(
      container.conversationRepository,
      container.messageRepository,
      workspaceId ?? '',
      chatEngineServiceConfig,
    );
  }, [workspaceId, chatEngineBaseUrl, token, isChatEngineEnabled]);

  const contextValue = useMemo(
    () => ({
      service,
      workspaceId,
      isChatEngineEnabled,
      isTokenLoading,
    }),
    [service, workspaceId, isChatEngineEnabled, isTokenLoading],
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation(): ConversationContextType {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      'useConversation must be used within a ConversationProvider. ' +
      'Make sure to wrap your component tree with <ConversationProvider>.',
    );
  }
  return context;
}

export function useConversationService(): ConversationService {
  const { service } = useConversation();
  return service;
}
