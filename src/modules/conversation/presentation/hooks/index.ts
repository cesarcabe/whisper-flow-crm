/**
 * Presentation layer hooks for conversation module
 */
export { useConversation, useConversationService } from './useConversationService';
export { useConversations, type LegacyConversationWithContact } from './useConversations';
export { useMessages } from './useMessages';
export { useChatEngineJwt } from './useChatEngineJwt';
export { useSendMessage } from './useSendMessage';
export { useWebSocket } from './useWebSocket';
export { 
  useOptimisticMessages, 
  createClientMessageId,
  type OptimisticMessage,
  type OptimisticMessageStatus 
} from './useOptimisticMessages';
export { 
  useMediaUrl, 
  useMediaUrlDirect, 
  clearMediaUrlCache, 
  preloadMediaUrl 
} from './useMediaUrl';
