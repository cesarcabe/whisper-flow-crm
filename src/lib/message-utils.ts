import { formatDateKey } from './date-utils';

export interface MessageGroup<T> {
  date: string;
  messages: T[];
}

/**
 * Agrupa mensagens por data, ordenando cronologicamente
 * Função pura - sem side effects
 */
export function groupMessagesByDate<T extends { created_at: string }>(
  messages: T[]
): MessageGroup<T>[] {
  // Ordenar cronologicamente (mais antigas primeiro)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const groups: MessageGroup<T>[] = [];
  
  sorted.forEach(message => {
    const dateKey = formatDateKey(new Date(message.created_at));
    const existingGroup = groups.find(g => g.date === dateKey);
    
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date: dateKey, messages: [message] });
    }
  });
  
  return groups;
}

/**
 * Gera preview de mensagem para lista de conversas
 */
export function getMessagePreview(
  body: string,
  type: string,
  maxLength: number = 50
): string {
  if (type !== 'text') {
    const mediaLabels: Record<string, string> = {
      image: '📷 Imagem',
      audio: '🎤 Áudio',
      video: '🎬 Vídeo',
      document: '📄 Documento',
      sticker: '🎨 Sticker',
    };
    return mediaLabels[type] || `[${type.toUpperCase()}]`;
  }
  
  if (body.length <= maxLength) return body;
  return body.slice(0, maxLength) + '...';
}
