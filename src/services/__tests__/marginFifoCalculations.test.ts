import { describe, it, expect } from 'vitest';
import {
  buildFifoQueue,
  calculateFifoMargin,
  buildMarginChartData,
} from '../marginFifoCalculations';
import type {
  ReceiptResponse,
  ReceiptCostEntry,
  TransactionV2Response,
  FifoLot,
} from '@/types/tanks';

// ── Helpers ──────────────────────────────────────────────────

function makeReceipts(items: Array<{
  tank: number;
  ttn: string;
  dt: string;
  volume: number;
  cost?: number;
  supplier?: string;
}>): ReceiptResponse {
  return {
    system: 1,
    number: 10,
    shifts: [{
      number: 1,
      receipt: items.map(i => ({
        tank: i.tank,
        ttn: i.ttn,
        dt: i.dt,
        doc: { volume: i.volume, amount: i.volume * 0.75, cost: i.cost },
        fact: { volume: i.volume, amount: i.volume * 0.75 },
        base: i.supplier ? { id: 1, name: i.supplier } : undefined,
      })),
    }],
  };
}

function makeCosts(items: Array<{
  ttn: string;
  dt: string;
  costPerLiter: number;
  volume: number;
}>): ReceiptCostEntry[] {
  return items.map(i => ({
    key: `1:10:1:${i.ttn}:${i.dt}`,
    system: 1,
    station: 10,
    tank: 1,
    ttn: i.ttn,
    dt: i.dt,
    costPerLiter: i.costPerLiter,
    costPerKg: i.costPerLiter / 0.75,
    inputUnit: 'liter' as const,
    density: 750,
    factVolumeLiters: i.volume,
    totalCost: i.costPerLiter * i.volume,
    fuelCode: 2,
    updatedAt: new Date().toISOString(),
  }));
}

