const { test, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const poolPath = require.resolve('../db/pool');
const proxyPath = require.resolve('../services/stsProxyService');
const syncPath = require.resolve('../services/analytics/stsSync');
const savedPool = require.cache[poolPath];
const savedProxy = require.cache[proxyPath];
const calls = { requests: [], inserts: [] };

require.cache[poolPath] = {
  id: poolPath,
  filename: poolPath,
  loaded: true,
  exports: {
    queryOne: async () => ({ external_id: '15' }),
    query: async (sql, params = []) => {
      if (sql.includes('SELECT external_id FROM trading_points')) {
        return { rows: [{ external_id: '3' }] };
      }
      if (sql.includes('INSERT INTO sts_transactions')) {
        calls.inserts.push(params);
        return { rows: [] };
      }
      throw new Error(`Неожиданный SQL в тесте: ${sql}`);
    },
  },
};

require.cache[proxyPath] = {
  id: proxyPath,
  filename: proxyPath,
  loaded: true,
  exports: {
    stsInternalRequest: async (path, params, headers, options) => {
      calls.requests.push({ path, params, headers, options });
      return [{
        number: 3,
        items: [{
          id: 1,
          dt: '2026-07-03T23:58:48',
          fuel: 2,
          fuel_name: 'АИ-92',
          quantity: '20.35',
          price: '81.90',
          cost: '1666.67',
          pay_type: { id: 1, name: 'Наличные' },
        }],
      }];
    },
  },
};

delete require.cache[syncPath];
const { syncNetworkRange, validateSyncRange } = require(syncPath);

after(() => {
  delete require.cache[syncPath];
  if (savedPool) require.cache[poolPath] = savedPool;
  else delete require.cache[poolPath];
  if (savedProxy) require.cache[proxyPath] = savedProxy;
  else delete require.cache[proxyPath];
});

test('ручная синхронизация перечитывает выбранный исторический период без кэша', async () => {
  const result = await syncNetworkRange(
    '73ccc1c3-dc69-4684-8c21-18a1fcec967c',
    '2026-07-01',
    '2026-07-31',
    [3]
  );

  assert.equal(result.ok, true);
  assert.equal(result.rows, 1);
  assert.equal(result.stations, 1);
  assert.equal(calls.requests.length, 1);
  assert.equal(calls.requests[0].path, '/v2/transactions');
  assert.equal(calls.requests[0].params.dt_beg, '2026-07-01 00:00:00');
  assert.equal(calls.requests[0].params.dt_end, '2026-07-31 23:59:59');
  assert.equal(calls.requests[0].options.bypassCache, true);
  assert.equal(calls.inserts.length, 1);
  assert.equal(calls.inserts[0][3], 1);
  assert.equal(calls.inserts[0][12], 20.35);
});

test('валидация ограничивает ручную синхронизацию безопасным диапазоном', () => {
  assert.deepEqual(validateSyncRange('2026-07-01', '2026-07-31', 62), {
    from: '2026-07-01',
    to: '2026-07-31',
    days: 31,
  });
  assert.throws(
    () => validateSyncRange('2026-07-31', '2026-07-01', 62),
    /Начало периода/
  );
  assert.throws(
    () => validateSyncRange('2026-07-01', '2026-09-01', 62),
    /не может превышать 62 дней/
  );
  assert.throws(
    () => validateSyncRange('2026-02-30', '2026-03-01', 62),
    /формате YYYY-MM-DD/
  );
});
