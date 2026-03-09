/**
 * FIFO-алгоритм расчёта маржи топлива
 *
 * 1. Строим очередь лотов из поступлений (с закупочными ценами)
 * 2. Списываем себестоимость при продажах в порядке FIFO
 * 3. Сравниваем с розничной ценой → маржа
 */

import type {
  ReceiptItem,
  ReceiptResponse,
  ReceiptCostEntry,
  TransactionItem,
  TransactionV2Response,
  FifoLot,
  FifoSaleResult,
  FifoSummary,
  MarginChartPoint,
} from '@/types/tanks';

// ── Вспомогательные функции ──────────────────────────────────

function toNum(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function isInPeriod(dt: string, dtBeg: string, dtEnd: string): boolean {
  return dt >= dtBeg && dt <= dtEnd;
}

/** Округление по часу для агрегации: "2026-01-15T14:30:00" → "14:00 15.01" */
function hourKey(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  const hh = String(d.getHours()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:00 ${dd}.${mm}`;
}

/** Группировка по дням: "15.01" */
function dayKey(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

// ── Построение FIFO-очереди ──────────────────────────────────

interface BuildFifoQueueParams {
  receipts: ReceiptResponse | null;
  costs: ReceiptCostEntry[];
  tankNumber: number;
  dtBeg: string;
  dtEnd: string;
  initialVolume: number;
}

export function buildFifoQueue(params: BuildFifoQueueParams): {
  lots: FifoLot[];
  warnings: string[];
} {
  const { receipts, costs, tankNumber, dtBeg, dtEnd, initialVolume } = params;
  const warnings: string[] = [];
  const lots: FifoLot[] = [];

  // Индекс цен по ключу
  const costIndex = new Map<string, ReceiptCostEntry>();
  for (const c of costs) {
    costIndex.set(c.key, c);
  }

  // Начальный остаток → первый лот
  if (initialVolume > 0) {
    // Средняя цена из всех имеющихся цен (или 0)
    const knownCosts = costs.filter(c => c.costPerLiter > 0);
    const avgCost =
      knownCosts.length > 0
        ? knownCosts.reduce((s, c) => s + c.costPerLiter, 0) / knownCosts.length
        : 0;

    if (avgCost === 0) {
      warnings.push('Начальный остаток оценён по нулевой цене — введите цены поставок');
    }

    lots.push({
      ttn: '__initial__',
      dt: dtBeg,
      remainingVolume: initialVolume,
      costPerLiter: avgCost,
      originalVolume: initialVolume,
    });
  }

  // Собираем поступления в этот резервуар за период
  const receiptItems: ReceiptItem[] = [];
  if (receipts?.shifts) {
    for (const shift of receipts.shifts) {
      for (const r of shift.receipt) {
        if (r.tank === tankNumber && isInPeriod(r.dt, dtBeg, dtEnd)) {
          receiptItems.push(r);
        }
      }
    }
  }

  // Сортируем по дате
  receiptItems.sort((a, b) => a.dt.localeCompare(b.dt));

  for (const r of receiptItems) {
    const volume = toNum(r.fact.volume) || toNum(r.doc.volume);
    if (volume <= 0) continue;

    // Ищем цену: сначала в localStorage, потом в STS (doc.cost / fact.cost)
    const costKey = `${receipts!.system}:${receipts!.number}:${tankNumber}:${r.ttn}:${r.dt}`;
    const savedCost = costIndex.get(costKey);

    let costPerLiter = 0;

    if (savedCost && savedCost.costPerLiter > 0) {
      costPerLiter = savedCost.costPerLiter;
    } else {
      // Попробовать из STS API
      const stsCost = toNum(r.fact.cost) || toNum(r.doc.cost);
      if (stsCost > 0) {
        costPerLiter = stsCost / volume;
      } else {
        warnings.push(`ТТН ${r.ttn} (${r.dt.slice(0, 10)}) — нет закупочной цены`);
      }
    }

    lots.push({
      ttn: r.ttn,
      dt: r.dt,
      remainingVolume: volume,
      costPerLiter,
      originalVolume: volume,
    });
  }

  return { lots, warnings };
}

// ── Расчёт маржи FIFO ───────────────────────────────────────

interface HourlySales {
  time: string;
  sortKey: string;
  totalVolume: number;
  totalRevenue: number;
  weightedPrice: number;
}

function aggregateTransactionsByPeriod(
  transactions: TransactionV2Response | null,
  fuelCode: number,
  dtBeg: string,
  dtEnd: string,
  useDayAggregation: boolean
): HourlySales[] {
  if (!transactions?.items?.length) return [];

  const agg = new Map<string, { volume: number; revenue: number; sortKey: string }>();

  for (const tx of transactions.items) {
    if (fuelCode > 0 && tx.fuel !== fuelCode) continue;
    if (tx.dt && !isInPeriod(tx.dt, dtBeg, dtEnd)) continue;

    const volume = toNum(tx.quantity);
    const price = toNum(tx.price);
    if (volume <= 0 || price <= 0) continue;

    const key = useDayAggregation ? dayKey(tx.dt || dtBeg) : hourKey(tx.dt || dtBeg);
    const sortK = tx.dt || dtBeg;

    const existing = agg.get(key);
    if (existing) {
      existing.volume += volume;
      existing.revenue += volume * price;
      if (sortK < existing.sortKey) existing.sortKey = sortK;
    } else {
      agg.set(key, { volume, revenue: volume * price, sortKey: sortK });
    }
  }

  const result: HourlySales[] = [];
  for (const [time, data] of agg) {
    result.push({
      time,
      sortKey: data.sortKey,
      totalVolume: data.volume,
      totalRevenue: data.revenue,
      weightedPrice: data.volume > 0 ? data.revenue / data.volume : 0,
    });
  }

  result.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return result;
}

export function calculateFifoMargin(
  lots: FifoLot[],
  transactions: TransactionV2Response | null,
  fuelCode: number,
  dtBeg: string,
  dtEnd: string
): FifoSummary {
  const warnings: string[] = [];

  // Определяем агрегацию: >3 дней → по дням, иначе по часам
  const begDate = new Date(dtBeg);
  const endDate = new Date(dtEnd);
  const daysDiff = (endDate.getTime() - begDate.getTime()) / (1000 * 60 * 60 * 24);
  const useDayAggregation = daysDiff > 3;

  const hourlySales = aggregateTransactionsByPeriod(
    transactions,
    fuelCode,
    dtBeg,
    dtEnd,
    useDayAggregation
  );

  // Копируем лоты чтобы не мутировать оригинал
  const queue = lots.map(l => ({ ...l }));
  let queueIdx = 0;

  const sales: FifoSaleResult[] = [];
  let totalRevenue = 0;
  let totalCostOfGoods = 0;

  for (const hour of hourlySales) {
    let volumeToSell = hour.totalVolume;
    let costForPeriod = 0;

    while (volumeToSell > 0 && queueIdx < queue.length) {
      const lot = queue[queueIdx];
      const take = Math.min(volumeToSell, lot.remainingVolume);
      costForPeriod += take * lot.costPerLiter;
      lot.remainingVolume -= take;
      volumeToSell -= take;

      if (lot.remainingVolume <= 0.001) {
        queueIdx++;
      }
    }

    // Если продажи превышают очередь — списываем по цене последнего лота
    if (volumeToSell > 0.001) {
      const lastCost =
        queue.length > 0 ? queue[queue.length - 1].costPerLiter : 0;
      costForPeriod += volumeToSell * lastCost;
      if (volumeToSell > 1) {
        warnings.push(
          `${hour.time}: продажи превысили FIFO-очередь на ${volumeToSell.toFixed(0)} л`
        );
      }
    }

    const volumeSold = hour.totalVolume;
    const revenue = hour.totalRevenue;
    const avgCost = volumeSold > 0 ? costForPeriod / volumeSold : 0;
    const margin = hour.weightedPrice - avgCost;
    const marginPct = hour.weightedPrice > 0 ? (margin / hour.weightedPrice) * 100 : 0;

    totalRevenue += revenue;
    totalCostOfGoods += costForPeriod;

    sales.push({
      time: hour.time,
      volumeSold,
      costOfGoods: costForPeriod,
      revenue,
      avgCostPerLiter: avgCost,
      retailPrice: hour.weightedPrice,
      marginPerLiter: margin,
      marginPercent: marginPct,
    });
  }

  // Остаток в FIFO-очереди
  let remainingInventoryValue = 0;
  let remainingInventoryVolume = 0;
  for (let i = queueIdx; i < queue.length; i++) {
    remainingInventoryValue += queue[i].remainingVolume * queue[i].costPerLiter;
    remainingInventoryVolume += queue[i].remainingVolume;
  }

  const totalProfit = totalRevenue - totalCostOfGoods;
  const totalVolumeSold = sales.reduce((s, r) => s + r.volumeSold, 0);
  const avgMarginPerLiter = totalVolumeSold > 0 ? totalProfit / totalVolumeSold : 0;
  const avgMarginPercent =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCostOfGoods,
    totalProfit,
    avgMarginPerLiter,
    avgMarginPercent,
    remainingInventoryValue,
    remainingInventoryVolume,
    sales,
    warnings,
  };
}

// ── Данные для графика ───────────────────────────────────────

export function buildMarginChartData(sales: FifoSaleResult[]): MarginChartPoint[] {
  let cumulativeProfit = 0;

  return sales.map(s => {
    cumulativeProfit += s.revenue - s.costOfGoods;
    return {
      time: s.time,
      marginPerLiter: parseFloat(s.marginPerLiter.toFixed(2)),
      avgCostPerLiter: parseFloat(s.avgCostPerLiter.toFixed(2)),
      retailPrice: parseFloat(s.retailPrice.toFixed(2)),
      cumulativeProfit: parseFloat(cumulativeProfit.toFixed(0)),
      marginPercent: parseFloat(s.marginPercent.toFixed(1)),
    };
  });
}
