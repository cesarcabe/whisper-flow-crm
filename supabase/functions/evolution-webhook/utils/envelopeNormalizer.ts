/**
 * Envelope Normalizer - Normalização de payloads do Evolution API
 * 
 * Extrai e normaliza dados de mensagens recebidas via webhook,
 * tratando corretamente:
 * - DMs com PN e/ou LID
 * - Grupos com participant como autor real
 * - Diferentes estruturas de payload do Evolution API
 */

import { parseJid, isPhoneNumber, type JidInfo } from './jidParser.ts';
import { safeString } from './extract.ts';

export type ConversationType = 'dm' | 'group';

export interface NormalizedEnvelope {
  /** JID da conversa (remoteJid) */
  conversationJid: string;
  /** Tipo da conversa */
  conversationType: ConversationType;
  
  /** JID do remetente real (participant em grupos, remoteJid em DMs) */
  senderJid: string;
  /** Dígitos do telefone do sender (se PN) */
  senderPhone: string | null;
  
  /** JID alternativo (para aliasing PN ↔ LID em DMs) */
  remoteJidAlt: string | null;
  
  /** ID da mensagem no provider */
  providerMessageId: string | null;
  /** Se a mensagem foi enviada pelo usuário */
  fromMe: boolean;
  /** Nome de exibição do sender */
  pushName: string | null;
  /** Timestamp da mensagem (epoch ms) */
  timestamp: number | null;
  
  /** Tipo da mensagem */
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'unknown';
  /** Texto da mensagem */
  text: string;
  /** Se a mensagem tem mídia */
  hasMedia: boolean;
}

/**
 * Normaliza o envelope do Evolution API para estrutura consistente
 */
export function normalizeEvolutionEnvelope(
  data: Record<string, unknown>
): NormalizedEnvelope | null {
  if (!data) return null;
  
  const key = data?.key as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;
  
  // 1) Extrair JIDs
  const remoteJid = safeString(
    key?.remoteJid ?? 
    data?.remoteJid ?? 
    data?.from ?? 
    data?.sender ??
    (message?.key as Record<string, unknown>)?.remoteJid
  );
  
  if (!remoteJid) {
    console.log('[Edge:evolution-webhook] normalizer: missing remoteJid');
    return null;
  }
  
  const remoteJidAlt = safeString(key?.remoteJidAlt);
  const participant = safeString(
    key?.participant ?? 
    data?.participant ??
    (message?.key as Record<string, unknown>)?.participant
  );
  
  // 2) Parsear JIDs
  const mainJidInfo = parseJid(remoteJid);
  if (!mainJidInfo) {
    console.log('[Edge:evolution-webhook] normalizer: failed to parse remoteJid', { remoteJid });
    return null;
  }
  
  const altJidInfo = parseJid(remoteJidAlt);
  const participantInfo = parseJid(participant);
  
  // 3) Determinar tipo de conversa
  const conversationType: ConversationType = mainJidInfo.type === 'group' ? 'group' : 'dm';
  
  // 4) Determinar sender (autor real)
  let senderJid: string;
  let senderPhone: string | null = null;
  
  if (conversationType === 'group') {
    // Em grupos, o sender é o participant
    if (participant) {
      senderJid = participant;
      if (isPhoneNumber(participantInfo)) {
        senderPhone = participantInfo!.digits;
      }
    } else {
      // Fallback: sem participant, usar remoteJid (não ideal, mas evita erro)
      senderJid = remoteJid;
      console.log('[Edge:evolution-webhook] normalizer: group without participant', { remoteJid });
    }
  } else {
    // Em DMs, o sender é o remoteJid
    senderJid = remoteJid;
    
    // Tentar extrair phone: primeiro do main, depois do alt
    if (isPhoneNumber(mainJidInfo)) {
      senderPhone = mainJidInfo.digits;
    } else if (isPhoneNumber(altJidInfo)) {
      senderPhone = altJidInfo!.digits;
    }
  }
  
  // 5) Extrair metadata
  const fromMe = key?.fromMe === true;
  const pushName = fromMe ? null : safeString(
    data?.pushName ?? 
    message?.pushName ??
    (data?.contact as Record<string, unknown>)?.name ??
    (data?.contact as Record<string, unknown>)?.pushname
  );
  
  // 6) Extrair ID da mensagem
  const providerMessageId = safeString(
    key?.id ?? 
    data?.id ?? 
    data?.messageId ??
    (message?.key as Record<string, unknown>)?.id
  );
  
  // 7) Extrair timestamp
  const rawTimestamp = data?.messageTimestamp ?? 
    message?.messageTimestamp ?? 
    data?.timestamp;
  let timestamp: number | null = null;
  if (typeof rawTimestamp === 'number') {
    // Pode ser segundos ou milissegundos
    timestamp = rawTimestamp > 9999999999 ? rawTimestamp : rawTimestamp * 1000;
  }
  
  // 8) Extrair texto
  const extendedText = message?.extendedTextMessage as Record<string, unknown> | undefined;
  const text = safeString(
    message?.conversation ?? 
    message?.text ?? 
    data?.text ?? 
    data?.body ?? 
    extendedText?.text ??
    (message?.imageMessage as Record<string, unknown>)?.caption ??
    (message?.videoMessage as Record<string, unknown>)?.caption ??
    (message?.documentMessage as Record<string, unknown>)?.caption
  ) ?? '';
  
  // 9) Detectar tipo de mídia
  const { messageType, hasMedia } = detectMessageType(message);
  
  return {
    conversationJid: remoteJid,
    conversationType,
    senderJid,
    senderPhone,
    remoteJidAlt,
    providerMessageId,
    fromMe,
    pushName,
    timestamp,
    messageType,
    text,
    hasMedia,
  };
}

