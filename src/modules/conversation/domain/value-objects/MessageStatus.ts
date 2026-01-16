/**
 * Value Object que representa o status de uma mensagem
 */
export class MessageStatusVO {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): MessageStatusVO {
    const validStatuses = ['sending', 'sent', 'delivered', 'read', 'failed'];
    if (!validStatuses.includes(value)) {
      return new MessageStatusVO('sending');
    }
    return new MessageStatusVO(value);
  }

  static sending(): MessageStatusVO {
    return new MessageStatusVO('sending');
  }

  static sent(): MessageStatusVO {
    return new MessageStatusVO('sent');
  }

  static delivered(): MessageStatusVO {
    return new MessageStatusVO('delivered');
  }

  static read(): MessageStatusVO {
    return new MessageStatusVO('read');
  }

  static failed(): MessageStatusVO {
    return new MessageStatusVO('failed');
  }

  getValue(): string {
    return this.value;
  }

  isSending(): boolean {
    return this.value === 'sending';
  }

  isSent(): boolean {
    return this.value === 'sent';
  }

  isDelivered(): boolean {
    return this.value === 'delivered';
  }

  isRead(): boolean {
    return this.value === 'read';
  }

  isFailed(): boolean {
    return this.value === 'failed';
  }

  wasSuccessfullySent(): boolean {
    return ['sent', 'delivered', 'read'].includes(this.value);
  }

  getIcon(): 'clock' | 'check' | 'check-check' | 'eye' | 'x' {
    switch (this.value) {
      case 'sending': return 'clock';
      case 'sent': return 'check';
      case 'delivered': return 'check-check';
      case 'read': return 'eye';
      case 'failed': return 'x';
      default: return 'clock';
    }
  }

  equals(other: MessageStatusVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
