import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data para exibição em separadores de mensagens
 * Ex: "Hoje", "Ontem", "5 de Janeiro"
 */
export function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

/**
 * Formata horário/data para lista de conversas
 * Ex: "14:30", "Ontem", "25/12/24"
 */
export function formatMessageTime(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yy');
}

/**
 * Formata apenas horário para bolhas de mensagem
 * Ex: "14:30"
 */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: ptBR });
}

/**
 * Formata data para chave de agrupamento
 * Ex: "2026-01-10"
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
