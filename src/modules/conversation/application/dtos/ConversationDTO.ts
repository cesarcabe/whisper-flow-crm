export interface ConversationDTO {
  id: string;
  contactId: string;
  workspaceId: string;
  whatsappNumberId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isTyping: boolean;
  isGroup: boolean;
  remoteJid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithContactDTO extends ConversationDTO {
  contact: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
    contactClassId: string | null;
    contactClass?: {
      id: string;
      name: string;
      color: string | null;
    } | null;
  } | null;
  lastMessagePreview: string;
  stage: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}
