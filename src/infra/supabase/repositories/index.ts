/**
 * Supabase Repository Implementations
 * Export all repository adapters for easy importing
 */

export { SupabaseContactRepository } from './SupabaseContactRepository';
export { SupabaseConversationRepository } from './SupabaseConversationRepository';
export { SupabaseMessageRepository } from './SupabaseMessageRepository';
export { SupabasePipelineRepository } from './SupabasePipelineRepository';
export { SupabaseStageRepository } from './SupabaseStageRepository';

// Re-export repository interfaces for convenience
export type { ContactRepository } from '@/core/ports/repositories/ContactRepository';
export type { ConversationRepository, ConversationFilters, ConversationOrderBy } from '@/core/ports/repositories/ConversationRepository';
export type { MessageRepository, MessageFilters, PaginationOptions } from '@/core/ports/repositories/MessageRepository';
export type { PipelineRepository } from '@/core/ports/repositories/PipelineRepository';
export type { StageRepository } from '@/core/ports/repositories/StageRepository';
