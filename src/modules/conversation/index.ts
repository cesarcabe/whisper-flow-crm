// Domain (re-exported from core)
export { Conversation } from '@/core/domain/entities/Conversation';
export { Message } from '@/core/domain/entities/Message';
export { MessageType } from '@/core/domain/value-objects/MessageType';

// Domain (module-specific)
export { ConversationDomainService } from './domain/services/ConversationDomainService';
export { MessageContent } from './domain/value-objects/MessageContent';

// Application
export { ConversationService } from './application/services/ConversationService';
export type { ChatEngineServiceConfig } from './application/services/ConversationService';

export { SendTextMessageUseCase } from './application/useCases/SendTextMessageUseCase';
export type { SendTextMessageDTO, SendMessageResult } from './application/useCases/SendTextMessageUseCase';

export { SendMediaMessageUseCase } from './application/useCases/SendMediaMessageUseCase';
export type { SendMediaMessageDTO, MediaType } from './application/useCases/SendMediaMessageUseCase';

export { ReceiveIncomingMessageUseCase } from './application/useCases/ReceiveIncomingMessageUseCase';
export type { IncomingMessageDTO, ProcessedMessageResult } from './application/useCases/ReceiveIncomingMessageUseCase';

// Ports
export type { IWhatsAppProvider } from './application/ports/IWhatsAppProvider';
export type { IConversationRepository } from './application/ports/IConversationRepository';
export type { IMessageRepository } from './application/ports/IMessageRepository';

// DTOs
export type { CreateMessageDTO } from './application/dtos/CreateMessageDTO';
export type { ConversationDTO, ConversationWithContactDTO } from './application/dtos/ConversationDTO';

// Presentation
export { useConversation, useConversationService } from './presentation/hooks/useConversationService';
export { useConversations } from './presentation/hooks/useConversations';
export { useMessages } from './presentation/hooks/useMessages';
export { useSendMessage } from './presentation/hooks/useSendMessage';
export { ConversationProvider } from './presentation/contexts/ConversationContext';
