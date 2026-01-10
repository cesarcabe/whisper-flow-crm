export interface ConversationProps {
  id: string;
  workspaceId: string;
  contactId: string;
  whatsappNumberId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isTyping: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private readonly props: ConversationProps;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  static create(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get contactId(): string { return this.props.contactId; }
  get whatsappNumberId(): string | null { return this.props.whatsappNumberId; }
  get pipelineId(): string | null { return this.props.pipelineId; }
  get stageId(): string | null { return this.props.stageId; }
  get lastMessageAt(): Date | null { return this.props.lastMessageAt; }
  get unreadCount(): number { return this.props.unreadCount; }
  get isTyping(): boolean { return this.props.isTyping; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  
  // Comportamentos de domínio
  hasUnreadMessages(): boolean {
    return this.props.unreadCount > 0;
  }

  isAssignedToStage(): boolean {
    return this.props.stageId !== null;
  }

  isInPipeline(): boolean {
    return this.props.pipelineId !== null;
  }

  canMoveToStage(newStageId: string): boolean {
    return newStageId !== this.props.stageId;
  }

  hasWhatsappConnection(): boolean {
    return this.props.whatsappNumberId !== null;
  }

  isIdle(thresholdMinutes: number = 30): boolean {
    if (!this.props.lastMessageAt) return true;
    const now = new Date();
    const diff = now.getTime() - this.props.lastMessageAt.getTime();
    return diff > thresholdMinutes * 60 * 1000;
  }
}
