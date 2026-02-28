/**
 * Вспомогательные функции для тепловой карты активности
 */

/**
 * Получить цвет ячейки тепловой карты на основе количества транзакций
 */
export const getHeatmapCellColor = (transactions: number, maxTransactions: number): string => {
  if (transactions === 0) return 'transparent';

  const intensity = maxTransactions > 0 ? transactions / maxTransactions : 0;

  if (intensity <= 0.2) return 'rgba(59, 130, 246, 0.2)';  // Очень светлый синий
  if (intensity <= 0.4) return 'rgba(59, 130, 246, 0.4)';  // Светлый синий
  if (intensity <= 0.6) return 'rgba(59, 130, 246, 0.6)';  // Средний синий
  if (intensity <= 0.8) return 'rgba(59, 130, 246, 0.8)';  // Синий
  return 'rgba(59, 130, 246, 1)';                          // Темный синий
};

/**
 * Получить цвет текста для ячейки тепловой карты
 */
export const getHeatmapTextColor = (transactions: number, maxTransactions: number): string => {
  if (transactions === 0) return 'text-muted-foreground';

  const intensity = maxTransactions > 0 ? transactions / maxTransactions : 0;

  // Белый текст для темных ячеек
  if (intensity > 0.6) return 'text-foreground';

  // Темный текст для светлых ячеек
  return 'text-foreground';
};

/**
 * Форматировать данные для отображения в ячейке тепловой карты
 */
export const formatHeatmapCellValue = (transactions: number): string => {
  if (transactions === 0) return '';
  return String(transactions);
};

/**
 * Получить название дня недели по индексу (0 = воскресенье)
 */
export const getDayOfWeekName = (dayIndex: number): string => {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[dayIndex] || '';
};

/**
 * Форматировать час для отображения в заголовке (0 -> "00:00")
 */
export const formatHourLabel = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};