function makeTransactions(items: Array<{
  dt: string;
  quantity: number;
  price: number;
  fuel: number;
}>): TransactionV2Response {
  return {
    system: 1,
    number: 10,
    items: items.map((i, idx) => ({
      id: idx + 1,
      pos: 1,
      shift: 1,
      number: idx + 1,
      tank: 1,
      nozzle: 1,
      fuel: i.fuel,
      fuel_name: 'АИ-92',
      quantity: i.quantity,
      cost: i.quantity * i.price,
      price: i.price,
      amount: i.quantity * 0.75,
      density: 750,
      pay_type: { id: 1, name: 'Наличные' },
      dt: i.dt,
    })),
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('buildFifoQueue', () => {
  it('создаёт лот для начального остатка', () => {
    const { lots } = buildFifoQueue({
      receipts: null,
      costs: [],
      tankNumber: 1,
      dtBeg: '2026-01-01T00:00:00',
      dtEnd: '2026-01-07T23:59:59',
      initialVolume: 5000,
    });

    expect(lots).toHaveLength(1);
    expect(lots[0].ttn).toBe('__initial__');
    expect(lots[0].remainingVolume).toBe(5000);
    expect(lots[0].costPerLiter).toBe(0); // нет цен
  });

  it('подставляет среднюю цену для начального остатка', () => {
    const costs = makeCosts([
      { ttn: 'TTN-1', dt: '2026-01-02T10:00:00', costPerLiter: 40, volume: 10000 },
      { ttn: 'TTN-2', dt: '2026-01-04T10:00:00', costPerLiter: 42, volume: 8000 },
    ]);

    const { lots } = buildFifoQueue({
      receipts: makeReceipts([
        { tank: 1, ttn: 'TTN-1', dt: '2026-01-02T10:00:00', volume: 10000 },
        { tank: 1, ttn: 'TTN-2', dt: '2026-01-04T10:00:00', volume: 8000 },
      ]),
      costs,
      tankNumber: 1,
      dtBeg: '2026-01-01T00:00:00',
      dtEnd: '2026-01-07T23:59:59',
      initialVolume: 3000,
    });

    expect(lots).toHaveLength(3); // initial + 2 receipts
    expect(lots[0].costPerLiter).toBe(41); // (40+42)/2
  });

  it('добавляет warning для ТТН без цены', () => {
    const { lots, warnings } = buildFifoQueue({
      receipts: makeReceipts([
        { tank: 1, ttn: 'TTN-NO-COST', dt: '2026-01-03T10:00:00', volume: 5000 },
      ]),
      costs: [],
      tankNumber: 1,
      dtBeg: '2026-01-01T00:00:00',
      dtEnd: '2026-01-07T23:59:59',
      initialVolume: 0,
    });

    expect(lots).toHaveLength(1);
    expect(lots[0].costPerLiter).toBe(0);
    expect(warnings.some(w => w.includes('TTN-NO-COST'))).toBe(true);
  });

  it('фильтрует поступления по номеру резервуара', () => {
    const { lots } = buildFifoQueue({
      receipts: makeReceipts([
        { tank: 1, ttn: 'TTN-1', dt: '2026-01-02T10:00:00', volume: 10000 },
        { tank: 2, ttn: 'TTN-2', dt: '2026-01-03T10:00:00', volume: 5000 },
      ]),
      costs: makeCosts([
        { ttn: 'TTN-1', dt: '2026-01-02T10:00:00', costPerLiter: 40, volume: 10000 },
      ]),
      tankNumber: 1,
      dtBeg: '2026-01-01T00:00:00',
      dtEnd: '2026-01-07T23:59:59',
      initialVolume: 0,
    });

    expect(lots).toHaveLength(1);
    expect(lots[0].ttn).toBe('TTN-1');
  });

  it('использует doc.cost из STS API если нет сохранённой цены', () => {
    const { lots, warnings } = buildFifoQueue({
      receipts: makeReceipts([
        { tank: 1, ttn: 'TTN-STS', dt: '2026-01-02T10:00:00', volume: 5000, cost: 200000 },
      ]),
      costs: [],
      tankNumber: 1,
      dtBeg: '2026-01-01T00:00:00',
      dtEnd: '2026-01-07T23:59:59',
      initialVolume: 0,
    });

    expect(lots).toHaveLength(1);
    expect(lots[0].costPerLiter).toBe(40); // 200000 / 5000
    expect(warnings.some(w => w.includes('TTN-STS'))).toBe(false);
  });
});

describe('calculateFifoMargin', () => {
  it('рассчитывает маржу для простого случая', () => {
    const lots: FifoLot[] = [
      { ttn: 'TTN-1', dt: '2026-01-01', remainingVolume: 10000, costPerLiter: 40, originalVolume: 10000 },
    ];

    const transactions = makeTransactions([
      { dt: '2026-01-02T10:00:00', quantity: 50, price: 55, fuel: 2 },
      { dt: '2026-01-02T11:00:00', quantity: 30, price: 55, fuel: 2 },
    ]);

    const result = calculateFifoMargin(lots, transactions, 2, '2026-01-01', '2026-01-07');

    expect(result.totalRevenue).toBeCloseTo(80 * 55);
    expect(result.totalCostOfGoods).toBeCloseTo(80 * 40);
    expect(result.totalProfit).toBeCloseTo(80 * 15);
    expect(result.avgMarginPerLiter).toBeCloseTo(15);
    expect(result.remainingInventoryVolume).toBeCloseTo(9920);
    expect(result.warnings).toHaveLength(0);
  });

  it('списывает из нескольких лотов FIFO', () => {
    const lots: FifoLot[] = [
      { ttn: 'TTN-1', dt: '2026-01-01', remainingVolume: 30, costPerLiter: 38, originalVolume: 30 },
      { ttn: 'TTN-2', dt: '2026-01-03', remainingVolume: 100, costPerLiter: 42, originalVolume: 100 },
    ];

    const transactions = makeTransactions([
      { dt: '2026-01-04T10:00:00', quantity: 50, price: 55, fuel: 2 },
    ]);

    const result = calculateFifoMargin(lots, transactions, 2, '2026-01-01', '2026-01-07');

    // 30л по 38 + 20л по 42 = 1140 + 840 = 1980
    expect(result.totalCostOfGoods).toBeCloseTo(1980);
    expect(result.totalRevenue).toBeCloseTo(2750);
    expect(result.totalProfit).toBeCloseTo(770);
    expect(result.remainingInventoryVolume).toBeCloseTo(80);
  });

  it('обрабатывает случай продажи больше очереди', () => {
    const lots: FifoLot[] = [
      { ttn: 'TTN-1', dt: '2026-01-01', remainingVolume: 20, costPerLiter: 40, originalVolume: 20 },
    ];

    const transactions = makeTransactions([
      { dt: '2026-01-02T10:00:00', quantity: 50, price: 55, fuel: 2 },
    ]);

    const result = calculateFifoMargin(lots, transactions, 2, '2026-01-01', '2026-01-07');

    // 20л по 40 + 30л по 40 (последний лот) = 2000
    expect(result.totalCostOfGoods).toBeCloseTo(2000);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('фильтрует транзакции по fuelCode', () => {
    const lots: FifoLot[] = [
      { ttn: 'TTN-1', dt: '2026-01-01', remainingVolume: 10000, costPerLiter: 40, originalVolume: 10000 },
    ];

    const transactions = makeTransactions([
      { dt: '2026-01-02T10:00:00', quantity: 50, price: 55, fuel: 2 },
      { dt: '2026-01-02T11:00:00', quantity: 30, price: 60, fuel: 3 }, // другое топливо
    ]);

    const result = calculateFifoMargin(lots, transactions, 2, '2026-01-01', '2026-01-07');

    // Только 50л АИ-92
    expect(result.totalRevenue).toBeCloseTo(50 * 55);
    expect(result.totalCostOfGoods).toBeCloseTo(50 * 40);
  });

  it('возвращает пустой результат без транзакций', () => {
    const lots: FifoLot[] = [
      { ttn: 'TTN-1', dt: '2026-01-01', remainingVolume: 10000, costPerLiter: 40, originalVolume: 10000 },
    ];

    const result = calculateFifoMargin(lots, null, 2, '2026-01-01', '2026-01-07');

    expect(result.totalRevenue).toBe(0);
    expect(result.totalCostOfGoods).toBe(0);
    expect(result.sales).toHaveLength(0);
    expect(result.remainingInventoryVolume).toBeCloseTo(10000);
  });
});

describe('buildMarginChartData', () => {
  it('создаёт точки графика с кумулятивной прибылью', () => {
    const sales = [
      {
        time: '10:00 02.01',
        volumeSold: 100,
        costOfGoods: 4000,
        revenue: 5500,
        avgCostPerLiter: 40,
        retailPrice: 55,
        marginPerLiter: 15,
        marginPercent: 27.27,
      },
      {
        time: '11:00 02.01',
        volumeSold: 50,
        costOfGoods: 2100,
        revenue: 2750,
        avgCostPerLiter: 42,
        retailPrice: 55,
        marginPerLiter: 13,
        marginPercent: 23.64,
      },
    ];

    const chart = buildMarginChartData(sales);

    expect(chart).toHaveLength(2);
    expect(chart[0].cumulativeProfit).toBe(1500); // 5500-4000
    expect(chart[1].cumulativeProfit).toBe(2150); // 1500 + (2750-2100)
    expect(chart[0].marginPerLiter).toBe(15);
    expect(chart[1].avgCostPerLiter).toBe(42);
  });
});
