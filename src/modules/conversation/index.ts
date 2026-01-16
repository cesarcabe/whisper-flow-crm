// Domain
export * from './domain';

// Application
export * from './application';

// Presentation (contexts, hooks)
export * from './presentation';

// Infrastructure (exported for DI setup)
export { ChatEngineClient, ChatEngineMapper } from './infrastructure/chatengine';
export { SupabaseConversationRepository, SupabaseMessageRepository } from './infrastructure/supabase';
export { isChatEngineConfigured, DEFAULT_CHATENGINE_CONFIG } from './infrastructure/chatengine/config';
export type { ChatEngineConfig } from './infrastructure/chatengine/config';
