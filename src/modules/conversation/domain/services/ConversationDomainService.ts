import { Message } from '@/core/domain/entities/Message';

export class ConversationDomainService {
  /**
   * Determines if an incoming message is a duplicate based on ID matching.
   */
  static isDuplicate(existingMessages: Message[], newMessageId: string, externalId?: string | null): boolean {
    return existingMessages.some(m =>
      m.id === newMessageId ||
      (externalId && m.externalId === externalId) ||
      (externalId && m.id === externalId)
    );
  }

  /**
   * Determines if a sender ID represents a phone number (incoming message)
   * vs an agent/system sender (outgoing message).
   */
  static isIncomingSender(senderId: string): boolean {
    const isPhoneNumber = /^\+?[1-9]\d{10,14}(@s\.whatsapp\.net)?$/.test(senderId);
    return isPhoneNumber && senderId !== 'me' && senderId !== 'system';
  }

  /**
   * Sorts conversations by last message date, most recent first.
   */
  static sortByLastMessage<T extends { lastMessageAt?: Date | string | null }>(conversations: T[]): T[] {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }
}
