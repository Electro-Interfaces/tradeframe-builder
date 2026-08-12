import { describe, it, expect } from 'vitest';
import { ShiftReportAdapterV2 } from '../shiftReportAdapterV2';

/**
 * Мини-копия апи-ответа /v1/report/shift_report для АЗС 209, смена 3842 (13-14.04.2026).
 * Используется для проверки ключевых инвариантов адаптера.
 */
const API_3842: any = {
  psm: {
    total: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { quantity: 0, cost: 0, amount: 0 }, tank: 5 },
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { quantity: 762.53, cost: 561.22, amount: 48420.72 }, tank: 6 },
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { quantity: 509.05, cost: 379.24, amount: 34717.22 }, tank: 2 },
      { service: { service_code: 5, service_name: 'ДТ' }, release: { quantity: 233.25, cost: 193.36, amount: 17610.38 }, tank: 3 },
    ],
    data: [
      { shift: 3842, price: 68.2, tank: 2, density: 745, pump: 2, nozzle: '2-1', psm_beg: 489591.94, psm_end: 490100.99,
        release: { volume: '509.05', amount: '379.24', cost: '34717.22' }, service: { service_code: 3, service_name: 'АИ-95' } },
      { shift: 3842, price: 75.5, tank: 3, density: 829, pump: 3, nozzle: '3-1', psm_beg: 838878.18, psm_end: 839111.43,
        release: { volume: '233.25', amount: '193.36', cost: '17610.38' }, service: { service_code: 5, service_name: 'ДТ' } },
      { shift: 3842, price: 63.5, tank: 6, density: 736, pump: 6, nozzle: '6-1', psm_beg: 305583.61, psm_end: 306346.14,
        release: { volume: '762.53', amount: '561.22', cost: '48420.72' }, service: { service_code: 2, service_name: 'АИ-92' } },
    ],
  },
  release: [
    { shift: 3842, tank: 2, density_beg: 0.745, density_end: 0.745, temp_beg: 0, temp_end: 0,
      doc_beg: { volume: '5350.60', amount: '2213.54' }, doc_end: { volume: '17837.55', amount: '11474.30' },
      receipt: { volume: '12996.00', amount: '9640.00' }, release: { volume: '509.05', amount: '379.24' },
      level_end: 189, volume_end: 17836.98, water: { volume: 0, level: 0 },
      service: { service_code: 3, service_name: 'АИ-95' } },
  ],
  receipt: [
    { tank: 2, ttn: '4279', doc: { volume: '12996.000', amount: '9640.000', density: 741.8, temp: 8 },
      fact: { volume: '12996.000', amount: '9640.000', density: 741.8, temp: 8 },
      dt: '2026-04-13T14:51:30', base: { id: 1, name: 'Нефтебаза' }, shift: 3842,
      service: { service_code: 3, service_name: 'АИ-95' } },
  ],
  sales: [
    { pay_type: { id: 1, name: 'Наличные' }, fuel: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { volume: '92.500', cost: '5873.77', discount: 0 } },
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { volume: '31.160', cost: '2125.11', discount: 0 } },
      { service: { service_code: 5, service_name: 'ДТ' }, release: { volume: '1.250', cost: '94.38', discount: 0 } },
    ] },
    { pay_type: { id: 5, name: 'Талоны' }, fuel: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { volume: '80.000', cost: '5080.00', discount: 0 } },
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { volume: '90.000', cost: '6138.00', discount: 0 } },
    ] },
    { pay_type: { id: 26, name: 'СберБанк' }, fuel: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { volume: '410.030', cost: '26036.93', discount: 0 } },
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { volume: '395.150', cost: '26949.24', discount: 0 } },
    ] },
    { pay_type: { id: 30, name: 'БАЛТОП' }, fuel: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { volume: '70.000', cost: '4445.00', discount: 0 } },
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { volume: '40.000', cost: '2728.00', discount: 0 } },
      { service: { service_code: 5, service_name: 'ДТ' }, release: { volume: '180.000', cost: '13590.00', discount: 0 } },
    ] },
    { pay_type: { id: 31, name: 'Инфорком' }, fuel: [
      { service: { service_code: 2, service_name: 'АИ-92' }, release: { volume: '70.000', cost: '4445.00', discount: 0 } },
    ] },
    { pay_type: { id: 33, name: 'VIAcard' }, fuel: [
      { service: { service_code: 5, service_name: 'ДТ' }, release: { volume: '100.000', cost: '7550.00', discount: 0 } },
    ] },
    { pay_type: { id: 235, name: 'МобилПр.' }, fuel: [
      { service: { service_code: 3, service_name: 'АИ-95' }, release: { volume: '30.000', cost: '2046.00', discount: 0 } },
    ] },
  ],
  money: [
    { pos: 1, shift: 3842, volume: 17850, operation: { id: 0, name: 'Остаток на начало смены по раб.местам' } },
    { pos: 1, shift: 3842, volume: 8093.26, operation: { id: 3, name: 'Выручка' } },
    { pos: 1, shift: 3842, volume: 25943.26, operation: { id: 4, name: 'Остаток на конец смены по раб.местам' } },
    { pos: 1, shift: 3842, volume: 222648.29, operation: { id: 5, name: 'Показания ККТ начало' } },
    { pos: 1, shift: 3842, volume: 283727.72, operation: { id: 6, name: 'Показания ККТ конец' } },
    { pos: 1, shift: 3842, volume: 17850, operation: { id: 7, name: 'Остаток на конец смены по всей АЗС' } },
  ],
};

