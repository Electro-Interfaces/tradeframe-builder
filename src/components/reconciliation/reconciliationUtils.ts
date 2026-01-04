/**
 * Утилиты для UI компонентов сверки
 */

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ReconciliationTransactionStatus } from '@/types/reconciliation';

/**
 * Константы
 */
export const ITEMS_PER_PAGE = 20;
export const DISCREPANCY_TOLERANCE = 0.1;
export const DIFF_TOLERANCE = 0.01;

/**
 * Форматирование даты и времени
 */
export function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, 'dd.MM HH:mm', { locale: ru });
  } catch {
    return dateStr;
  }
}

/**
 * Форматирование даты
 */
export function formatDate(dateStr: string): string {
  try {
    if (dateStr === 'Без смены') return dateStr;
    const date = new Date(dateStr);
    return format(date, 'dd.MM.yyyy', { locale: ru });
  } catch {
    return dateStr;
  }
}

/**
 * Получить текст статуса
 */
export function getStatusText(status: ReconciliationTransactionStatus): string {
  switch (status) {
    case 'matched': return 'OK';
    case 'only_corp': return 'Только Corp';
    case 'only_tf': return 'Только TF';
    case 'mismatch': return 'Расхождение';
    default: return status;
  }
}

/**
 * Получить CSS класс для статуса
 */
export function getStatusColorClass(status: ReconciliationTransactionStatus): string {
  switch (status) {
    case 'matched': return 'bg-green-600';
    case 'only_corp': return 'bg-orange-600';
    case 'only_tf': return 'bg-orange-600';
    case 'mismatch': return 'bg-red-600';
    default: return 'bg-slate-600';
  }
}

/**
 * Форматирование разницы литров
 */
export function formatDiff(diff: number): string {
  if (Math.abs(diff) <= DIFF_TOLERANCE) return '—';
  return (diff > 0 ? '+' : '') + diff.toFixed(1);
}

/**
 * Проверка наличия расхождения
 */
export function hasDiff(diff: number): boolean {
  return Math.abs(diff) > DIFF_TOLERANCE;
}

/**
 * Проверка наличия расхождения по топливу
 */
export function hasFuelDiscrepancy(corp: number, tf: number, shift: number): boolean {
  const corpTfDiff = Math.abs((corp ?? 0) - (tf ?? 0));
  const tfShiftDiff = Math.abs((tf ?? 0) - (shift ?? 0));
  return corpTfDiff > DISCREPANCY_TOLERANCE || tfShiftDiff > DISCREPANCY_TOLERANCE;
}

/**
 * Типы для KPI данных по топливу
 */
export interface FuelTotal {
  name: string;
  corp: number;
  tf: number;
  shift: number;
}
