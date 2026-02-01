export abstract class BaseEntity<TProps> {
  protected readonly props: TProps;
  protected readonly _id: string;

  constructor(id: string, props: TProps) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other: BaseEntity<TProps>): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}
