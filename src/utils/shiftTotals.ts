/**
 * Итоги смен для журнала «Сменных отчётов».
 *
 * /v1/shifts сумм не отдаёт, поэтому выручку и литры каждой смены берём из её
 * сменного отчёта — тем же адаптером, что и «Детали смены», чтобы список и
 * детали всегда совпадали. Пустая смена = закрытая смена, в отчёте которой
 * нулевые и выручка, и объём.
 */
import type { ShiftListItem } from '@/types/shift-reports-v2';

export interface ShiftTotals { revenue: number; volume: number }

/** system и station из id смены вида `${system}-${station}-${shift}` */
export function shiftReportParams(s: ShiftListItem): { system: number; station: number; shift: number } | null {
  const [system, station] = s.id.split('-').map(Number);
  if (!Number.isFinite(system) || !Number.isFinite(station)) return null;
  return { system, station, shift: s.shiftNumber };
}

export function applyShiftTotals(shifts: ShiftListItem[], totals: Map<string, ShiftTotals>): ShiftListItem[] {
  if (totals.size === 0) return shifts;
  return shifts.map((s) => {
    const t = totals.get(s.id);
    if (!t) return s;
    return {
      ...s,
      totalRevenue: t.revenue,
      totalVolume: t.volume,
      totalsKnown: true,
      isEmpty: s.status === 'closed' && t.revenue === 0 && t.volume === 0,
    };
  });
}
