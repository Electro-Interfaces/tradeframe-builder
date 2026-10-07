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

// Одна дыра в один день (потерянный синком) и один длинный простой станции.
const GAPS = [
  {
    network_id: '73ccc1c3-dc69-4684-8c21-18a1fcec967c',
    system: 15,
    station_code: 288,
    gap_from: '2026-08-31',
    gap_to: '2026-08-31',
    gap_len: 1,
  },
  {
    network_id: '73ccc1c3-dc69-4684-8c21-18a1fcec967c',
    system: 15,
    station_code: 6,
    gap_from: '2026-08-01',
    gap_to: '2026-08-09',
    gap_len: 9,
  },
];

require.cache[poolPath] = {
  id: poolPath,
  filename: poolPath,
  loaded: true,
  exports: {
    queryOne: async () => null,
    query: async (sql, params = []) => {
      if (sql.includes('WITH present AS')) return { rows: GAPS };
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
      calls.requests.push({ path, params, options });
      return [{
        number: params.station,
        items: [{
          id: 777,
          dt: '2026-08-31T12:15:00',
          fuel: 2,
          fuel_name: 'АИ-92',
          quantity: '20.35',
          price: '81.90',
          cost: '1666.67',
          pay_type: { id: 43, name: 'Карты МПС' },
        }],
      }];
    },
  },
};

delete require.cache[syncPath];
const { patchGaps } = require(syncPath);

after(() => {
  delete require.cache[syncPath];
  if (savedPool) require.cache[poolPath] = savedPool;
  else delete require.cache[poolPath];
  if (savedProxy) require.cache[proxyPath] = savedProxy;
  else delete require.cache[proxyPath];
});

test('пустой день между непустыми перечитывается из STS, длинный простой не трогается', async () => {
  const result = await patchGaps();

  assert.equal(result.gaps, 2);
  assert.equal(result.skipped, 1, 'простой длиной 9 дней — не дыра синка');
  assert.equal(result.days, 1);
  assert.ok(result.rows > 0, 'транзакции дыры должны быть записаны');

  assert.equal(calls.requests.length, 1, 'в STS уходит только дырявый день');
  const [request] = calls.requests;
  assert.equal(request.path, '/v2/transactions');
  assert.equal(request.params.station, 288);
  assert.equal(request.params.dt_beg, '2026-08-31 00:00:00');
  assert.equal(request.params.dt_end, '2026-08-31 23:59:59');
  assert.equal(request.options.bypassCache, true, 'иначе вернётся тот же пустой кэш');

  assert.equal(calls.inserts.length, 1);
  assert.equal(calls.inserts[0][2], 288, 'station_code записи');
});
