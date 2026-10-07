import { describe, it, expect } from 'vitest';
import { applyShiftTotals, shiftReportParams } from '../shiftTotals';
import type { ShiftListItem } from '@/types/shift-reports-v2';

const shift = (n: number, status: 'open' | 'closed') =>
  ({ id: `15-5-${n}`, shiftNumber: n, shift: n, station: 5, stationCode: 5, status,
     openedAt: '2026-09-05T00:00:42', closedAt: status === 'closed' ? '2026-09-06T00:00:30' : null,
     totalRevenue: 0, totalVolume: 0, transactionCount: 0 } as unknown as ShiftListItem);

// АКЗС №5 (ГИГ): №260 — отчёт STS пустой (sales/psm пусты), №261 — с продажами, №262 — открыта
const shifts = [shift(260, 'closed'), shift(261, 'closed'), shift(262, 'open')];

describe('shiftTotals', () => {
  it('итоги из сменного отчёта; пустая — закрытая смена с нулевым отчётом', () => {
    const res = applyShiftTotals(shifts, new Map([
      ['15-5-260', { revenue: 0, volume: 0 }],
      ['15-5-261', { revenue: 154539, volume: 1973 }],
    ]));
    expect(res[0]).toMatchObject({ totalsKnown: true, isEmpty: true });
    expect(res[1]).toMatchObject({ totalRevenue: 154539, totalVolume: 1973, totalsKnown: true, isEmpty: false });
    expect(res[2].totalsKnown).toBeUndefined();
  });

  it('system/station берутся из id смены', () => {
    expect(shiftReportParams(shifts[0])).toEqual({ system: 15, station: 5, shift: 260 });
  });
});