const SHIFT_INFO = {
  shift: 3842,
  dt_open: '2026-04-13T07:57:31',
  dt_close: '2026-04-14T07:31:54',
};

describe('ShiftReportAdapterV2.toDetails', () => {
  const details = ShiftReportAdapterV2.toDetails(API_3842, 3842, 15, 209, 'АКАЗС №209', SHIFT_INFO);

  it('шапка содержит корректные даты и номер смены', () => {
    expect(details.shiftNumber).toBe(3842);
    expect(details.openedAt).toBe('2026-04-13T07:57:31');
    expect(details.closedAt).toBe('2026-04-14T07:31:54');
    expect(details.status).toBe('closed');
    expect(details.stationCode).toBe(209);
  });

  it('резервуары: для каждого calc = doc_beg + receipt − release (diff = 0)', () => {
    expect(details.tanks.length).toBe(1);
    const t = details.tanks[0];
    expect(t.tankNumber).toBe(2);
    expect(t.volumeBegin).toBeCloseTo(5350.60, 2);
    expect(t.volumeReceived).toBeCloseTo(12996.00, 2);
    expect(t.volumeDispensed).toBeCloseTo(509.05, 2);
    expect(t.volumeEnd).toBeCloseTo(17837.55, 2);
    expect(t.volumeDifference).toBeCloseTo(0, 2);
    expect(t.hasExcessError).toBe(false);
  });
});

describe('ShiftReportAdapterV2 · фактический остаток (rest)', () => {
  const withRest = (rest: any) => ShiftReportAdapterV2.toDetails(
    { ...API_3842, release: [{ ...API_3842.release[0], rest }] },
    3842, 15, 209, 'АКАЗС №209', SHIFT_INFO,
  ).tanks[0];

  it('факт берётся из rest, а не из doc_end', () => {
    const t = withRest({ volume: '17836.98', amount: '13288.55' });
    expect(t.volumeFact).toBeCloseTo(17836.98, 2);
    expect(t.massFact).toBeCloseTo(13288.55, 2);
    expect(t.volumeEnd).toBeCloseTo(17837.55, 2); // книжный остался книжным
  });

  it('битая масса из API отбраковывается и считается по плотности', () => {
    const t = withRest({ volume: '17836.98', amount: '47000.00' });
    expect(t.massFact).toBeCloseTo(17836.98 * 0.745, 2);
  });

  it('без rest факт падает на volume_end', () => {
    const t = ShiftReportAdapterV2.toDetails(API_3842, 3842, 15, 209, 'АКАЗС №209', SHIFT_INFO).tanks[0];
    expect(t.volumeFact).toBeCloseTo(17836.98, 2);
  });
});

