import { describe, it, expect } from 'vitest';
import { buildHeatmapGrid } from '../hooks/useNetworkOverviewAnalytics';

// Дата дня в том виде, в каком её отдаёт сервер (полночь дня в UTC).
const day = (iso: string) => `${iso}T00:00:00.000Z`;

describe('buildHeatmapGrid', () => {
  it('строит строку на каждый день выбранного периода', () => {
    const grid = buildHeatmapGrid(
      [{ date: day('2026-07-02'), hour: 10, operations: 5, revenue: 3000 }],
      '2026-07-01',
      '2026-07-05'
    );

    expect(grid).toHaveLength(5);
    expect(grid.map((d: any) => d.date)).toEqual([
      '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05',
    ]);
    expect(grid[0].hours).toHaveLength(24);
  });

  it('раскладывает операции в свой день и час, остальные остаются нулевыми', () => {
    const grid = buildHeatmapGrid(
      [{ date: day('2026-07-02'), hour: 10, operations: 5, revenue: 3000 }],
      '2026-07-01',
      '2026-07-03'
    );

    expect(grid[1].hours[10]).toMatchObject({ transactions: 5, revenue: 3000 });
    expect(grid[0].hours.every((h: any) => h.transactions === 0)).toBe(true);
    expect(grid[1].hours[9].transactions).toBe(0);
  });

  it('берёт период, а не последние 7 дней от сегодня', () => {
    const grid = buildHeatmapGrid(
      [{ date: day('2026-01-15'), hour: 8, operations: 2, revenue: 1000 }],
      '2026-01-14',
      '2026-01-16'
    );

    expect(grid.map((d: any) => d.date)).toEqual(['2026-01-14', '2026-01-15', '2026-01-16']);
    expect(grid[1].hours[8].transactions).toBe(2);
  });

  it('дата строки не съезжает на день назад (день недели совпадает с датой)', () => {
    // 1 июля 2026 — среда
    const grid = buildHeatmapGrid(
      [{ date: day('2026-07-01'), hour: 0, operations: 1, revenue: 100 }],
      '2026-07-01',
      '2026-07-01'
    );

    expect(grid[0].date).toBe('2026-07-01');
    expect(grid[0].dayName).toBe('Ср');
  });

  it('переход через границу месяца', () => {
    const grid = buildHeatmapGrid(
      [{ date: day('2026-07-31'), hour: 12, operations: 1, revenue: 500 }],
      '2026-07-30',
      '2026-08-02'
    );

    expect(grid.map((d: any) => d.date)).toEqual([
      '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02',
    ]);
  });

  it('без данных возвращает пустую сетку', () => {
    expect(buildHeatmapGrid(undefined, '2026-07-01', '2026-07-05')).toEqual([]);
    expect(buildHeatmapGrid([], '2026-07-01', '2026-07-05')).toEqual([]);
  });
});
