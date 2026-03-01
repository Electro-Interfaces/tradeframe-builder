import { describe, it, expect } from 'vitest';
import { extractStationNumber, hasStationNumber } from '../tradingPointUtils';

// =============================================================================
// extractStationNumber
// =============================================================================
describe('extractStationNumber', () => {
  it('по external_id (число)', () => {
    expect(extractStationNumber({ external_id: '42' })).toBe(42);
  });

  it('по external_id (строка с числом)', () => {
    expect(extractStationNumber({ external_id: '7' })).toBe(7);
  });

  it('external_id не число → проверяет externalCodes', () => {
    const tp = {
      external_id: 'abc',
      externalCodes: [{ system: 'sts', isActive: true, code: '15' }],
    };
    expect(extractStationNumber(tp)).toBe(15);
  });

  it('по externalCodes с system=sts и isActive=true', () => {
    const tp = {
      externalCodes: [
        { system: 'other', isActive: true, code: '99' },
        { system: 'sts', isActive: false, code: '88' },
        { system: 'sts', isActive: true, code: '10' },
      ],
    };
    expect(extractStationNumber(tp)).toBe(10);
  });

  it('по id regex "bto-azs-4"', () => {
    expect(extractStationNumber({ id: 'bto-azs-4' })).toBe(4);
  });

  it('по id regex "station-123"', () => {
    expect(extractStationNumber({ id: 'station-123' })).toBe(123);
  });

  it('приоритет: external_id > externalCodes > id', () => {
    const tp = {
      external_id: '5',
      externalCodes: [{ system: 'sts', isActive: true, code: '10' }],
      id: 'bto-azs-99',
    };
    expect(extractStationNumber(tp)).toBe(5);
  });

  it('приоритет: externalCodes > id (без external_id)', () => {
    const tp = {
      externalCodes: [{ system: 'sts', isActive: true, code: '10' }],
      id: 'bto-azs-99',
    };
    expect(extractStationNumber(tp)).toBe(10);
  });

  it('null → undefined', () => {
    expect(extractStationNumber(null)).toBeUndefined();
  });

  it('undefined → undefined', () => {
    expect(extractStationNumber(undefined)).toBeUndefined();
  });

  it('пустой объект → undefined', () => {
    expect(extractStationNumber({})).toBeUndefined();
  });

  it('id без чисел → undefined', () => {
    expect(extractStationNumber({ id: 'no-numbers' })).toBeUndefined();
  });
});

// =============================================================================
// hasStationNumber
// =============================================================================
describe('hasStationNumber', () => {
  it('true когда номер есть', () => {
    expect(hasStationNumber({ external_id: '5' })).toBe(true);
  });

  it('false когда номера нет', () => {
    expect(hasStationNumber({})).toBe(false);
  });

  it('false для null', () => {
    expect(hasStationNumber(null)).toBe(false);
  });
});
