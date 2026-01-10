import { Phone } from '../value-objects/Phone';

export type ContactStatus = 'active' | 'inactive' | 'blocked';

export interface ContactProps {
  id: string;
  workspaceId: string;
  name: string;
  phone: Phone;
  email: string | null;
  avatarUrl: string | null;
  status: ContactStatus;
  notes: string | null;
  contactClassId: string | null;
  groupClassId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Contact {
  private readonly props: ContactProps;

  private constructor(props: ContactProps) {
    this.props = props;
  }

  static create(props: ContactProps): Contact {
    return new Contact(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get phone(): Phone { return this.props.phone; }
  get email(): string | null { return this.props.email; }
  get avatarUrl(): string | null { return this.props.avatarUrl; }
  get status(): ContactStatus { return this.props.status; }
  get notes(): string | null { return this.props.notes; }
  get contactClassId(): string | null { return this.props.contactClassId; }
  get groupClassId(): string | null { return this.props.groupClassId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Computed properties
  get isActive(): boolean { return this.props.status === 'active'; }
  get isBlocked(): boolean { return this.props.status === 'blocked'; }
  get isInactive(): boolean { return this.props.status === 'inactive'; }
  
  // Comportamentos de domínio
  canReceiveMessages(): boolean {
    return this.isActive;
  }

  getDisplayName(): string {
    return this.props.name || this.props.phone.format();
  }

  hasClassification(): boolean {
    return this.props.contactClassId !== null;
  }

  hasGroupClassification(): boolean {
    return this.props.groupClassId !== null;
  }

  hasEmail(): boolean {
    return this.props.email !== null && this.props.email.length > 0;
  }

  hasAvatar(): boolean {
    return this.props.avatarUrl !== null;
  }
}
