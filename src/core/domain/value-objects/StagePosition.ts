/**
 * Value Object para posições em estágios/cards.
 * Encapsula lógica de ordenação.
 */
export class StagePosition {
  private readonly value: number;

  private constructor(value: number) {
    this.value = Math.max(0, Math.floor(value));
  }

  static create(position: number): StagePosition {
    return new StagePosition(position);
  }

  static first(): StagePosition {
    return new StagePosition(0);
  }

  static calculateNext<T extends { position: number }>(items: T[]): StagePosition {
    if (!items || items.length === 0) {
      return StagePosition.first();
    }
    const maxPosition = items.reduce((max, item) => Math.max(max, item.position), -1);
    return new StagePosition(maxPosition + 1);
  }

  static calculateBetween(before: StagePosition | null, after: StagePosition | null): StagePosition {
    if (!before && !after) {
      return StagePosition.first();
    }
    if (!before) {
      return new StagePosition(after!.value - 1);
    }
    if (!after) {
      return new StagePosition(before.value + 1);
    }
    return new StagePosition(Math.floor((before.value + after.value) / 2));
  }

  getValue(): number {
    return this.value;
  }

  isAfter(other: StagePosition): boolean {
    return this.value > other.value;
  }

  isBefore(other: StagePosition): boolean {
    return this.value < other.value;
  }

  equals(other: StagePosition): boolean {
    return this.value === other.value;
  }
}
