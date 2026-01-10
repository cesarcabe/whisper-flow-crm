/**
 * UI-specific types that don't belong to domain entities
 * These are types used exclusively for UI components and views
 */

import { Tables } from '@/integrations/supabase/types';

// ============ Board View Types ============

/**
 * Types of board views available in the Kanban
 */
export type BoardViewType = 'relationship' | 'stage' | 'groups';

// ============ Extended Types for Kanban ============

type Stage = Tables<'stages'>;
type Card = Tables<'cards'> & { contact?: Tables<'contacts'> };
type Pipeline = Tables<'pipelines'>;
type ContactClass = Tables<'contact_classes'>;
type Contact = Tables<'contacts'>;

/**
 * Stage with its cards for Kanban board display
 */
export interface StageWithCards extends Stage {
  cards: Card[];
}

/**
 * Pipeline with stages and cards for full Kanban view
 */
export interface PipelineWithStages extends Pipeline {
  stages: StageWithCards[];
}

/**
 * Contact class with its contacts for relationship board
 */
export interface ContactClassWithContacts extends ContactClass {
  contacts: Contact[];
}

// ============ Re-export Card for convenience ============

export type { Card };
