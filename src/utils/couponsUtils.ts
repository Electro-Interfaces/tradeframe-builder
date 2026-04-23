/**
 * Coupons Utilities - Утилиты для работы с купонами
 * Форматирование, валидация, константы
 */

import { CouponState, CouponPriority } from '@/types/coupons';

// Константы для купонов
export const COUPON_CONSTANTS = {
  // Пороги возраста купонов (дни)
  OLD_COUPON_THRESHOLD: 7,
  CRITICAL_COUPON_THRESHOLD: 30,

  // Пороги сумм
  LARGE_AMOUNT_THRESHOLD: 1000,
  MEDIUM_AMOUNT_THRESHOLD: 500,

  // Форматы дат
  DATE_FORMAT: 'yyyy-MM-dd',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'dd.MM.yyyy',
  DISPLAY_DATETIME_FORMAT: 'dd.MM.yyyy HH:mm',

  // Цвета для статусов
  COLORS: {
    active: '#10b981',      // green-500
    redeemed: '#6b7280',    // gray-500
    normal: '#3b82f6',      // blue-500
    attention: '#f59e0b',   // amber-500
    critical: '#ef4444',    // red-500
  },

  // Иконки для статусов
  ICONS: {
    active: '🟢',
    redeemed: '⚪',
    normal: '🔵',
    attention: '🟡',
    critical: '🔴',
  }
} as const;

/**
 * Форматирование суммы в российской валюте
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Форматирование суммы без символа валюты
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Форматирование числа с разделителями тысяч
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

/**
 * Форматирование даты в удобочитаемом формате
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Форматирование даты и времени
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Форматирование относительного времени (например, "3 дня назад")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes} мин. назад`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ч. назад`;
    } else if (diffInDays < 30) {
      return `${diffInDays} дн. назад`;
    } else {
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths} мес. назад`;
    }
  } catch {
    return dateString;
  }
}

/**
 * Вычисление возраста купона в днях
 */
export function calculateCouponAge(dateString: string): number {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Получение цвета по статусу купона
 */
export function getCouponStateColor(state: CouponState): string {
  switch (state) {
    case 'Активен':
      return COUPON_CONSTANTS.COLORS.active;
    case 'Погашен':
      return COUPON_CONSTANTS.COLORS.redeemed;
    default:
      return COUPON_CONSTANTS.COLORS.normal;
  }
}

/**
 * Получение цвета по приоритету купона
 */
export function getCouponPriorityColor(priority: CouponPriority): string {
  switch (priority) {
    case 'normal':
      return COUPON_CONSTANTS.COLORS.normal;
    case 'attention':
      return COUPON_CONSTANTS.COLORS.attention;
    case 'critical':
      return COUPON_CONSTANTS.COLORS.critical;
    default:
      return COUPON_CONSTANTS.COLORS.normal;
  }
}

/**
 * Получение иконки для статуса купона
 */
export function getCouponStateIcon(state: CouponState): string {
  switch (state) {
    case 'Активен':
      return COUPON_CONSTANTS.ICONS.active;
    case 'Погашен':
      return COUPON_CONSTANTS.ICONS.redeemed;
    default:
      return COUPON_CONSTANTS.ICONS.normal;
  }
}

/**
 * Получение иконки для приоритета купона
 */
export function getCouponPriorityIcon(priority: CouponPriority): string {
  switch (priority) {
    case 'normal':
      return COUPON_CONSTANTS.ICONS.normal;
    case 'attention':
      return COUPON_CONSTANTS.ICONS.attention;
    case 'critical':
      return COUPON_CONSTANTS.ICONS.critical;
    default:
      return COUPON_CONSTANTS.ICONS.normal;
  }
}

/**
 * Получение описания статуса купона
 */
export function getCouponStateDescription(state: CouponState): string {
  switch (state) {
    case 'Активен':
      return 'Купон активен, остаток можно использовать';
    case 'Погашен':
      return 'Купон полностью погашен';
    default:
      return 'Неизвестный статус';
  }
}

/**
 * Получение описания приоритета купона
 */
export function getCouponPriorityDescription(priority: CouponPriority): string {
  switch (priority) {
    case 'normal':
      return 'Обычный купон, внимания не требует';
    case 'attention':
      return 'Требует внимания (старый или крупная сумма)';
    case 'critical':
      return 'Критический купон (очень старый или очень крупная сумма)';
    default:
      return 'Неизвестный приоритет';
  }
}

/**
 * Валидация номера купона
 */
export function validateCouponNumber(number: string): boolean {
  // Простая валидация: не пустой и содержит только цифры и буквы
  return /^[a-zA-Z0-9]+$/.test(number.trim());
}

/**
 * Валидация суммы
 */
export function validateAmount(amount: number): boolean {
  return amount >= 0 && amount <= 999999; // Макс. 999,999 рублей
}

/**
 * Нормализация номера купона (убираем пробелы, приводим к верхнему регистру)
 */
export function normalizeCouponNumber(number: string): string {
  return number.trim().toUpperCase();
}

/**
 * Генерация диапазона дат (для фильтров)
 */
export function generateDateRange(type: 'today' | 'week' | 'month' | 'year'): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let from: Date;

  switch (type) {
    case 'today':
      from = today;
      break;
    case 'week':
      from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      from = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = today;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0]
  };
}

/**
 * Преобразование процента в строку с символом процента
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Получение CSS классов для состояния купона
 */
export function getCouponStateClasses(state: CouponState): string {
  switch (state) {
    case 'Активен':
      return 'bg-emerald-100 text-green-800 border-green-200';
    case 'Погашен':
      return 'bg-muted text-foreground border-border';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
}

/**
 * Получение CSS классов для приоритета купона
 */
export function getCouponPriorityClasses(priority: CouponPriority): string {
  switch (priority) {
    case 'normal':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'attention':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-muted text-foreground border-border';
  }
}

/**
 * Дебаунс функция для поиска
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
}

/**
 * Экспорт данных в CSV формат
 */
export function downloadCsv(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Создание краткого описания купона для списков
 */
export function getCouponSummary(coupon: {
  number: string;
  rest: number;
  state: CouponState;
  dt_beg: string;
}): string {
  const age = calculateCouponAge(coupon.dt_beg);
  return `${coupon.number} • ${formatCurrency(coupon.rest)} • ${age} дн. • ${coupon.state}`;
}