/**
 * Detecta tipo de mensagem e se tem mídia
 */
function detectMessageType(
  message: Record<string, unknown> | undefined
): { messageType: NormalizedEnvelope['messageType']; hasMedia: boolean } {
  if (!message) {
    return { messageType: 'text', hasMedia: false };
  }
  
  if (message.imageMessage) {
    return { messageType: 'image', hasMedia: true };
  }
  if (message.videoMessage) {
    return { messageType: 'video', hasMedia: true };
  }
  if (message.audioMessage) {
    return { messageType: 'audio', hasMedia: true };
  }
  if (message.documentMessage || message.documentWithCaptionMessage) {
    return { messageType: 'document', hasMedia: true };
  }
  if (message.stickerMessage) {
    return { messageType: 'sticker', hasMedia: true };
  }
  if (message.conversation || message.extendedTextMessage) {
    return { messageType: 'text', hasMedia: false };
  }
  
  return { messageType: 'unknown', hasMedia: false };
}

/**
 * Normaliza envelope específico para messages.update
 */
export interface StatusUpdateEnvelope {
  providerMessageId: string;
  newStatus: string | null;
  remoteJid: string | null;
}

export function normalizeStatusUpdate(
  data: Record<string, unknown>
): StatusUpdateEnvelope | null {
  const key = data?.key as Record<string, unknown> | undefined;
  const update = data?.update as Record<string, unknown> | undefined;
  
  // ID da mensagem é obrigatório para updates
  const providerMessageId = safeString(
    key?.id ?? 
    data?.id ?? 
    data?.messageId
  );
  
  if (!providerMessageId) {
    return null;
  }
  
  // Extrair novo status
  const newStatus = safeString(
    data?.status ?? 
    data?.ack ?? 
    update?.status ??
    (data?.message as Record<string, unknown>)?.status
  );
  
  // RemoteJid para logging (não usado para busca)
  const remoteJid = safeString(
    key?.remoteJid ?? 
    data?.remoteJid
  );
  
  return {
    providerMessageId,
    newStatus,
    remoteJid,
  };
}
