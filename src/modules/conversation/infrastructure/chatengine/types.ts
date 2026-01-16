/**
 * DTOs for ChatEngine API communication
 * These types represent the external API contract
 */

export interface ChatEngineMessageDTO {
  id: string;
  conversation_id: string;
  external_id: string | null;
  body: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  from_me: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  media_url: string | null;
  reply_to_id: string | null;
  quoted_message: {
    id: string;
    body: string;
    type: string;
    is_outgoing: boolean;
  } | null;
  sent_by_user_id: string | null;
  created_at: string;
}

export interface ChatEngineConversationDTO {
  id: string;
  workspace_id: string;
  contact_id: string;
  whatsapp_number_id: string | null;
  remote_jid: string | null;
  is_group: boolean;
  pipeline_id: string | null;
  stage_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_typing: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendTextMessagePayload {
  conversation_id: string;
  body: string;
  reply_to_id?: string;
}

export interface SendImagePayload {
  conversation_id: string;
  image_base64: string;
  mime_type: string;
  caption?: string;
  reply_to_id?: string;
}

export interface SendAudioPayload {
  conversation_id: string;
  audio_base64: string;
  mime_type: string;
}

export interface MoveToStagePayload {
  stage_id: string | null;
  pipeline_id: string | null;
}

export interface ChatEngineListResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ChatEngineError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
