/**
 * Тесты аналитического слоя: нормализация оплаты + разбор транзакций STS.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const { normalizePaymentMethod } = require('../services/analytics/paymentNormalize');
const { extractRows } = require('../services/analytics/stsSync');

test('нормализация оплаты: основные категории', () => {
  assert.equal(normalizePaymentMethod('Карта МПС'), 'Банковские');
  assert.equal(normalizePaymentMethod('Наличные'), 'Наличные');
  assert.equal(normalizePaymentMethod('наличн.'), 'Наличные');
  assert.equal(normalizePaymentMethod('МобилПр'), 'Онлайн');
  assert.equal(normalizePaymentMethod('Корп. карты'), 'Корп. карты');
  assert.equal(normalizePaymentMethod('Талоны'), 'Талоны');
  assert.equal(normalizePaymentMethod('VIAcard'), 'VIAcard');
  assert.equal(normalizePaymentMethod(''), '-');
  assert.equal(normalizePaymentMethod('НечтоНеизвестное'), 'НечтоНеизвестное');
});

test('extractRows: разбор ответа STS (станции с items)', () => {
  const stsData = [{
    number: 207,
    items: [{
      id: 663710, pos: 2, shift: 2291, number: 209, dt: '2026-07-05T12:00:13',
      tank: 1, nozzle: 9, fuel: 2, fuel_name: 'АИ-92', card: 'МПС ****5995',
      order: '15.00', order_cost: '1273.50', quantity: '15.00', cost: '1273.50',
      price: '84.90', amount: '11.040', density: '0.736',
      pay_type: { id: 26, name: 'Карта МПС' },
    }],
  }];
  const rows = extractRows(stsData, 207);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.stationCode, 207);
  assert.equal(r.stsId, 663710);
  assert.equal(r.dt, '2026-07-05T12:00:13');
  assert.equal(r.fuelName, 'АИ-92');
  assert.equal(r.quantity, 15);
  assert.equal(r.cost, 1273.5);
  assert.equal(r.paymentMethod, 'Банковские'); // нормализовано из «Карта МПС»
  assert.equal(r.payTypeName, 'Карта МПС');
});

test('extractRows: пропускает записи без id/dt', () => {
  const rows = extractRows([{ number: 1, items: [
    { id: 1, dt: '2026-07-05T10:00:00', quantity: '5' },
    { id: null, dt: '2026-07-05T11:00:00' }, // без id — отбрасывается
    { id: 2, dt: null },                     // без dt — отбрасывается
  ] }], 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stsId, 1);
});

test('extractRows: плоский массив без обёртки станций', () => {
  const rows = extractRows([{ id: 5, station: 8, dt: '2026-07-05T09:00:00', fuel_name: 'ДТ', quantity: '30', cost: '2000' }], 8);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stationCode, 8);
  assert.equal(rows[0].fuelName, 'ДТ');
});
