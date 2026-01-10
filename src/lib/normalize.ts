/**
 * NOTA: Versão frontend das funções de normalização.
 * Versão edge: supabase/functions/evolution-webhook/utils/normalize.ts
 * Manter ambas sincronizadas se houver mudanças.
 */

/**
 * Normaliza número de telefone removendo caracteres não numéricos
 * Reutiliza lógica do Value Object Phone
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

/**
 * Normaliza status de conexão WhatsApp
 */
export function normalizeConnectionStatus(
  status: string | null | undefined
): 'connected' | 'pairing' | 'disconnected' | 'error' {
  if (!status) return 'disconnected';
  
  const s = status.toLowerCase().trim();
  
  if (['open', 'connected', 'authenticated'].includes(s)) return 'connected';
  if (['connecting', 'qrcode', 'qr', 'waiting', 'pairing'].includes(s)) return 'pairing';
  if (['close', 'closed', 'logout', 'disconnected'].includes(s)) return 'disconnected';
  if (['refused', 'conflict', 'unauthorized', 'error'].includes(s)) return 'error';
  
  return 'disconnected';
}

/**
 * Gera iniciais de um nome para avatares
 */
export function getInitials(name: string, maxChars: number = 2): string {
  if (!name || name.trim().length === 0) return '??';
  
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .substring(0, maxChars)
    .toUpperCase();
}

/**
 * Formata telefone para exibição
 * Ex: "5511999887766" → "(11) 99988-7766"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian format
  if (digits.length === 13 && digits.startsWith('55')) {
    // +55 XX XXXXX-XXXX
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  if (digits.length === 11) {
    // XX XXXXX-XXXX
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  if (digits.length === 10) {
    // XX XXXX-XXXX
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 6);
    const part2 = digits.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  return phone;
}
