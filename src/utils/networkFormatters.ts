/**
 * Утилиты форматирования для страницы обзора сети
 */

/**
 * Форматирование числа с разделителями тысяч
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Форматирование валюты (рубли)
 */
export const formatCurrency = (value: number): string => {
  return `${formatNumber(value)} ₽`;
};

/**
 * Форматирование даты в формат DD.MM.YYYY
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU');
};

/**
 * Форматирование даты и времени в формат DD.MM.YYYY HH:MM
 */
export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Форматирование процента
 */
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Форматирование объема (литры)
 */
export const formatVolume = (value: number): string => {
  return `${formatNumber(value)} л`;
};

/**
 * Получить название дня недели по дате
 */
export const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
};
