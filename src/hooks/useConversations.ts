/**
 * @deprecated Import from '@/modules/conversation' instead
 * This file is kept for backwards compatibility only
 */

// Re-export from the new modular location
export { 
  useConversations,
  type LegacyConversationWithContact as ConversationWithContact,
} from '@/modules/conversation/presentation/hooks/useConversations';

// Re-export domain entities for consumers that need them
export { Conversation } from '@/core/domain/entities/Conversation';
export { Contact } from '@/core/domain/entities/Contact';
