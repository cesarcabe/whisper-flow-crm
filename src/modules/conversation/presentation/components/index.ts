/**
 * Conversation Presentation Components
 * 
 * Componentes de UI para o módulo de conversas.
 * Migrados de src/components/whatsapp/ para estrutura modular.
 */

// WhatsApp connection and settings
export { WhatsappSettingsTab } from './WhatsappSettingsTab';
export { WhatsappConnectionCard } from './WhatsappConnectionCard';
export { CreateWhatsappDialog } from './CreateWhatsappDialog';
export { WhatsappQrModal } from './WhatsappQrModal';

// Conversation list
export { ConversationItem } from './ConversationItem';
export { ConversationFilters, useConversationFilters } from './ConversationFilters';
export type { FilterState, ConversationType } from './ConversationFilters';
export { NewConversationDialog } from './NewConversationDialog';

// Message thread and input
export { MessageThread } from './MessageThread';
export { MessageInput } from './MessageInput';
export { MessageBubble } from './MessageBubble';

// Media components
export { AudioPlayer } from './AudioPlayer';
export { ImageViewer } from './ImageViewer';

// Actions
export { ForwardMessageDialog } from './ForwardMessageDialog';
export { ReactionPicker } from './ReactionPicker';
