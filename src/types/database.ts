// Database types matching Supabase schema

export type AppRole = 'admin' | 'member';
export type ContactStatus = 'active' | 'inactive' | 'blocked';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type WhatsAppNumberStatus = 'connected' | 'disconnected' | 'error';

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
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  status: ContactStatus;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  stage_id: string;
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
  user_id: string;
  internal_name: string;
  phone_number: string;
  status: WhatsAppNumberStatus;
  webhook_url: string | null;
  last_connected_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
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
  whatsapp_number_id: string | null;
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
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Extended types for Kanban
export interface StageWithCards extends Stage {
  cards: Card[];
}

export interface PipelineWithStages extends Pipeline {
  stages: StageWithCards[];
}
