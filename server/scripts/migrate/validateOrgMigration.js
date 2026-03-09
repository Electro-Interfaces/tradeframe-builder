require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'org-transformed.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildCountMap(items, key) {
  return items.reduce((accumulator, item) => {
    const value = item?.[key];
    if (!value) {
      return accumulator;
    }

    accumulator.set(value, (accumulator.get(value) || 0) + 1);
    return accumulator;
  }, new Map());
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => item?.[key]).filter(Boolean));
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

function ensureRelations(errors, networks, tradingPoints, externalCodes) {
  const networkIds = buildIdSet(networks);
  const tradingPointIds = buildIdSet(tradingPoints);

  tradingPoints.forEach((point) => {
    if (!networkIds.has(point.network_id)) {
      errors.push(`В source JSON точка ${point.id} ссылается на отсутствующую сеть ${point.network_id}`);
    }
  });

  externalCodes.forEach((externalCode) => {
    if (!tradingPointIds.has(externalCode.trading_point_id)) {
      errors.push(`В source JSON внешний код ${externalCode.id} ссылается на отсутствующую точку ${externalCode.trading_point_id}`);
    }
  });
}

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM networks) AS networks,
       (SELECT COUNT(*)::int FROM trading_points) AS trading_points,
       (SELECT COUNT(*)::int FROM trading_point_external_codes) AS trading_point_external_codes`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const networksResult = await client.query('SELECT id FROM networks');
  const tradingPointsResult = await client.query('SELECT id FROM trading_points');
  const externalCodesResult = await client.query('SELECT id FROM trading_point_external_codes');

  return {
    networks: new Set(networksResult.rows.map((row) => row.id)),
    tradingPoints: new Set(tradingPointsResult.rows.map((row) => row.id)),
    tradingPointExternalCodes: new Set(externalCodesResult.rows.map((row) => row.id)),
  };
}

async function fetchNetworkPointCounts(client) {
  const { rows } = await client.query(
    `SELECT network_id, COUNT(*)::int AS count
       FROM trading_points
      GROUP BY network_id`
  );

  return new Map(rows.map((row) => [row.network_id, row.count]));
}

async function fetchPointExternalCodeCounts(client) {
  const { rows } = await client.query(
    `SELECT trading_point_id, COUNT(*)::int AS count
       FROM trading_point_external_codes
      GROUP BY trading_point_id`
  );

  return new Map(rows.map((row) => [row.trading_point_id, row.count]));
}

function pushMismatches(errors, label, sourceMap, targetMap) {
  const keys = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  keys.forEach((key) => {
    const sourceCount = sourceMap.get(key) || 0;
    const targetCount = targetMap.get(key) || 0;

    if (sourceCount !== targetCount) {
      errors.push(`${label}: ${key} source=${sourceCount} target=${targetCount}`);
    }
  });
}

async function main() {
  const input = readJson(inputPath);
  const networks = Array.isArray(input.networks) ? input.networks : [];
  const tradingPoints = Array.isArray(input.tradingPoints) ? input.tradingPoints : [];
  const externalCodes = Array.isArray(input.tradingPointExternalCodes)
    ? input.tradingPointExternalCodes
    : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const networkPointCounts = await fetchNetworkPointCounts(client);
    const pointExternalCodeCounts = await fetchPointExternalCodeCounts(client);

    const errors = [];
    ensureRelations(errors, networks, tradingPoints, externalCodes);

    if (counts.networks !== networks.length) {
      errors.push(`Count mismatch networks: source=${networks.length} target=${counts.networks}`);
    }

    if (counts.trading_points !== tradingPoints.length) {
      errors.push(`Count mismatch trading_points: source=${tradingPoints.length} target=${counts.trading_points}`);
    }

    if (counts.trading_point_external_codes !== externalCodes.length) {
      errors.push(`Count mismatch trading_point_external_codes: source=${externalCodes.length} target=${counts.trading_point_external_codes}`);
    }

    const sourceNetworkIds = buildIdSet(networks);
    const sourceTradingPointIds = buildIdSet(tradingPoints);
    const sourceExternalCodeIds = buildIdSet(externalCodes);

    const missingNetworks = diffMissing(sourceNetworkIds, idSets.networks);
    const missingTradingPoints = diffMissing(sourceTradingPointIds, idSets.tradingPoints);
    const missingExternalCodes = diffMissing(sourceExternalCodeIds, idSets.tradingPointExternalCodes);

    const unexpectedNetworks = diffUnexpected(sourceNetworkIds, idSets.networks);
    const unexpectedTradingPoints = diffUnexpected(sourceTradingPointIds, idSets.tradingPoints);
    const unexpectedExternalCodes = diffUnexpected(sourceExternalCodeIds, idSets.tradingPointExternalCodes);

    if (missingNetworks.length) {
      errors.push(`Отсутствуют networks: ${missingNetworks.slice(0, 10).join(', ')}`);
    }

    if (missingTradingPoints.length) {
      errors.push(`Отсутствуют trading_points: ${missingTradingPoints.slice(0, 10).join(', ')}`);
    }

    if (missingExternalCodes.length) {
      errors.push(`Отсутствуют trading_point_external_codes: ${missingExternalCodes.slice(0, 10).join(', ')}`);
    }

    if (unexpectedNetworks.length) {
      errors.push(`Лишние networks в БД: ${unexpectedNetworks.slice(0, 10).join(', ')}`);
    }

    if (unexpectedTradingPoints.length) {
      errors.push(`Лишние trading_points в БД: ${unexpectedTradingPoints.slice(0, 10).join(', ')}`);
    }

    if (unexpectedExternalCodes.length) {
      errors.push(`Лишние trading_point_external_codes в БД: ${unexpectedExternalCodes.slice(0, 10).join(', ')}`);
    }

    const sourceNetworkPointCounts = buildCountMap(tradingPoints, 'network_id');
    const sourcePointExternalCodeCounts = buildCountMap(externalCodes, 'trading_point_id');

    pushMismatches(errors, 'Несовпадение количества точек по сети', sourceNetworkPointCounts, networkPointCounts);
    pushMismatches(errors, 'Несовпадение количества внешних кодов по точке', sourcePointExternalCodeCounts, pointExternalCodeCounts);

    console.log(`Source counts: networks=${networks.length}, trading_points=${tradingPoints.length}, trading_point_external_codes=${externalCodes.length}`);
    console.log(`Database counts: networks=${counts.networks}, trading_points=${counts.trading_points}, trading_point_external_codes=${counts.trading_point_external_codes}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация org-миграции прошла успешно');
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
