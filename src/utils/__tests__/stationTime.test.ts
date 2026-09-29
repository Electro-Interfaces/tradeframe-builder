import { describe, it, expect } from 'vitest';
import { stationTimeToDate, formatStationTime, mskOffsetLabel, networkTimezone } from '../stationTime';
import serverStationTime from '../../../server/services/stationTime.js';

const TYUMEN = 'Asia/Yekaterinburg';

describe('stationTime', () => {
  it('настенное время Тюмени → момент на 2 ч раньше московского', () => {
    expect(stationTimeToDate('2026-09-29T19:07:53', TYUMEN)!.toISOString()).toBe('2026-09-29T14:07:53.000Z');
    expect(stationTimeToDate('2026-09-29T19:07:53', 'Europe/Moscow')!.toISOString()).toBe('2026-09-29T16:07:53.000Z');
  });

  it('пояс по умолчанию — МСК, строка с Z не пересчитывается', () => {
    expect(stationTimeToDate('2026-09-29T07:59:25')!.toISOString()).toBe('2026-09-29T04:59:25.000Z');
    expect(stationTimeToDate('2026-09-29T07:59:25Z', TYUMEN)!.toISOString()).toBe('2026-09-29T07:59:25.000Z');
    expect(stationTimeToDate(null)).toBeNull();
  });

  it('момент → строка STS по часам станции (дата цены)', () => {
    const at = new Date('2026-09-29T17:00:00Z'); // 20:00 МСК
    expect(formatStationTime(at, TYUMEN)).toBe('2026-09-29T22:00:00');
    expect(formatStationTime(at, 'Europe/Moscow')).toBe('2026-09-29T20:00:00');
    expect(stationTimeToDate(formatStationTime(at, TYUMEN), TYUMEN)!.getTime()).toBe(at.getTime());
  });

  it('подпись и пояс сети', () => {
    expect(mskOffsetLabel(TYUMEN)).toBe('МСК+2');
    expect(mskOffsetLabel('Europe/Moscow')).toBe('');
    expect(networkTimezone({ settings: { timezone: TYUMEN } })).toBe(TYUMEN);
    expect(networkTimezone(null)).toBe('Europe/Moscow');
  });

  it('серверная копия считает так же (уведомление «терминал офлайн»)', () => {
    for (const [s, tz] of [['2026-09-29T19:07:53', TYUMEN], ['2026-09-29T07:59:25', undefined], ['2026-09-29T07:59:25Z', TYUMEN]] as const) {
      expect(serverStationTime.stationTimeToDate(s, tz).toISOString()).toBe(stationTimeToDate(s, tz)!.toISOString());
    }
  });
});
