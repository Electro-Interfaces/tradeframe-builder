import { describe, it, expect } from 'vitest';
import {
  formatStatus,
  getStatusBadgeClass,
  formatDateRu,
  formatDateTimeRu,
  formatLitersDelta,
  sumDeltaVolume,
} from '../formatters';

describe('formatStatus', () => {
  it('переводит коды статусов на русский', () => {
    expect(formatStatus('draft')).toBe('Черновик');
    expect(formatStatus('sent')).toBe('Отправлен');
    expect(formatStatus('cancelled')).toBe('Отменён');
  });
});

describe('getStatusBadgeClass', () => {
  it('возвращает разные классы для разных статусов', () => {
    expect(getStatusBadgeClass('draft')).not.toBe(getStatusBadgeClass('sent'));
    expect(getStatusBadgeClass('cancelled')).toContain('line-through');
    expect(getStatusBadgeClass('sent')).toContain('emerald');
  });
});

describe('formatDateRu', () => {
  it('форматирует ISO в DD.MM.YYYY', () => {
    expect(formatDateRu('2026-04-30')).toBe('30.04.2026');
  });

  it('возвращает прочерк для пустого значения', () => {
    expect(formatDateRu(null)).toBe('—');
    expect(formatDateRu(undefined)).toBe('—');
    expect(formatDateRu('')).toBe('—');
  });
});

describe('formatDateTimeRu', () => {
  it('возвращает строку с часами и минутами', () => {
    const result = formatDateTimeRu('2026-05-04T15:30:00Z');
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('возвращает прочерк для null', () => {
    expect(formatDateTimeRu(null)).toBe('—');
  });
});

describe('formatLitersDelta', () => {
  it('добавляет плюс для положительных дельт', () => {
    expect(formatLitersDelta(125)).toBe('+125 л');
    expect(formatLitersDelta(0.5)).toBe('+0,5 л');
  });

  it('сохраняет минус для отрицательных', () => {
    expect(formatLitersDelta(-30)).toBe('-30 л');
  });

  it('ноль без знака', () => {
    expect(formatLitersDelta(0)).toBe('0 л');
  });

  it('прочерк для null/undefined', () => {
    expect(formatLitersDelta(null)).toBe('—');
    expect(formatLitersDelta(undefined)).toBe('—');
  });
});

describe('sumDeltaVolume', () => {
  it('суммирует только заполненные строки', () => {
    const items = [
      { factVolumeL: 100, deltaVolumeL: 5 },
      { factVolumeL: null, deltaVolumeL: null },
      { factVolumeL: 200, deltaVolumeL: -3 },
    ];
    expect(sumDeltaVolume(items)).toBe(2);
  });

  it('возвращает 0 для пустого/undefined массива', () => {
    expect(sumDeltaVolume([])).toBe(0);
    expect(sumDeltaVolume(undefined)).toBe(0);
  });

  it('игнорирует строку с factVolumeL=null даже если deltaVolumeL не null', () => {
    const items = [
      { factVolumeL: null, deltaVolumeL: 999 },
      { factVolumeL: 50, deltaVolumeL: 5 },
    ];
    expect(sumDeltaVolume(items)).toBe(5);
  });
});
