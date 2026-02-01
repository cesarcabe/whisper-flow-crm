export interface KanbanCardProps {
  id: string;
  stageId: string;
  workspaceId: string;
  contactId: string;
  title: string;
  description?: string | null;
  position: number;
  priority?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact?: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
  } | null;
}

export class KanbanCard {
  private constructor(private readonly props: KanbanCardProps) {}

  static create(props: KanbanCardProps): KanbanCard {
    return new KanbanCard(props);
  }

  get id() { return this.props.id; }
  get stageId() { return this.props.stageId; }
  get workspaceId() { return this.props.workspaceId; }
  get contactId() { return this.props.contactId; }
  get title() { return this.props.title; }
  get description() { return this.props.description; }
  get position() { return this.props.position; }
  get priority() { return this.props.priority; }
  get dueDate() { return this.props.dueDate; }
  get contact() { return this.props.contact; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  isOverdue(): boolean {
    if (!this.props.dueDate) return false;
    return this.props.dueDate < new Date();
  }

  hasContact(): boolean {
    return !!this.props.contact;
  }
}
