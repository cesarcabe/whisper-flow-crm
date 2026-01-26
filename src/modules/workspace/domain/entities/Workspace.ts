/**
 * Workspace Entity
 * 
 * Represents a tenant/organization in the multi-tenant system.
 * Encapsulates domain logic for workspace operations.
 */

export interface WorkspaceProps {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Subscription fields
  tier: string | null;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export class Workspace {
  private readonly props: WorkspaceProps;

  private constructor(props: WorkspaceProps) {
    this.props = props;
  }

  static create(props: WorkspaceProps): Workspace {
    return new Workspace(props);
  }

  // ============ Getters ============
  
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get city(): string | null {
    return this.props.city;
  }

  get state(): string | null {
    return this.props.state;
  }

  get createdBy(): string | null {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get tier(): string | null {
    return this.props.tier;
  }

  get subscriptionStatus(): string | null {
    return this.props.subscriptionStatus;
  }

  get subscriptionEndsAt(): Date | null {
    return this.props.subscriptionEndsAt;
  }

  get stripeCustomerId(): string | null {
    return this.props.stripeCustomerId;
  }

  get stripeSubscriptionId(): string | null {
    return this.props.stripeSubscriptionId;
  }

  // ============ Domain Behavior ============

  /**
   * Returns formatted location string (city, state)
   */
  getDisplayLocation(): string {
    if (this.city && this.state) {
      return `${this.city}, ${this.state}`;
    }
    return this.city || this.state || '';
  }

  /**
   * Checks if workspace has location defined
   */
  hasLocation(): boolean {
    return this.city !== null || this.state !== null;
  }

  /**
   * Returns initials for avatar display
   */
  getInitials(): string {
    return this.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
