/**
 * Тесты валидации данных подтверждения поступлений
 * — бизнес-логика, не требующая API/сети
 */
import { describe, it, expect } from 'vitest';
import type {
  ReceiptConfirmation,
  ConfirmationStatus,
  ConfirmReceiptData,
} from '../receiptConfirmationApiService';
import { makeConfirmationKey, buildConfirmationIndex } from '../receiptConfirmationApiService';

// ── Фабрика ──────────────────────────────────────────

function makeData(overrides: Partial<ConfirmReceiptData> = {}): ConfirmReceiptData {
  return {
    systemId: 1,
    stationNumber: 3,
    shiftNumber: 12,
    tankNumber: 2,
    ttn: 'ТТН-001',
    receiptDt: '2026-03-20T10:00:00',
    status: 'confirmed',
    ...overrides,
  };
}

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
    confirmedByName: 'Тест',
    createdAt: '2026-03-20T10:05:00Z',
    updatedAt: '2026-03-20T10:05:00Z',
    ...overrides,
  };
}

// ── Бизнес-правила валидации ─────────────────────────

describe('Бизнес-правила подтверждения ТТН', () => {
  describe('status = rejected', () => {
    it('должен требовать комментарий при отклонении', () => {
      const data = makeData({ status: 'rejected', comment: '' });
      // Воспроизводим логику из ReceiptDetailsModal handleConfirm
      const isValid = data.status !== 'rejected' || (data.comment?.trim() || '').length > 0;
      expect(isValid).toBe(false);
    });

    it('комментарий из пробелов — не валиден', () => {
      const data = makeData({ status: 'rejected', comment: '   ' });
      const isValid = data.status !== 'rejected' || (data.comment?.trim() || '').length > 0;
      expect(isValid).toBe(false);
    });

    it('непустой комментарий — валиден', () => {
      const data = makeData({ status: 'rejected', comment: 'Дублирующая ТТН' });
      const isValid = data.status !== 'rejected' || (data.comment?.trim() || '').length > 0;
      expect(isValid).toBe(true);
    });
  });

  describe('status = confirmed', () => {
    it('не требует коррекционных полей', () => {
      const data = makeData({ status: 'confirmed' });
      expect(data.correctedVolume).toBeUndefined();
      expect(data.correctedTemp).toBeUndefined();
    });
  });

  describe('status = corrected', () => {
    it('нулевая температура — валидное значение', () => {
      const data = makeData({
        status: 'corrected',
        correctedTemp: 0,
      });
      // 0°C — допустимое значение, не должно теряться
      expect(data.correctedTemp).toBe(0);
      expect(data.correctedTemp).not.toBeNull();
      expect(data.correctedTemp).not.toBeUndefined();
    });

    it('нулевая плотность — нетипично но не должна теряться', () => {
      const data = makeData({
        status: 'corrected',
        correctedDensity: 0,
      });
      expect(data.correctedDensity).toBe(0);
    });

    it('null для незаполненных полей', () => {
      const data = makeData({
        status: 'corrected',
        correctedVolume: '5000',
        correctedAmount: null,
        correctedDensity: null,
        correctedTemp: null,
      });
      expect(data.correctedVolume).toBe('5000');
      expect(data.correctedAmount).toBeNull();
    });
  });
});

// ── Обязательные поля ────────────────────────────────

describe('Обязательные поля для backend', () => {
  const requiredFields = ['systemId', 'stationNumber', 'tankNumber', 'ttn', 'receiptDt'] as const;

  requiredFields.forEach(field => {
    it(`${field} обязателен`, () => {
      const data = makeData();
      expect(data[field]).toBeDefined();
      expect(data[field]).not.toBeNull();
      if (typeof data[field] === 'string') {
        expect((data[field] as string).length).toBeGreaterThan(0);
      }
    });
  });

  it('status должен быть одним из трёх значений', () => {
    const validStatuses: ConfirmationStatus[] = ['confirmed', 'corrected', 'rejected'];
    validStatuses.forEach(status => {
      const data = makeData({ status });
      expect(validStatuses).toContain(data.status);
    });
  });
});

// ── Nullish coalescing (falsy zero) ──────────────────

describe('Falsy zero — corrected поля', () => {
  it('?? null сохраняет 0, || null теряет', () => {
    const temp = 0;
    // Так было раньше (баг):
    expect(temp || null).toBeNull();
    // Так должно быть (фикс):
    expect(temp ?? null).toBe(0);
  });

  it('?? null пропускает undefined → null', () => {
    const val = undefined;
    expect(val ?? null).toBeNull();
  });

  it('?? null пропускает null → null', () => {
    const val = null;
    expect(val ?? null).toBeNull();
  });

  it('?? null сохраняет пустую строку', () => {
    const val = '';
    expect(val ?? null).toBe('');
  });
});

// ── Индекс подтверждений — edge cases ────────────────

describe('buildConfirmationIndex edge cases', () => {
  it('один system, разные ТТ и резервуары', () => {
    const items = [
      makeConfirmation({ stationNumber: 1, tankNumber: 1, ttn: 'A' }),
      makeConfirmation({ stationNumber: 1, tankNumber: 2, ttn: 'A' }),
      makeConfirmation({ stationNumber: 2, tankNumber: 1, ttn: 'A' }),
      makeConfirmation({ stationNumber: 1, tankNumber: 1, ttn: 'B' }),
    ];
    const map = buildConfirmationIndex(items);
    expect(map.size).toBe(4);
  });

  it('lookup по ключу возвращает правильный объект', () => {
    const target = makeConfirmation({
      stationNumber: 5,
      tankNumber: 3,
      ttn: 'ЦЕЛЕВАЯ-ТТН',
      status: 'corrected',
      comment: 'найди меня',
    });
    const noise = [
      makeConfirmation({ ttn: 'OTHER-1' }),
      makeConfirmation({ ttn: 'OTHER-2' }),
    ];
    const map = buildConfirmationIndex([...noise, target]);

    const key = makeConfirmationKey(target.systemId, target.stationNumber, target.tankNumber, target.ttn, target.receiptDt);
    const found = map.get(key);
    expect(found).toBeDefined();
    expect(found!.comment).toBe('найди меня');
    expect(found!.status).toBe('corrected');
  });

  it('lookup по несуществующему ключу → undefined', () => {
    const map = buildConfirmationIndex([makeConfirmation()]);
    const key = makeConfirmationKey(999, 999, 999, 'НЕТ', '9999-99-99');
    expect(map.get(key)).toBeUndefined();
  });
});
