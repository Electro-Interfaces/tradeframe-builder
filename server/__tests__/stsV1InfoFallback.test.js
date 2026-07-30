/**
 * Тест нормализации /v1/info → форма /v2/info.
 * Фолбэк нужен потому, что STS отдаёт 500 на /v2/info по отдельным системам
 * (кейс system=71), а краткий /v1/info по той же станции живой.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const { normalizeV1InfoToV2 } = require('../services/stsProxyService');

// Реальный ответ /v1/info?system=71 (станция 3, 30.07.2026), обрезанный до одного поста
const V1_RESPONSE = [{
  system: 71,
  station: 3,
  shift: { number: 5904, state: 'Открытая' },
  pos: [{
    number: 1,
    dt_info: '2026-07-30T15:11:00',
    uptime: '2026-07-30T15:02:00',
    shift: { number: 5904, state: 'Открытая', dt_open: '2026-07-30T08:00:47' },
    devices: [
      { name: 'Фискальный регистратор', state: 'OK' },
      { name: 'Купюроприемник', state: '0' },
      { name: 'Купюроприемник', state: '[]' },
      { name: 'Купюроприемник', state: 'Отсутствует' },
      { name: 'Купюроприемник', state: '0.00' },
      { name: 'Картридер', state: 'Отсутствует' },
      { name: 'МПС-ридер', state: 'OK' },
      { name: 'Уровнемер', state: 'OK' },
    ],
  }],
}];

function stateOf(pos, deviceName) {
  const device = pos.devices.find((d) => d.name === deviceName);
  assert.ok(device, `устройство «${deviceName}» потерялось при нормализации`);
  assert.equal(device.params[0].name, 'Состояние');
  return device.params[0].value;
}

test('нормализация схлопывает дубли устройств v1 в params формы v2', () => {
  const [station] = normalizeV1InfoToV2(V1_RESPONSE);
  const pos = station.pos[0];

  // 8 записей v1 → 5 устройств (Купюроприемник встречался 4 раза)
  assert.equal(pos.devices.length, 5);

  assert.equal(stateOf(pos, 'Фискальный регистратор'), 'OK');
  // из ['0', '[]', 'Отсутствует', '0.00'] состоянием считается единственное
  // значение, не похожее на число или пустой массив
  assert.equal(stateOf(pos, 'Купюроприемник'), 'Отсутствует');
  assert.equal(stateOf(pos, 'Картридер'), 'Отсутствует');
  assert.equal(stateOf(pos, 'МПС-ридер'), 'OK');
  assert.equal(stateOf(pos, 'Уровнемер'), 'OK');

  // остальные поля поста и станции не тронуты
  assert.equal(pos.number, 1);
  assert.equal(pos.dt_info, '2026-07-30T15:11:00');
  assert.equal(station.shift.number, 5904);
});

test('нормализация не падает на пустых и неожиданных данных', () => {
  assert.deepEqual(normalizeV1InfoToV2([]), []);
  assert.equal(normalizeV1InfoToV2(null), null);
  assert.deepEqual(normalizeV1InfoToV2([{ system: 71, station: 3 }]), [{ system: 71, station: 3, pos: [] }]);
});
