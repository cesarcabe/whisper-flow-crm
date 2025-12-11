export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  tags: string[];
  status: 'active' | 'inactive' | 'blocked';
  lastSeen?: Date;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  body: string;
  type: 'text' | 'image' | 'document';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOutgoing: boolean;
  timestamp: Date;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
  isTyping?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}
