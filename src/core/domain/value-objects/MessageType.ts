/**
 * Value Object para tipos de mensagem.
 * Centraliza validação e comportamento.
 */
export type MessageTypeValue = 'text' | 'image' | 'document' | 'audio' | 'video';

export class MessageType {
  private static readonly VALID_TYPES: MessageTypeValue[] = ['text', 'image', 'document', 'audio', 'video'];
  private static readonly MEDIA_TYPES: MessageTypeValue[] = ['image', 'document', 'audio', 'video'];
  
  private readonly value: MessageTypeValue;

  private constructor(value: MessageTypeValue) {
    this.value = value;
  }

  static create(type: string): MessageType {
    const normalized = type.toLowerCase() as MessageTypeValue;
    if (!MessageType.VALID_TYPES.includes(normalized)) {
      return new MessageType('text'); // fallback
    }
    return new MessageType(normalized);
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

  getValue(): MessageTypeValue {
    return this.value;
  }

  isMedia(): boolean {
    return MessageType.MEDIA_TYPES.includes(this.value);
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

  requiresDownload(): boolean {
    return this.isMedia();
  }
}
