export interface DomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly occurredOn: Date;

  constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
  ) {
    this.occurredOn = new Date();
  }
}
