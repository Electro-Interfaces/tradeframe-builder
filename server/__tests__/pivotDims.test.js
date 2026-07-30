/**
 * Белый список измерений сводной. Из этой карты берётся SQL-выражение для
 * GROUP BY, поэтому любой ключ извне обязан отбраковываться до запроса.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const { DIMS, MAX_DIMS, parseDims } = require('../services/analytics/pivotDims');

test('валидные измерения разбираются с сохранением порядка', () => {
  assert.deepEqual(parseDims('station,fuel,payment'), ['station', 'fuel', 'payment']);
  assert.deepEqual(parseDims(' payment , station '), ['payment', 'station']);
});

test('неизвестное измерение отбраковывается (в SQL попадать нечему)', () => {
  assert.throws(() => parseDims('station,dt::date'), /Неизвестные измерения/);
  assert.throws(() => parseDims("station,1=1--"), /Неизвестные измерения/);
  assert.throws(() => parseDims('STATION'), /Неизвестные измерения/);
});

test('пустой запрос, дубли и перебор уровней отклоняются', () => {
  assert.throws(() => parseDims(''), /Не указаны измерения/);
  assert.throws(() => parseDims(undefined), /Не указаны измерения/);
  assert.throws(() => parseDims('fuel,fuel'), /не должны повторяться/);
  assert.throws(
    () => parseDims('station,fuel,payment,day,shift,pos'),
    new RegExp(`максимум ${MAX_DIMS}`)
  );
});

test('у каждого измерения есть подпись, SQL и извлечение значения из STS-строки', () => {
  for (const [key, dim] of Object.entries(DIMS)) {
    assert.ok(dim.label, `${key}: нет подписи`);
    assert.ok(dim.sql, `${key}: нет SQL`);
    assert.equal(typeof dim.valueOf, 'function', `${key}: нет valueOf`);
  }
});

test('valueOf разбирает строку STS так же, как SQL — дата, месяц, час', () => {
  const row = { dt: '2026-07-30T15:11:34', stationCode: 3, fuelName: 'ДТ', paymentMethod: 'Наличные' };
  assert.equal(DIMS.day.valueOf(row), '2026-07-30');
  assert.equal(DIMS.month.valueOf(row), '2026-07');
  assert.equal(DIMS.hour.valueOf(row), 15);
  assert.equal(DIMS.station.valueOf(row), 3);
  assert.equal(DIMS.fuel.valueOf(row), 'ДТ');
  assert.equal(DIMS.payment.valueOf(row), 'Наличные');
  // пустые значения → null, чтобы в дереве стать «— не указано —», а не 'null'
  assert.equal(DIMS.payType.valueOf({}), null);
  assert.equal(DIMS.hour.valueOf({}), null);
});
