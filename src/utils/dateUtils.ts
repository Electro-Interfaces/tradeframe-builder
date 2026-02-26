/**
 * Утилиты для работы с датами в локальном часовом поясе.
 *
 * ВАЖНО: new Date().toISOString().split('T')[0] возвращает дату в UTC,
 * что может давать вчерашнюю дату в часовых поясах UTC+N (напр. Москва UTC+3).
 * Используйте toLocalDateString() для корректной даты.
 */

/**
 * Возвращает дату в формате YYYY-MM-DD в локальном часовом поясе
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Возвращает сегодняшнюю дату в формате YYYY-MM-DD (локальный часовой пояс)
 */
export function todayString(): string {
  return toLocalDateString(new Date());
}

/**
 * Возвращает дату N дней назад в формате YYYY-MM-DD (локальный часовой пояс)
 */
export function daysAgoString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDateString(date);
}

/**
 * Возвращает дату N месяцев назад в формате YYYY-MM-DD (локальный часовой пояс)
 */
export function monthsAgoString(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return toLocalDateString(date);
}
