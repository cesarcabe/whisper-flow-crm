/**
 * WebSocket Types
 * 
 * Types for WebSocket communication with ChatEngine
 */

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WebSocketMessage {
  id: string
  workspaceId: string
  conversationId: string
  senderId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  content: string
  replyToMessageId?: string
  attachments?: Array<{
    id: string
    messageId: string
    type: 'image' | 'video' | 'audio' | 'file'
    url: string
    thumbnailUrl?: string
    metadata?: {
      filename?: string
      size?: number
      mimeType?: string
      storagePath?: string
      [key: string]: any
    }
  }>
  status: MessageStatus
  metadata?: {
    providerMessageId?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt?: string
}

export interface WebSocketConversation {
  id: string
  workspaceId: string
  contactId?: string
  whatsappNumberId?: string
  channel: 'whatsapp'
  participants: Array<{
    id: string
    name: string
    avatar?: string
  }>
  lastMessage?: {
    id: string
    content: string
    senderId: string
    createdAt: string
  }
  updatedAt: string
}

export interface WebSocketMessageStatus {
  messageId: string
  status: MessageStatus
}

export interface WebSocketTyping {
  conversationId: string
  userId: string
  isTyping: boolean
}

export type WebSocketEventMap = {
  message: (message: WebSocketMessage) => void
  conversation: (conversation: WebSocketConversation) => void
  messageStatus: (data: WebSocketMessageStatus) => void
  typing: (data: WebSocketTyping) => void
  connect: () => void
  disconnect: () => void
  error: (error: Error) => void
}
