/**
 * Value Object que representa o tipo de uma mensagem
 */
export class MessageType {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value.toLowerCase();
  }

  static create(value: string): MessageType {
    return new MessageType(value);
  }

  static text(): MessageType {
    return new MessageType('text');
  }

  static image(): MessageType {
    return new MessageType('image');
  }

  static audio(): MessageType {
    return new MessageType('audio');
  }

  static video(): MessageType {
    return new MessageType('video');
  }

  static document(): MessageType {
    return new MessageType('document');
  }

  getValue(): string {
    return this.value;
  }

  isText(): boolean {
    return this.value === 'text';
  }

  isImage(): boolean {
    return this.value === 'image';
  }

  isAudio(): boolean {
    return this.value === 'audio';
  }

  isVideo(): boolean {
    return this.value === 'video';
  }

  isDocument(): boolean {
    return this.value === 'document';
  }

  isMedia(): boolean {
    return ['image', 'audio', 'video', 'document'].includes(this.value);
  }

  equals(other: MessageType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
