/**
 * JID Parser - Parsing e classificação de JIDs do WhatsApp
 * 
 * Tipos de JID:
 * - PN (Phone Number): 558399999999@s.whatsapp.net
 * - LID (Local ID): 123456789@lid
 * - Group: 120363123456789@g.us
 */

export type JidType = 'pn' | 'lid' | 'group' | 'unknown';

export interface JidInfo {
  /** JID original completo */
  raw: string;
  /** Tipo do JID */
  type: JidType;
  /** Dígitos do telefone (apenas para PN) */
  digits: string | null;
  /** Sufixo do JID (@s.whatsapp.net, @lid, @g.us) */
  suffix: string;
}

/**
 * Parseia um JID e retorna informações estruturadas
 */
export function parseJid(jid: string | null | undefined): JidInfo | null {
  if (!jid || typeof jid !== 'string') return null;
  
  const trimmed = jid.trim();
  if (!trimmed) return null;
  
  // Grupo: @g.us
  if (trimmed.endsWith('@g.us')) {
    return { 
      raw: trimmed, 
      type: 'group', 
      digits: null, 
      suffix: '@g.us' 
    };
  }
  
  // Phone Number: @s.whatsapp.net
  if (trimmed.endsWith('@s.whatsapp.net')) {
    const digits = trimmed.replace('@s.whatsapp.net', '');
    // Validar que são realmente dígitos
    const cleanDigits = digits.replace(/\D/g, '');
    return { 
      raw: trimmed, 
      type: 'pn', 
      digits: cleanDigits || null, 
      suffix: '@s.whatsapp.net' 
    };
  }
  
  // LID: @lid (pode ter variações como @lid:123)
  if (trimmed.includes('@lid')) {
    return { 
      raw: trimmed, 
      type: 'lid', 
      digits: null, 
      suffix: '@lid' 
    };
  }
  
  return { 
    raw: trimmed, 
    type: 'unknown', 
    digits: null, 
    suffix: '' 
  };
}

/**
 * Verifica se o JID é um número de telefone válido (PN)
 */
export function isPhoneNumber(jidInfo: JidInfo | null): boolean {
  if (!jidInfo) return false;
  return jidInfo.type === 'pn' && !!jidInfo.digits && jidInfo.digits.length >= 8;
}

/**
 * Verifica se o JID é de um grupo
 */
export function isGroup(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return jid.endsWith('@g.us');
}

/**
 * Verifica se o JID é LID
 */
export function isLid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return jid.includes('@lid');
}

/**
 * Extrai phone digits de um JID PN
 * Retorna null se não for PN ou não tiver dígitos válidos
 */
export function extractPhoneDigits(jid: string | null | undefined): string | null {
  const info = parseJid(jid);
  if (!info || info.type !== 'pn') return null;
  return info.digits;
}

/**
 * Determina o JID canonical entre PN e LID
 * PN tem prioridade sobre LID
 */
export function getCanonicalJid(
  remoteJid: string | null | undefined,
  remoteJidAlt: string | null | undefined
): string | null {
  const mainInfo = parseJid(remoteJid);
  const altInfo = parseJid(remoteJidAlt);
  
  // Se main é PN, é o canonical
  if (mainInfo?.type === 'pn') {
    return mainInfo.raw;
  }
  
  // Se alt é PN, é o canonical
  if (altInfo?.type === 'pn') {
    return altInfo.raw;
  }
  
  // Se main é grupo, é o canonical (grupos não têm alt)
  if (mainInfo?.type === 'group') {
    return mainInfo.raw;
  }
  
  // Fallback: usar main se existir
  return mainInfo?.raw ?? altInfo?.raw ?? null;
}