describe('ShiftReportAdapterV2 · salesBreakdown', () => {
  const details = ShiftReportAdapterV2.toDetails(API_3842, 3842, 15, 209, 'АКАЗС №209', SHIFT_INFO);
  const byFuel = new Map(details.salesBreakdown.map((s: any) => [s.fuelCode, s]));

  it('содержит 3 вида топлива', () => {
    expect(details.salesBreakdown).toHaveLength(3);
    expect(byFuel.has(2)).toBe(true);
    expect(byFuel.has(3)).toBe(true);
    expect(byFuel.has(5)).toBe(true);
  });

  it('АИ-92: наличные + СберБанк + безнал сходятся в Всего 722.53 л', () => {
    const ai92 = byFuel.get(2) as any;
    expect(ai92.cashVolume).toBeCloseTo(92.50, 2);
    expect(ai92.cardVolume).toBeCloseTo(410.03, 2);
    // Талоны (80) + БАЛТОП (70) + Инфорком (70)
    expect(ai92.nonCashVolume).toBeCloseTo(220.00, 2);
    expect(ai92.totalVolume).toBeCloseTo(722.53, 2);
  });

  it('АИ-95: Талоны + БАЛТОП + МобилПр в безнал = 160 л', () => {
    const ai95 = byFuel.get(3) as any;
    expect(ai95.nonCashVolume).toBeCloseTo(160.00, 2);
    expect(ai95.totalVolume).toBeCloseTo(586.31, 2);
  });

  it('ДТ: БАЛТОП + VIAcard в безнал = 280 л, СберБанк отсутствует', () => {
    const dt = byFuel.get(5) as any;
    expect(dt.cardVolume).toBeCloseTo(0, 2);
    expect(dt.nonCashVolume).toBeCloseTo(280.00, 2);
    expect(dt.totalVolume).toBeCloseTo(281.25, 2);
  });

  it('балансовая разница = 0 для всех топлив (как на бумажной распечатке АЗС)', () => {
    details.salesBreakdown.forEach((s: any) => {
      expect(s.difference).toBeCloseTo(0, 2);
    });
  });

  it('pumpVolume всегда 0 (как на бумажной распечатке АЗС)', () => {
    details.salesBreakdown.forEach((s: any) => {
      expect(s.pumpVolume).toBe(0);
    });
  });

  it('byPayType содержит каждый уникальный тип оплаты с правильной категорией', () => {
    const ai92 = byFuel.get(2) as any;
    expect(ai92.byPayType).toBeDefined();
    expect(ai92.byPayType['наличные']).toMatchObject({ category: 'cash', volume: 92.5 });
    expect(ai92.byPayType['сбербанк']).toMatchObject({ category: 'card', volume: 410.03 });
    expect(ai92.byPayType['балтоп']).toMatchObject({ category: 'corporate', volume: 70 });
    expect(ai92.byPayType['инфорком']).toMatchObject({ category: 'corporate', volume: 70 });
    expect(ai92.byPayType['талоны']).toMatchObject({ category: 'coupon', volume: 80 });
  });
});

describe('ShiftReportAdapterV2 · cashMovements', () => {
  const details = ShiftReportAdapterV2.toDetails(API_3842, 3842, 15, 209, 'АКАЗС №209', SHIFT_INFO);

  it('operation.id=0 маппится как opening (баг-фикс для АЗС 209)', () => {
    const opening = details.cashMovements.find(m => m.operationType === 'opening');
    expect(opening).toBeDefined();
    expect(opening!.amount).toBe(17850);
  });

  it('operation.id=3 маппится как income (выручка наличными)', () => {
    const income = details.cashMovements.find(m => m.operationType === 'income');
    expect(income).toBeDefined();
    expect(income!.amount).toBeCloseTo(8093.26, 2);
  });

  it('operation.id=7 маппится как closing', () => {
    const closing = details.cashMovements.find(m => m.operationType === 'closing');
    expect(closing).toBeDefined();
    expect(closing!.amount).toBe(17850);
  });

  it('operation.id=5,6 (показания ККТ) и id=4 (дубликат closing) НЕ включаются', () => {
    // id 5, 6 — это не движение денег; id 4 — дубликат, берём id 7
    // Ожидаем ровно 3 движения: opening (id 0), income (id 3), closing (id 7)
    expect(details.cashMovements).toHaveLength(3);
  });

  it('datetime opening берётся из openedAt, closing — из closedAt (не new Date)', () => {
    const opening = details.cashMovements.find(m => m.operationType === 'opening');
    const closing = details.cashMovements.find(m => m.operationType === 'closing');
    expect(opening!.datetime).toBe('2026-04-13T07:57:31');
    expect(closing!.datetime).toBe('2026-04-14T07:31:54');
  });
});

describe('ShiftReportAdapterV2 · общие сводки', () => {
  const details = ShiftReportAdapterV2.toDetails(API_3842, 3842, 15, 209, 'АКАЗС №209', SHIFT_INFO);

  it('totalRevenue = сумма cost всех paymentSales (107 101.43 ₽ как на бумажном отчёте)', () => {
    expect(details.totalRevenue).toBeCloseTo(107101.43, 2);
  });

  it('cashRevenue = 8093.26 (сумма наличных)', () => {
    expect(details.cashRevenue).toBeCloseTo(8093.26, 2);
  });

  it('cardRevenue = 52986.17 (СберБанк)', () => {
    expect(details.cardRevenue).toBeCloseTo(52986.17, 2);
  });
});
