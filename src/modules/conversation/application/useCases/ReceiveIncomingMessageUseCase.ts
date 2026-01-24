/**
 * ReceiveIncomingMessageUseCase
 * 
 * Pipeline centralizado para processar mensagens recebidas.
 * Usado tanto pelo WebSocket (fluxo principal) quanto pelo Supabase Webhook (fallback).
 * 
 * Responsabilidades:
 * - Normalização de payload (diferentes fontes têm formatos diferentes)
 * - Deduplicação (evitar processar a mesma mensagem duas vezes)
 * - Persistência (quando necessário)
 * - Emissão de eventos internos
 */

import { Message } from '@/core/domain/entities/Message';
import { MessageMapper } from '@/infra/supabase/mappers/MessageMapper';
import { MessageTypeValue } from '@/core/domain/value-objects/MessageType';

/**
 * DTO para mensagem recebida - formato normalizado
 * Independente da fonte (WebSocket, Webhook, etc.)
 */
export interface IncomingMessageDTO {
  /** ID único da mensagem (pode ser do provider ou gerado) */
  id: string;
  /** ID da conversa */
  conversationId: string;
  /** ID do workspace */
  workspaceId: string;
  /** Conteúdo da mensagem */
  content: string;
  /** Tipo da mensagem */
  type: MessageTypeValue;
  /** Se é mensagem de saída (enviada pelo usuário do CRM) */
  isOutgoing: boolean;
  /** Status da mensagem */
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** ID externo do provider (Evolution, WhatsApp, etc.) */
  externalId?: string | null;
  /** URL da mídia (para imagens, áudios, etc.) */
  mediaUrl?: string | null;
  /** ID da mensagem sendo respondida */
  replyToId?: string | null;
  /** ID do usuário que enviou (para mensagens de saída) */
  sentByUserId?: string | null;
  /** ID do número WhatsApp */
  whatsappNumberId?: string | null;
  /** Data de criação */
  createdAt: string;
  /** Fonte da mensagem (para logging/debug) */
  source: 'websocket' | 'webhook' | 'direct';
}

/**
 * Resultado do processamento
 */
export interface ProcessedMessageResult {
  success: boolean;
  message?: Message;
  deduplicated?: boolean;
  error?: Error;
}

/**
 * Cache de mensagens processadas recentemente para deduplicação
 * Usa message ID e external ID como chaves
 */
const processedMessagesCache = new Map<string, number>();
const CACHE_TTL_MS = 60000; // 1 minuto
const MAX_CACHE_SIZE = 1000;

/**
 * Limpa entradas expiradas do cache
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of processedMessagesCache.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      processedMessagesCache.delete(key);
    }
  }
  // Limita tamanho do cache
  if (processedMessagesCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(processedMessagesCache.keys()).slice(0, processedMessagesCache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach(key => processedMessagesCache.delete(key));
  }
}

/**
 * Verifica se a mensagem já foi processada (deduplicação)
 */
function isDuplicate(dto: IncomingMessageDTO): boolean {
  cleanupCache();
  
  // Verifica por ID da mensagem
  if (processedMessagesCache.has(dto.id)) {
    return true;
  }
  
  // Verifica por external ID se disponível
  if (dto.externalId && processedMessagesCache.has(dto.externalId)) {
    return true;
  }
  
  return false;
}

/**
 * Marca mensagem como processada
 */
function markAsProcessed(dto: IncomingMessageDTO): void {
  const now = Date.now();
  processedMessagesCache.set(dto.id, now);
  if (dto.externalId) {
    processedMessagesCache.set(dto.externalId, now);
  }
}

/**
 * Use case para receber e processar mensagens
 */
export class ReceiveIncomingMessageUseCase {
  /**
   * Processa uma mensagem recebida
   * 
   * @param dto - Dados da mensagem normalizada
   * @returns Resultado do processamento
   */
  async execute(dto: IncomingMessageDTO): Promise<ProcessedMessageResult> {
    try {
      // 1. Verificar deduplicação
      if (isDuplicate(dto)) {
        console.log(`[ReceiveIncomingMessage] Deduplicated message: ${dto.id} from ${dto.source}`);
        return {
          success: true,
          deduplicated: true,
        };
      }

      // 2. Normalizar e criar entidade de domínio
      const message = this.normalizeToMessage(dto);

      // 3. Marcar como processada (antes de qualquer side effect)
      markAsProcessed(dto);

      // 4. Log para debugging
      console.log(`[ReceiveIncomingMessage] Processed message: ${dto.id} from ${dto.source}`, {
        type: dto.type,
        isOutgoing: dto.isOutgoing,
        conversationId: dto.conversationId,
      });

      return {
        success: true,
        message,
        deduplicated: false,
      };
    } catch (error) {
      console.error('[ReceiveIncomingMessage] Error processing message:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Normaliza o DTO para uma entidade Message do domínio
   */
  private normalizeToMessage(dto: IncomingMessageDTO): Message {
    return MessageMapper.toDomain({
      id: dto.id,
      conversation_id: dto.conversationId,
      workspace_id: dto.workspaceId,
      body: dto.content,
      type: dto.type,
      is_outgoing: dto.isOutgoing,
      status: dto.status,
      external_id: dto.externalId ?? null,
      media_url: dto.mediaUrl ?? null,
      reply_to_id: dto.replyToId ?? null,
      quoted_message: null,
      sent_by_user_id: dto.sentByUserId ?? null,
      whatsapp_number_id: dto.whatsappNumberId ?? null,
      error_message: null,
      created_at: dto.createdAt,
    });
  }

  /**
   * Limpa o cache de deduplicação (útil para testes)
   */
  static clearCache(): void {
    processedMessagesCache.clear();
  }
}
