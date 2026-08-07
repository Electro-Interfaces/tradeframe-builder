import { describe, it, expect } from 'vitest';
import { buildPaymentFuelBreakdown } from '../components/NetworkOverviewExport';

const row = (method: string, fuel: string, operations: number, revenue: number, volume: number) =>
  ({ method, fuel, operations, revenue, volume });

describe('buildPaymentFuelBreakdown', () => {
  it('группирует по способу оплаты и виду топлива', () => {
    const out = buildPaymentFuelBreakdown([
      row('Наличные', 'АИ-95', 10, 5000, 100),
      row('Наличные', 'ДТ', 5, 3000, 50),
      row('Банковская карта', 'АИ-95', 20, 12000, 200),
    ]);

    expect(Object.keys(out).sort()).toEqual(['Банковская карта', 'Наличные']);
    expect(out['Наличные']['АИ-95']).toEqual({ operations: 10, revenue: 5000, volume: 100 });
    expect(out['Банковская карта']['АИ-95'].revenue).toBe(12000);
  });

  it('суммы по способу оплаты сходятся с исходными строками', () => {
    const rows = [
      row('Наличные', 'АИ-92', 3, 1500, 30),
      row('Наличные', 'АИ-95', 7, 4200, 70),
    ];
    const out = buildPaymentFuelBreakdown(rows);

    const cells = Object.values(out['Наличные']);
    expect(cells.reduce((s, c) => s + c.operations, 0)).toBe(10);
    expect(cells.reduce((s, c) => s + c.revenue, 0)).toBe(5700);
    expect(cells.reduce((s, c) => s + c.volume, 0)).toBe(100);
  });

  it('пустые method/fuel схлопывает в «Неизвестно» и накапливает, а не затирает', () => {
    const out = buildPaymentFuelBreakdown([
      row('', '', 1, 100, 10),
      row(null as any, null as any, 2, 200, 20),
    ]);

    expect(out['Неизвестно']['Неизвестно']).toEqual({ operations: 3, revenue: 300, volume: 30 });
  });

  it('на отсутствующем разрезе возвращает пустой объект', () => {
    expect(buildPaymentFuelBreakdown(undefined)).toEqual({});
    expect(buildPaymentFuelBreakdown([])).toEqual({});
  });
});
