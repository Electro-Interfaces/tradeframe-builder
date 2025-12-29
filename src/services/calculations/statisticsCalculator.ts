/**
 * Калькулятор статистических метрик
 * Рассчитывает min, max, avg для различных параметров
 */

import type { StatMetrics } from '@/types/tankAnalysis';

/**
 * Рассчитать базовые статистические метрики
 */
export function calculateStatMetrics(
  values: number[],
  unit?: string
): StatMetrics {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      current: 0,
      unit,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const current = values[values.length - 1];

  return {
    min,
    max,
    avg,
    current,
    unit,
  };
}

/**
 * Рассчитать среднее значение
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Рассчитать медиану
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Рассчитать стандартное отклонение
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = average(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = average(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * Группировать данные по дням
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue: (item: T) => number
): Map<string, number> {
  const grouped = new Map<string, number>();

  items.forEach(item => {
    const date = getDate(item).split('T')[0]; // Берем только дату без времени
    const value = getValue(item);
    grouped.set(date, (grouped.get(date) || 0) + value);
  });

  return grouped;
}

/**
 * Группировать данные по часам
 */
export function groupByHour<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue: (item: T) => number
): Map<number, number> {
  const grouped = new Map<number, number>();

  items.forEach(item => {
    const hour = new Date(getDate(item)).getHours();
    const value = getValue(item);
    grouped.set(hour, (grouped.get(hour) || 0) + value);
  });

  return grouped;
}
