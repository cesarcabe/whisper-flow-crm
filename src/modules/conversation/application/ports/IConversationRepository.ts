/**
 * Re-export the core ConversationRepository port for module-level usage.
 * This keeps the module self-contained while leveraging the core interface.
 */
export type { ConversationRepository as IConversationRepository } from '@/core/ports/repositories/ConversationRepository';
