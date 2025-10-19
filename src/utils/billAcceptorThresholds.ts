/**
 * Утилиты для работы с пороговыми значениями купюроприемника
 */

import type { BillAcceptorThresholds } from '@/types/tradingpoint';

export type ThresholdLevel = 'normal' | 'warning' | 'critical';

export interface ThresholdStatus {
  level: ThresholdLevel;
  message?: string;
  billCountExceeded: boolean;
  cashAmountExceeded: boolean;
}

/**
 * Проверяет текущие значения купюроприемника против пороговых
 */
export function checkBillAcceptorThresholds(
  billCount: number,
  cashAmount: number,
  thresholds?: BillAcceptorThresholds
): ThresholdStatus {
  // Если пороги не заданы, возвращаем нормальный статус
  if (!thresholds) {
    return {
      level: 'normal',
      billCountExceeded: false,
      cashAmountExceeded: false,
    };
  }

  let level: ThresholdLevel = 'normal';
  const messages: string[] = [];
  let billCountExceeded = false;
  let cashAmountExceeded = false;

  // Проверка критических порогов (приоритет выше)
  if (
    (thresholds.billCountCritical !== undefined && billCount >= thresholds.billCountCritical) ||
    (thresholds.cashAmountCritical !== undefined && cashAmount >= thresholds.cashAmountCritical)
  ) {
    level = 'critical';

    if (thresholds.billCountCritical !== undefined && billCount >= thresholds.billCountCritical) {
      billCountExceeded = true;
      messages.push(
        `Критический уровень: ${billCount} купюр (порог: ${thresholds.billCountCritical})`
      );
    }

    if (thresholds.cashAmountCritical !== undefined && cashAmount >= thresholds.cashAmountCritical) {
      cashAmountExceeded = true;
      messages.push(
        `Критический уровень: ${cashAmount.toLocaleString()} ₽ (порог: ${thresholds.cashAmountCritical.toLocaleString()} ₽)`
      );
    }
  }
  // Проверка предупреждающих порогов
  else if (
    (thresholds.billCountWarning !== undefined && billCount >= thresholds.billCountWarning) ||
    (thresholds.cashAmountWarning !== undefined && cashAmount >= thresholds.cashAmountWarning)
  ) {
    level = 'warning';

    if (thresholds.billCountWarning !== undefined && billCount >= thresholds.billCountWarning) {
      billCountExceeded = true;
      messages.push(
        `Предупреждение: ${billCount} купюр (порог: ${thresholds.billCountWarning})`
      );
    }

    if (thresholds.cashAmountWarning !== undefined && cashAmount >= thresholds.cashAmountWarning) {
      cashAmountExceeded = true;
      messages.push(
        `Предупреждение: ${cashAmount.toLocaleString()} ₽ (порог: ${thresholds.cashAmountWarning.toLocaleString()} ₽)`
      );
    }
  }

  return {
    level,
    message: messages.length > 0 ? messages.join('. ') : undefined,
    billCountExceeded,
    cashAmountExceeded,
  };
}

/**
 * Получить цвет для уровня порога
 */
export function getThresholdColor(level: ThresholdLevel): string {
  switch (level) {
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-green-400';
  }
}

/**
 * Получить цвет фона для уровня порога
 */
export function getThresholdBgColor(level: ThresholdLevel): string {
  switch (level) {
    case 'warning':
      return 'bg-yellow-500/20';
    case 'critical':
      return 'bg-red-500/20';
    default:
      return 'bg-slate-700';
  }
}

/**
 * Получить класс границы для уровня порога
 */
export function getThresholdBorderColor(level: ThresholdLevel): string {
  switch (level) {
    case 'warning':
      return 'border-yellow-500';
    case 'critical':
      return 'border-red-500';
    default:
      return 'border-slate-600';
  }
}
