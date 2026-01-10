export interface PipelineProps {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  createdBy: string | null;
  ownerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Pipeline {
  private readonly props: PipelineProps;

  private constructor(props: PipelineProps) {
    this.props = props;
  }

  static create(props: PipelineProps): Pipeline {
    return new Pipeline(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get color(): string { return this.props.color; }
  get createdBy(): string | null { return this.props.createdBy; }
  get ownerId(): string | null { return this.props.ownerUserId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  
  // Comportamentos de domínio
  isOwnedBy(userId: string): boolean {
    return this.props.ownerUserId === userId;
  }

  isCreatedBy(userId: string): boolean {
    return this.props.createdBy === userId;
  }

  hasDescription(): boolean {
    return this.props.description !== null && this.props.description.length > 0;
  }

  hasOwner(): boolean {
    return this.props.ownerUserId !== null;
  }

  canBeEditedBy(userId: string, isAdmin: boolean = false): boolean {
    if (isAdmin) return true;
    return this.isOwnedBy(userId) || this.isCreatedBy(userId);
  }
}
