import { describe, it, expect } from 'vitest';
import { filterInventory, sortInventory, calculateTotals } from '../fuelInventoryHelpers';
import type { TankInventory } from '@/services/fuelInventoryService';

const makeTank = (overrides: Partial<TankInventory>): TankInventory => ({
  station: 209,
  stationName: 'АКАЗС №209',
  tankNumber: 2,
  fuelCode: 3,
  fuelName: 'АИ-95',
  volumeBook: 17837.55,
  volumeBegin: 5350.60,
  volumeReceipts: 12996,
  volumeSales: 509.05,
  receiptCount: 1,
  shiftCount: 13,
  capacity: 0, // специально 0 — имитируем АЗС 209/210 где /v1/tank_history ничего не возвращает
  freeVolume: 0,
  fillPercent: 0,
  lastUpdate: '2026-04-14T07:32:20',
  initialShift: { number: 3838, date: '2026-04-09T00:00:00' },
  ...overrides,
});

describe('filterInventory', () => {
  it('НЕ отбрасывает резервуары с capacity=0 (фикс для АЗС 209/210)', () => {
    const inv = [makeTank({ capacity: 0 })];
    const filtered = filterInventory(inv, 'all', 'all');
    expect(filtered).toHaveLength(1);
  });

  it('отбрасывает резервуары с отрицательным volumeBook', () => {
    const inv = [
      makeTank({ volumeBook: 100 }),
      makeTank({ volumeBook: -5 }),
    ];
    const filtered = filterInventory(inv, 'all', 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].volumeBook).toBe(100);
  });

  it('фильтр по виду топлива (selectedFuel)', () => {
    const inv = [
      makeTank({ fuelCode: 2 }), // АИ-92
      makeTank({ fuelCode: 3 }), // АИ-95
      makeTank({ fuelCode: 5 }), // ДТ
    ];
    const ai92 = filterInventory(inv, '2', 'all');
    expect(ai92).toHaveLength(1);
    expect(ai92[0].fuelCode).toBe(2);
  });

  it('фильтр по ТТ (selectedStation)', () => {
    const inv = [
      makeTank({ station: 209 }),
      makeTank({ station: 210 }),
    ];
    const only209 = filterInventory(inv, 'all', '209');
    expect(only209).toHaveLength(1);
    expect(only209[0].station).toBe(209);
  });

  it('«all» пропускает все', () => {
    const inv = [makeTank({}), makeTank({ fuelCode: 5, station: 210 })];
    expect(filterInventory(inv, 'all', 'all')).toHaveLength(2);
  });
});

describe('sortInventory', () => {
  const inv = [
    makeTank({ station: 210, fuelName: 'ДТ', volumeBook: 1000 }),
    makeTank({ station: 209, fuelName: 'АИ-92', volumeBook: 5000 }),
    makeTank({ station: 207, fuelName: 'АИ-95', volumeBook: 3000 }),
  ];

  it('сортирует по станции asc', () => {
    const sorted = sortInventory(inv, 'station', 'asc');
    expect(sorted.map(t => t.station)).toEqual([207, 209, 210]);
  });

  it('сортирует по volumeBook desc', () => {
    const sorted = sortInventory(inv, 'volumeBook', 'desc');
    expect(sorted.map(t => t.volumeBook)).toEqual([5000, 3000, 1000]);
  });
});

describe('calculateTotals', () => {
  it('возвращает null для пустого массива', () => {
    expect(calculateTotals([])).toBeNull();
  });

  it('суммирует объёмы и сохраняет общую ёмкость (даже если capacity=0)', () => {
    const inv = [
      makeTank({ volumeBook: 100, volumeReceipts: 50, volumeSales: 30, capacity: 0 }),
      makeTank({ volumeBook: 200, volumeReceipts: 80, volumeSales: 40, capacity: 10000 }),
    ];
    const totals = calculateTotals(inv)!;
    expect(totals.volumeBook).toBe(300);
    expect(totals.volumeReceipts).toBe(130);
    expect(totals.volumeSales).toBe(70);
    expect(totals.capacity).toBe(10000); // 0 + 10000
    expect(totals.tankCount).toBe(2);
  });
});
