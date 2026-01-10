import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { SupabaseConversationRepository } from '@/infra/supabase/repositories/SupabaseConversationRepository';
import { Conversation } from '@/core/domain/entities/Conversation';

interface UseCreateConversationOptions {
  whatsappNumberId: string | null;
  workspaceId: string | null;
  onSuccess?: (conversationId: string) => void;
}

interface UseCreateConversationReturn {
  createConversation: (contactId: string, contactPhone: string) => Promise<void>;
  creating: boolean;
}

/**
 * Hook para criar novas conversas.
 * Encapsula lógica de verificação de conversa existente e criação.
 */
export function useCreateConversation({
  whatsappNumberId,
  workspaceId,
  onSuccess,
}: UseCreateConversationOptions): UseCreateConversationReturn {
  const [creating, setCreating] = useState(false);
  const repository = new SupabaseConversationRepository();

  const createConversation = useCallback(async (contactId: string, contactPhone: string) => {
    if (!whatsappNumberId || !workspaceId) {
      toast.error('Selecione uma conexão WhatsApp ativa');
      return;
    }

    setCreating(true);

    try {
      // Check if conversation already exists
      const existingConv = await repository.findByContactAndWhatsapp(contactId, whatsappNumberId);

      if (existingConv) {
        toast.info('Conversa já existe');
        onSuccess?.(existingConv.id);
        return;
      }

      // Format remote_jid from phone number
      const cleanPhone = contactPhone.replace(/\D/g, '');
      const remoteJid = `${cleanPhone}@s.whatsapp.net`;

      // Create new conversation entity with all required props
      const now = new Date();
      const newConversation = Conversation.create({
        id: crypto.randomUUID(),
        contactId,
        whatsappNumberId,
        workspaceId,
        remoteJid,
        isGroup: false,
        pipelineId: null,
        stageId: null,
        lastMessageAt: null,
        unreadCount: 0,
        isTyping: false,
        createdAt: now,
        updatedAt: now,
      });

      // Save to repository
      const savedConversation = await repository.save(newConversation);

      toast.success('Conversa criada!');
      onSuccess?.(savedConversation.id);
    } catch (err: any) {
      console.error('[useCreateConversation] error', err);
      toast.error(err.message || 'Erro ao criar conversa');
    } finally {
      setCreating(false);
    }
  }, [whatsappNumberId, workspaceId, onSuccess, repository]);

  return { createConversation, creating };
}
