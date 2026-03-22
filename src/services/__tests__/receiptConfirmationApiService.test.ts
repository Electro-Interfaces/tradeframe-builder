/**
 * Тесты для receiptConfirmationApiService — утилиты (makeConfirmationKey, buildConfirmationIndex)
 * + валидация типов ConfirmReceiptData
 */
import { describe, it, expect } from 'vitest';
import {
  makeConfirmationKey,
  buildConfirmationIndex,
  type ReceiptConfirmation,
  type ConfirmReceiptData,
} from '../receiptConfirmationApiService';

// ── Фабрика ──────────────────────────────────────────

function makeConfirmation(overrides: Partial<ReceiptConfirmation> = {}): ReceiptConfirmation {
  return {
    id: 'c0000000-0000-0000-0000-000000000001',
    systemId: 1,
    stationNumber: 3,
    shiftNumber: 12,
    tankNumber: 2,
    ttn: 'ТТН-001',
    receiptDt: '2026-03-20T10:00:00',
    status: 'confirmed',
    correctedVolume: null,
    correctedAmount: null,
    correctedDensity: null,
    correctedTemp: null,
    comment: '',
    confirmedBy: 'u0000000-0000-0000-0000-000000000001',
    confirmedByName: 'Иванов И.И.',
    createdAt: '2026-03-20T10:05:00Z',
    updatedAt: '2026-03-20T10:05:00Z',
    ...overrides,
  };
}

// ── makeConfirmationKey ──────────────────────────────

describe('makeConfirmationKey', () => {
  it('генерирует ключ system:station:tank:ttn:dt', () => {
    const key = makeConfirmationKey(1, 3, 2, 'ТТН-001', '2026-03-20T10:00:00');
    expect(key).toBe('1:3:2:ТТН-001:2026-03-20T10:00:00');
  });

  it('обрабатывает кириллические ТТН', () => {
    const key = makeConfirmationKey(5, 10, 1, 'АБВ-123/456', '2026-01-01');
    expect(key).toBe('5:10:1:АБВ-123/456:2026-01-01');
  });

  it('разные tank → разные ключи', () => {
    const k1 = makeConfirmationKey(1, 3, 1, 'X', '2026-01-01');
    const k2 = makeConfirmationKey(1, 3, 2, 'X', '2026-01-01');
    expect(k1).not.toBe(k2);
  });

  it('разные dt → разные ключи', () => {
    const k1 = makeConfirmationKey(1, 3, 1, 'X', '2026-01-01T00:00');
    const k2 = makeConfirmationKey(1, 3, 1, 'X', '2026-01-02T00:00');
    expect(k1).not.toBe(k2);
  });
});

// ── buildConfirmationIndex ───────────────────────────

describe('buildConfirmationIndex', () => {
  it('пустой массив → пустая Map', () => {
    const map = buildConfirmationIndex([]);
    expect(map.size).toBe(0);
  });

  it('строит индекс из одного элемента', () => {
    const c = makeConfirmation();
    const map = buildConfirmationIndex([c]);
    expect(map.size).toBe(1);

    const key = makeConfirmationKey(c.systemId, c.stationNumber, c.tankNumber, c.ttn, c.receiptDt);
    expect(map.get(key)).toEqual(c);
  });

  it('строит индекс из нескольких элементов', () => {
    const items = [
      makeConfirmation({ ttn: 'A', tankNumber: 1 }),
      makeConfirmation({ ttn: 'B', tankNumber: 2 }),
      makeConfirmation({ ttn: 'C', tankNumber: 3 }),
    ];
    const map = buildConfirmationIndex(items);
    expect(map.size).toBe(3);
  });

  it('последний дубль перезаписывает предыдущий (одинаковый ключ)', () => {
    const old = makeConfirmation({ status: 'confirmed', comment: 'old' });
    const newer = makeConfirmation({ status: 'corrected', comment: 'new' });
    const map = buildConfirmationIndex([old, newer]);
    expect(map.size).toBe(1);

    const key = makeConfirmationKey(old.systemId, old.stationNumber, old.tankNumber, old.ttn, old.receiptDt);
    expect(map.get(key)!.status).toBe('corrected');
    expect(map.get(key)!.comment).toBe('new');
  });

  it('ключ корректно индексирует по station + tank', () => {
    const c1 = makeConfirmation({ stationNumber: 1, tankNumber: 1, ttn: 'X' });
    const c2 = makeConfirmation({ stationNumber: 1, tankNumber: 2, ttn: 'X' });
    const c3 = makeConfirmation({ stationNumber: 2, tankNumber: 1, ttn: 'X' });
    const map = buildConfirmationIndex([c1, c2, c3]);
    expect(map.size).toBe(3);
  });
});

// ── Типы ConfirmReceiptData ──────────────────────────

describe('ConfirmReceiptData type contract', () => {
  it('confirmed — без corrected полей', () => {
    const data: ConfirmReceiptData = {
      systemId: 1,
      stationNumber: 3,
      shiftNumber: 12,
      tankNumber: 2,
      ttn: 'ТТН-001',
      receiptDt: '2026-03-20',
      status: 'confirmed',
    };
    expect(data.status).toBe('confirmed');
    expect(data.correctedVolume).toBeUndefined();
  });

  it('corrected — с corrected полями', () => {
    const data: ConfirmReceiptData = {
      systemId: 1,
      stationNumber: 3,
      shiftNumber: 12,
      tankNumber: 2,
      ttn: 'ТТН-001',
      receiptDt: '2026-03-20',
      status: 'corrected',
      correctedVolume: '5000.50',
      correctedAmount: '3750.25',
      correctedDensity: 0.750,
      correctedTemp: 0,  // 0°C — валидное значение
      comment: 'Неточный счётчик',
    };
    expect(data.correctedTemp).toBe(0);
    expect(data.correctedDensity).toBe(0.750);
  });

  it('rejected — с комментарием', () => {
    const data: ConfirmReceiptData = {
      systemId: 1,
      stationNumber: 3,
      shiftNumber: 12,
      tankNumber: 2,
      ttn: 'ТТН-001',
      receiptDt: '2026-03-20',
      status: 'rejected',
      comment: 'Дублирующая ТТН',
    };
    expect(data.status).toBe('rejected');
    expect(data.comment).toBeTruthy();
  });
});
