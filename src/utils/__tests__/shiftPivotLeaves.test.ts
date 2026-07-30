import { describe, it, expect } from 'vitest';
import { buildShiftPivotLeaves, sumShiftSales, SHIFT_PIVOT_DIM_KEYS } from '../shiftPivotLeaves';
import { buildPivotTree } from '../pivotTree';

// Две смены на разных станциях, как их отдаёт дашборд после адаптера
const SHIFTS = [
  {
    shiftNumber: 3324,
    openedAt: '2026-07-29T23:53:41',
    closedAt: '2026-07-30T07:50:21',
    operator: 'Иванова',
    stationCode: 210,
    salesCross: [
      { paymentTypeName: 'Наличные', fuelName: 'АИ-92', quantity: 354.81, cost: 31891.84, discount: 5.59 },
      { paymentTypeName: 'Наличные', fuelName: 'АИ-95', quantity: 183.84, cost: 17446.4, discount: 0 },
      { paymentTypeName: 'СберБанк', fuelName: 'АИ-92', quantity: 1211.81, cost: 108933.82, discount: 7.89 },
      { paymentTypeName: 'БАЛТОП', fuelName: 'ДТ', quantity: 120, cost: 11268, discount: 0 },
    ],
  },
  {
    shiftNumber: 7061,
    openedAt: '2026-07-30T00:13:13',
    closedAt: null,
    operator: 'Петров',
    stationCode: 208,
    salesCross: [
      { paymentTypeName: 'Наличные', fuelName: 'АИ-92', quantity: 100, cost: 8990, discount: 0 },
      { paymentTypeName: 'СберБанк', fuelName: 'ДТ', quantity: 50, cost: 4695, discount: 0 },
    ],
  },
];

const TOTAL_REVENUE = 31891.84 + 17446.4 + 108933.82 + 11268 + 8990 + 4695;

describe('buildShiftPivotLeaves', () => {
  it('сумма листьев равна сумме продаж по сменам (сходимость с KPI дашборда)', () => {
    const leaves = buildShiftPivotLeaves(SHIFTS, ['station', 'fuel', 'payment']);
    const sum = leaves.reduce((a, l) => a + l.revenue, 0);
    expect(sum).toBeCloseTo(TOTAL_REVENUE, 6);
    expect(sum).toBeCloseTo(sumShiftSales(SHIFTS).revenue, 6);
  });

  it('кросс «станция → топливо → оплата» не схлопывается', () => {
    const leaves = buildShiftPivotLeaves(SHIFTS, ['station', 'fuel', 'payment']);
    // АИ-92 на 210-й продавался и за наличные, и через СберБанк — это два листа
    const ai92_210 = leaves.filter((l) => l.keys[0] === 210 && l.keys[1] === 'АИ-92');
    expect(ai92_210).toHaveLength(2);
    expect(ai92_210.map((l) => l.keys[2]).sort()).toEqual(['Наличные', 'СберБанк']);
  });

  it('агрегирует строки, попавшие в одну ячейку', () => {
    const leaves = buildShiftPivotLeaves(SHIFTS, ['payment']);
    const cash = leaves.find((l) => l.keys[0] === 'Наличные')!;
    // 354.81 + 183.84 (смена 3324) + 100 (смена 7061)
    expect(cash.volume).toBeCloseTo(638.65, 6);
    expect(cash.revenue).toBeCloseTo(31891.84 + 17446.4 + 8990, 6);
  });

  it('день и месяц берутся из даты открытия смены', () => {
    const byDay = buildShiftPivotLeaves(SHIFTS, ['day']);
    expect(byDay.map((l) => l.keys[0]).sort()).toEqual(['2026-07-29', '2026-07-30']);
    const byMonth = buildShiftPivotLeaves(SHIFTS, ['month']);
    expect(byMonth).toHaveLength(1);
    expect(byMonth[0].keys[0]).toBe('2026-07');
  });

  it('смена и оператор доступны как измерения', () => {
    const leaves = buildShiftPivotLeaves(SHIFTS, ['shift', 'operator']);
    expect(leaves.map((l) => l.keys[0]).sort()).toEqual([3324, 7061]);
    expect(leaves.find((l) => l.keys[0] === 7061)!.keys[1]).toBe('Петров');
  });

  it('ops всегда 0 — в сменном отчёте нет счётчика чеков', () => {
    const leaves = buildShiftPivotLeaves(SHIFTS, ['station']);
    expect(leaves.every((l) => l.ops === 0)).toBe(true);
  });

  it('пустой ввод не ломает сборку', () => {
    expect(buildShiftPivotLeaves([], ['station'])).toEqual([]);
    expect(buildShiftPivotLeaves(SHIFTS, [])).toEqual([]);
    expect(buildShiftPivotLeaves([{ shiftNumber: 1 } as any], ['station'])).toEqual([]);
  });

  it('дерево из этих листьев сходится по итогу', () => {
    const dims = ['station', 'fuel', 'payment'];
    const { totals, nodes } = buildPivotTree(buildShiftPivotLeaves(SHIFTS, dims), dims, dims);
    expect(totals.revenue).toBeCloseTo(TOTAL_REVENUE, 6);
    expect(nodes.reduce((a, n) => a + n.revenue, 0)).toBeCloseTo(TOTAL_REVENUE, 6);
  });

  it('все ключи измерений реально поддержаны сборкой', () => {
    for (const key of SHIFT_PIVOT_DIM_KEYS) {
      const leaves = buildShiftPivotLeaves(SHIFTS, [key]);
      expect(leaves.length, `измерение ${key} не даёт листьев`).toBeGreaterThan(0);
    }
  });
});
