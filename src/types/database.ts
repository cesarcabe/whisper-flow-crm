/**
 * Database types for entities that don't have domain equivalents
 * 
 * NOTE: For domain entities (Contact, Conversation, Message, Pipeline, Stage),
 * use @/core/domain/entities instead.
 * 
 * For UI-specific types (BoardViewType, StageWithCards, etc.),
 * use @/types/ui instead.
 */

// ============ Enum Types ============

export type AppRole = 'admin' | 'member';
export type WorkspaceRole = 'owner' | 'admin' | 'agent';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WhatsAppNumberStatus = 'connected' | 'disconnected' | 'error';
export type RecurrenceStatus = 'new' | 'active' | 'warming' | 'cold' | 'lost';
export type SegmentType = 'broadcast' | 'filter';
export type CatalogStatus = 'active' | 'inactive';
export type CatalogSendStatus = 'queued' | 'sending' | 'sent' | 'failed';

// ============ Workspace Types ============

export interface Workspace {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// ============ Classification Types ============

export interface ContactClass {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface GroupClass {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// ============ WhatsApp Types ============

export interface WhatsAppNumber {
  id: string;
  workspace_id: string | null;
  user_id: string;
  internal_name: string;
  phone_number: string;
  provider: string;
  status: WhatsAppNumberStatus;
  webhook_url: string | null;
  last_connected_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Tag Types ============

export interface Tag {
  id: string;
  workspace_id: string | null;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContactTag {
  id: string;
  workspace_id: string;
  contact_id: string;
  tag_id: string;
  created_at: string;
}

// ============ Segment Types ============

export interface Segment {
  id: string;
  workspace_id: string;
  name: string;
  type: SegmentType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentMember {
  id: string;
  workspace_id: string;
  segment_id: string;
  contact_id: string;
  created_at: string;
}

// ============ Catalog Types ============

export interface Catalog {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: CatalogStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogAsset {
  id: string;
  workspace_id: string;
  catalog_id: string;
  storage_bucket: string;
  storage_path: string;
  asset_type: string;
  sort_order: number;
  created_at: string;
}

export interface CatalogSend {
  id: string;
  workspace_id: string;
  catalog_id: string;
  target_type: string;
  contact_id: string | null;
  segment_id: string | null;
  conversation_id: string | null;
  provider: string;
  status: CatalogSendStatus;
  error_message: string | null;
  sent_by_user_id: string | null;
  created_at: string;
}

// ============ Purchase & Recurrence Types ============

export interface Purchase {
  id: string;
  workspace_id: string;
  contact_id: string;
  purchased_at: string;
  value: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CustomerRecurrence {
  contact_id: string;
  workspace_id: string;
  last_purchase_at: string | null;
  avg_days_between_purchases: number | null;
  status: RecurrenceStatus;
  updated_at: string;
}
