/**
 * Telegram-style chat helpers
 * Утилиты для группировки сообщений, цветных имён и разделителей дат
 */

// 8 цветов для имён (Telegram-стиль)
const NAME_COLORS = [
  'text-red-400',
  'text-green-400',
  'text-blue-400',
  'text-yellow-400',
  'text-purple-400',
  'text-pink-400',
  'text-cyan-400',
  'text-orange-400',
] as const;

/** Детерминированный цвет для userId (hash -> 1 из 8 цветов) */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

/** Лейбл даты: "Сегодня", "Вчера", "15 февраля" */
export function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const dayMs = 86400000;

  if (diff === 0) return 'Сегодня';
  if (diff === dayMs) return 'Вчера';

  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}

/** Форматировать время HH:MM */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export interface GroupingInfo {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDate: boolean;
}

/**
 * Группировка сообщений: подряд от одного автора < 60 сек = группа.
 * Возвращает массив GroupingInfo по индексу сообщения
 */
export function computeGrouping<T extends { user_id?: string; created_at: string }>(
  messages: T[],
): GroupingInfo[] {
  const result: GroupingInfo[] = [];
  for (let i = 0; i < messages.length; i++) {
    const curr = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    // Дата
    const currDay = new Date(curr.created_at).toDateString();
    const prevDay = prev ? new Date(prev.created_at).toDateString() : null;
    const showDate = !prev || currDay !== prevDay;

    // Группа: тот же user_id + < 60 сек
    const sameAsPrev = prev
      && prev.user_id === curr.user_id
      && Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000
      && !showDate;

    const sameAsNext = next
      && next.user_id === curr.user_id
      && Math.abs(new Date(next.created_at).getTime() - new Date(curr.created_at).getTime()) < 60000
      && new Date(curr.created_at).toDateString() === new Date(next.created_at).toDateString();

    result.push({
      isFirstInGroup: !sameAsPrev,
      isLastInGroup: !sameAsNext,
      showDate,
    });
  }
  return result;
}

/**
 * Класс бабла в зависимости от позиции в группе и стороны.
 * isOwn -> хвостик справа (rounded-br-sm), !isOwn -> хвостик слева (rounded-bl-sm)
 */
export function bubbleRadius(isOwn: boolean, isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) {
    // Одиночное сообщение — хвостик снизу
    return isOwn ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
  }
  if (isFirst) {
    return 'rounded-2xl'; // Первый в группе — все скруглены
  }
  if (isLast) {
    // Последний — хвостик
    return isOwn ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
  }
  return 'rounded-2xl'; // Внутри группы
}
