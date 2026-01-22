/**
 * Conversation Use Cases
 * 
 * Use cases para operações de conversas e mensagens.
 * Todos os fluxos de entrada (WebSocket e Supabase Webhook) devem usar estes use cases
 * para garantir processamento consistente.
 */

export { ReceiveIncomingMessageUseCase } from './ReceiveIncomingMessageUseCase';
export type { IncomingMessageDTO, ProcessedMessageResult } from './ReceiveIncomingMessageUseCase';

export { SendTextMessageUseCase } from './SendTextMessageUseCase';
export type { SendTextMessageDTO, SendMessageResult } from './SendTextMessageUseCase';
