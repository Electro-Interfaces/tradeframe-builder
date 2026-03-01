/**
 * Общие утилиты для графиков транзакций.
 * Извлечены из AverageCheckTrend, CashlessShareTrend, WeekdayPattern, PeriodComparison.
 */

export interface ChartTransaction {
  id?: number;
  startTime?: string;
  timestamp?: string;
  createdAt?: string;
  date?: string;
  total?: number;
  actualAmount?: number;
  totalCost?: number;
  volume?: number;
  actualQuantity?: number;
  quantity?: number;
  fuelType?: string;
  paymentMethod?: string;
}

export function getRevenue(tx: ChartTransaction): number {
  return tx.total || tx.actualAmount || tx.totalCost || 0;
}

export function getVolume(tx: ChartTransaction): number {
  return tx.volume || tx.actualQuantity || tx.quantity || 0;
}

export function getTxDate(tx: ChartTransaction): Date | null {
  const raw = tx.startTime || tx.timestamp || tx.createdAt || tx.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
