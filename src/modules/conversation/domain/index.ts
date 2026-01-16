// Entities
export { Conversation } from './entities/Conversation';
export type { ConversationProps } from './entities/Conversation';
export { Message } from './entities/Message';
export type { MessageProps, MessageStatus, QuotedMessage } from './entities/Message';

// Value Objects
export { MessageType } from './value-objects/MessageType';
export { MessageStatusVO } from './value-objects/MessageStatus';

// Ports (Repository interfaces)
export type { 
  ConversationRepository, 
  ConversationFilters, 
  ConversationOrderBy 
} from './ports/ConversationRepository';
export type { 
  MessageRepository, 
  MessageFilters, 
  PaginationOptions 
} from './ports/MessageRepository';
