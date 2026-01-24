import { MessageType } from '../value-objects/MessageType';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Represents a quoted message in a reply
 */
export interface QuotedMessage {
  id: string;
  body: string;
  type: string;
  isOutgoing: boolean;
}

export interface MessageProps {
  id: string;
  conversationId: string;
  workspaceId: string;
  whatsappNumberId: string | null;
  sentByUserId: string | null;
  body: string;
  type: MessageType;
  status: MessageStatus;
  isOutgoing: boolean;
  mediaUrl: string | null;
  externalId: string | null;
  errorMessage: string | null;
  replyToId: string | null;
  quotedMessage: QuotedMessage | null;
  createdAt: Date;
}

export class Message {
  private readonly props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
  }

  static create(props: MessageProps): Message {
    return new Message(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get conversationId(): string { return this.props.conversationId; }
  get workspaceId(): string { return this.props.workspaceId; }
  get whatsappNumberId(): string | null { return this.props.whatsappNumberId; }
  get sentByUserId(): string | null { return this.props.sentByUserId; }
  get body(): string { return this.props.body; }
  get type(): MessageType { return this.props.type; }
  get status(): MessageStatus { return this.props.status; }
  get isOutgoing(): boolean { return this.props.isOutgoing; }
  get mediaUrl(): string | null { return this.props.mediaUrl; }
  get externalId(): string | null { return this.props.externalId; }
  get errorMessage(): string | null { return this.props.errorMessage; }
  get replyToId(): string | null { return this.props.replyToId; }
  get quotedMessage(): QuotedMessage | null { return this.props.quotedMessage; }
  get createdAt(): Date { return this.props.createdAt; }
  
  // Computed properties
  get isIncoming(): boolean { return !this.props.isOutgoing; }
  
  // Comportamentos de domínio
  isFromAgent(): boolean {
    return this.props.isOutgoing && this.props.sentByUserId !== null;
  }

  isFromSystem(): boolean {
    return this.props.isOutgoing && this.props.sentByUserId === null;
  }

  hasMedia(): boolean {
    return this.props.mediaUrl !== null;
  }

  isFailed(): boolean {
    return this.props.status === 'failed';
  }

  isSending(): boolean {
    return this.props.status === 'sending';
  }

  isSent(): boolean {
    return this.props.status === 'sent';
  }

  isDelivered(): boolean {
    return this.props.status === 'delivered';
  }

  isRead(): boolean {
    return this.props.status === 'read';
  }

  wasSuccessfullySent(): boolean {
    return ['sent', 'delivered', 'read'].includes(this.props.status);
  }

  /**
   * Checks if this message is a reply to another message
   */
  isReply(): boolean {
    return this.props.replyToId !== null;
  }

  /**
   * Gets a preview of the quoted message
   */
  getQuotedPreview(): string | null {
    if (!this.props.quotedMessage) return null;
    const quoted = this.props.quotedMessage;
    
    if (quoted.type === 'image') return '📷 Imagem';
    if (quoted.type === 'audio') return '🎤 Áudio';
    if (quoted.type === 'video') return '🎬 Vídeo';
    if (quoted.type === 'document') return '📄 Documento';
    
    return quoted.body || '📎 Mídia';
  }

  getPreview(maxLength: number = 50): string {
    if (this.props.type.isMedia()) {
      return `[${this.props.type.getValue().toUpperCase()}]`;
    }
    if (this.props.body.length <= maxLength) {
      return this.props.body;
    }
    return this.props.body.slice(0, maxLength) + '...';
  }

  getStatusIcon(): 'clock' | 'check' | 'check-check' | 'eye' | 'x' {
    switch (this.props.status) {
      case 'sending': return 'clock';
      case 'sent': return 'check';
      case 'delivered': return 'check-check';
      case 'read': return 'eye';
      case 'failed': return 'x';
    }
  }
}
