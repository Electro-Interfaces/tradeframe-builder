/**
 * Калькулятор отклонений книжных и фактических остатков
 * Реализует логику расчета погрешностей для вкладки "Погрешность"
 */

import type {
  DeviationPoint,
  DeviationStatus,
  VolumeBalance,
} from '@/types/tankAnalysis';
import type {
  TankHistoryRecord,
  TransactionItem,
  ReceiptItem,
} from '@/types/tanks';
import { toNumber } from '../tankAnalysisService';

/**
 * Рассчитать книжный остаток для каждой точки истории
 */
export function calculateVolumeBalance(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  receipts: ReceiptItem[]
): VolumeBalance[] {
  if (history.length === 0) return [];

  // Сортируем историю по времени
  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.dt).getTime() - new Date(b.dt).getTime()
  );

  // Начальный остаток - берем из первой записи истории
  let volumeBook = toNumber(sortedHistory[0].volume_begin);

  return sortedHistory.map((record) => {
    const timestamp = record.dt;
    const volumeFact = toNumber(record.volume);

    // Находим поступления до этого момента времени
    const receiptsUpTo = receipts.filter(
      r => new Date(r.dt) <= new Date(timestamp)
    );
    const totalReceipts = receiptsUpTo.reduce(
      (sum, r) => sum + toNumber(r.fact.volume),
      0
    );

    // Находим продажи до этого момента времени
    const salesUpTo = transactions.filter(
      t => t.dt && new Date(t.dt) <= new Date(timestamp)
    );
    const totalSales = salesUpTo.reduce(
      (sum, t) => sum + toNumber(t.quantity),
      0
    );

    // Книжный остаток = Начальный + Поступления - Продажи
    volumeBook = toNumber(sortedHistory[0].volume_begin) + totalReceipts - totalSales;

    // Отклонение
    const deviation = volumeBook - volumeFact;
    const capacity = toNumber(record.volume_max);
    const freeSpace = capacity - volumeFact;

    return {
      timestamp,
      volumeBegin: toNumber(sortedHistory[0].volume_begin),
      receipts: totalReceipts,
      sales: totalSales,
      volumeBook,
      volumeFact,
      deviation,
      freeSpace,
    };
  });
}

/**
 * Рассчитать отклонения с статусами
 */
export function calculateDeviations(
  volumeBalance: VolumeBalance[],
  thresholds: {
    warningPercent: number;
    criticalPercent: number;
  }
): DeviationPoint[] {
  return volumeBalance.map(balance => {
    const deviationLiters = balance.volumeBook - balance.volumeFact;
    const deviationPercent = balance.volumeFact > 0
      ? Math.abs((deviationLiters / balance.volumeFact) * 100)
      : 0;

    const status = getDeviationStatus(deviationPercent, thresholds);

    return {
      timestamp: balance.timestamp,
      volumeBook: balance.volumeBook,
      volumeFact: balance.volumeFact,
      deviationLiters,
      deviationPercent,
      status,
    };
  });
}

/**
 * Определить статус отклонения
 */
export function getDeviationStatus(
  deviationPercent: number,
  thresholds: { warningPercent: number; criticalPercent: number }
): DeviationStatus {
  if (deviationPercent >= thresholds.criticalPercent) {
    return 'critical';
  } else if (deviationPercent >= thresholds.warningPercent) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Получить цвет для статуса отклонения
 */
export function getDeviationColor(status: DeviationStatus): string {
  switch (status) {
    case 'normal':
      return '#10b981'; // green-500
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'critical':
      return '#ef4444'; // red-500
  }
}
