// Database types matching Supabase schema

export type AppRole = 'admin' | 'member';
export type WorkspaceRole = 'owner' | 'admin' | 'agent';
export type ContactStatus = 'active' | 'inactive' | 'blocked';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type WhatsAppNumberStatus = 'connected' | 'disconnected' | 'error';
export type RecurrenceStatus = 'new' | 'active' | 'warming' | 'cold' | 'lost';
export type SegmentType = 'broadcast' | 'filter';
export type CatalogStatus = 'active' | 'inactive';
export type CatalogSendStatus = 'queued' | 'sending' | 'sent' | 'failed';

// Workspace types
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

export interface Pipeline {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  pipeline_id: string;
  workspace_id: string | null;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string | null;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  status: ContactStatus;
  tags: string[]; // deprecated, use contact_tags
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  stage_id: string;
  workspace_id: string | null;
  contact_id: string;
  title: string;
  description: string | null;
  priority: CardPriority;
  position: number;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: Contact;
}

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

export interface Conversation {
  id: string;
  workspace_id: string | null;
  contact_id: string;
  whatsapp_number_id: string | null;
  pipeline_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_typing: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  workspace_id: string | null;
  whatsapp_number_id: string | null;
  sent_by_user_id: string | null;
  body: string;
  type: MessageType;
  status: MessageStatus;
  is_outgoing: boolean;
  media_url: string | null;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  workspace_id: string | null;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Contact Tags (many-to-many)
export interface ContactTag {
  id: string;
  workspace_id: string;
  contact_id: string;
  tag_id: string;
  created_at: string;
}

// Segments for broadcast
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

// Catalogs
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

// Purchases and Recurrence
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

// Extended types for Kanban
export interface StageWithCards extends Stage {
  cards: Card[];
}

export interface PipelineWithStages extends Pipeline {
  stages: StageWithCards[];
}
