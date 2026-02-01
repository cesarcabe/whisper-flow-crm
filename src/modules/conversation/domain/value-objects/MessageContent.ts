export class MessageContent {
  private readonly value: string;

  private constructor(content: string) {
    this.value = content;
  }

  static create(content: string): MessageContent {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Message content cannot be empty');
    }
    return new MessageContent(trimmed);
  }

  static fromRaw(content: string): MessageContent {
    return new MessageContent(content);
  }

  getPreview(maxLength = 50): string {
    if (this.value.length <= maxLength) return this.value;
    return this.value.substring(0, maxLength) + '...';
  }

  toString(): string {
    return this.value;
  }

  get length(): number {
    return this.value.length;
  }

  isEmpty(): boolean {
    return this.value.trim().length === 0;
  }

  equals(other: MessageContent): boolean {
    return this.value === other.value;
  }
}
