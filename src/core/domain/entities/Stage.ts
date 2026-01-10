import { StagePosition } from '../value-objects/StagePosition';

export interface StageProps {
  id: string;
  pipelineId: string;
  workspaceId: string;
  name: string;
  color: string;
  position: StagePosition;
  createdAt: Date;
  updatedAt: Date;
}

export class Stage {
  private readonly props: StageProps;

  private constructor(props: StageProps) {
    this.props = props;
  }

  static create(props: StageProps): Stage {
    return new Stage(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get pipelineId(): string { return this.props.pipelineId; }
  get workspaceId(): string { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get color(): string { return this.props.color; }
  get position(): StagePosition { return this.props.position; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  
  // Comportamentos de domínio
  belongsToPipeline(pipelineId: string): boolean {
    return this.props.pipelineId === pipelineId;
  }

  isAfter(other: Stage): boolean {
    return this.props.position.isAfter(other.position);
  }

  isBefore(other: Stage): boolean {
    return this.props.position.isBefore(other.position);
  }

  hasSamePosition(other: Stage): boolean {
    return this.props.position.equals(other.position);
  }

  isFirstStage(): boolean {
    return this.props.position.getValue() === 0;
  }
}
