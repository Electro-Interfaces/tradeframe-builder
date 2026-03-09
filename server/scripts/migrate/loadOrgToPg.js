require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
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

function ensureUniqueIds(items, key, label) {
  const seen = new Set();

  items.forEach((item) => {
    const value = item?.[key];
    if (!value) {
      throw new Error(`В ${label} найден элемент без поля ${key}`);
    }

    if (seen.has(value)) {
      throw new Error(`В ${label} найден дубликат ${key}: ${value}`);
    }

    seen.add(value);
  });
}

function ensureRelations(networks, tradingPoints, externalCodes) {
  const networkIds = new Set(networks.map((network) => network.id));
  const tradingPointIds = new Set(tradingPoints.map((point) => point.id));

  tradingPoints.forEach((point) => {
    if (!networkIds.has(point.network_id)) {
      throw new Error(`Для trading_point ${point.id} не найдена сеть ${point.network_id}`);
    }
  });

  externalCodes.forEach((externalCode) => {
    if (!tradingPointIds.has(externalCode.trading_point_id)) {
      throw new Error(`Для external_code ${externalCode.id} не найдена точка ${externalCode.trading_point_id}`);
    }
  });
}

async function upsertNetworks(client, networks) {
  for (const network of networks) {
    await client.query(
      `INSERT INTO networks (
         id,
         tenant_id,
         code,
         external_id,
         name,
         description,
         network_type,
         source_type,
         settings,
         is_active,
         created_at,
         updated_at,
         deleted_at
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::timestamptz, $12::timestamptz, $13::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           code = EXCLUDED.code,
           external_id = EXCLUDED.external_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           network_type = EXCLUDED.network_type,
           source_type = EXCLUDED.source_type,
           settings = EXCLUDED.settings,
           is_active = EXCLUDED.is_active,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           deleted_at = EXCLUDED.deleted_at`,
      [
        network.id,
        network.tenant_id || 'default',
        network.code,
        network.external_id || null,
        network.name,
        network.description || '',
        network.network_type || 'АЗС',
        network.source_type || 'network',
        JSON.stringify(network.settings || {}),
        network.is_active !== false,
        network.created_at,
        network.updated_at || network.created_at,
        network.deleted_at || null,
      ]
    );
  }
}

async function upsertTradingPoints(client, tradingPoints) {
  for (const point of tradingPoints) {
    await client.query(
      `INSERT INTO trading_points (
         id,
         network_id,
         code,
         external_id,
         name,
         description,
         latitude,
         longitude,
         region,
         city,
         address,
         phone,
         email,
         website,
         is_blocked,
         block_reason,
         schedule,
         services,
         bill_acceptor_thresholds,
         fuel_level_thresholds,
         metadata,
         is_active,
         created_at,
         updated_at,
         deleted_at
       ) VALUES (
         $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb,
         $19::jsonb, $20::jsonb, $21::jsonb, $22, $23::timestamptz, $24::timestamptz, $25::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET network_id = EXCLUDED.network_id,
           code = EXCLUDED.code,
           external_id = EXCLUDED.external_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           region = EXCLUDED.region,
           city = EXCLUDED.city,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           website = EXCLUDED.website,
           is_blocked = EXCLUDED.is_blocked,
           block_reason = EXCLUDED.block_reason,
           schedule = EXCLUDED.schedule,
           services = EXCLUDED.services,
           bill_acceptor_thresholds = EXCLUDED.bill_acceptor_thresholds,
           fuel_level_thresholds = EXCLUDED.fuel_level_thresholds,
           metadata = EXCLUDED.metadata,
           is_active = EXCLUDED.is_active,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           deleted_at = EXCLUDED.deleted_at`,
      [
        point.id,
        point.network_id,
        point.code,
        point.external_id || null,
        point.name,
        point.description || '',
        Number(point.latitude || 0),
        Number(point.longitude || 0),
        point.region || '',
        point.city || '',
        point.address || '',
        point.phone || '',
        point.email || '',
        point.website || '',
        Boolean(point.is_blocked),
        point.block_reason || '',
        JSON.stringify(point.schedule || {}),
        JSON.stringify(point.services || {}),
        JSON.stringify(point.bill_acceptor_thresholds || {}),
        JSON.stringify(point.fuel_level_thresholds || {}),
        JSON.stringify(point.metadata || {}),
        point.is_active !== false,
        point.created_at,
        point.updated_at || point.created_at,
        point.deleted_at || null,
      ]
    );
  }
}

async function upsertTradingPointExternalCodes(client, externalCodes) {
  for (const externalCode of externalCodes) {
    await client.query(
      `INSERT INTO trading_point_external_codes (
         id,
         trading_point_id,
         system,
         code,
         description,
         is_active,
         metadata,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz, $9::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET trading_point_id = EXCLUDED.trading_point_id,
           system = EXCLUDED.system,
           code = EXCLUDED.code,
           description = EXCLUDED.description,
           is_active = EXCLUDED.is_active,
           metadata = EXCLUDED.metadata,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        externalCode.id,
        externalCode.trading_point_id,
        externalCode.system,
        externalCode.code,
        externalCode.description || '',
        externalCode.is_active !== false,
        JSON.stringify(externalCode.metadata || {}),
        externalCode.created_at,
        externalCode.updated_at || null,
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM networks) AS networks,
       (SELECT COUNT(*)::int FROM trading_points) AS trading_points,
       (SELECT COUNT(*)::int FROM trading_point_external_codes) AS trading_point_external_codes`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const networks = Array.isArray(input.networks) ? input.networks : [];
  const tradingPoints = Array.isArray(input.tradingPoints) ? input.tradingPoints : [];
  const externalCodes = Array.isArray(input.tradingPointExternalCodes)
    ? input.tradingPointExternalCodes
    : [];

  ensureUniqueIds(networks, 'id', 'networks');
  ensureUniqueIds(tradingPoints, 'id', 'tradingPoints');
  ensureUniqueIds(externalCodes, 'id', 'tradingPointExternalCodes');
  ensureRelations(networks, tradingPoints, externalCodes);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM trading_point_external_codes');
      await client.query('DELETE FROM trading_points');
      await client.query('DELETE FROM networks');
    }

    await upsertNetworks(client, networks);
    await upsertTradingPoints(client, tradingPoints);
    await upsertTradingPointExternalCodes(client, externalCodes);

    return getCounts(client);
  });

  console.log(`Загружено сетей: ${networks.length}`);
  console.log(`Загружено точек: ${tradingPoints.length}`);
  console.log(`Загружено внешних кодов: ${externalCodes.length}`);
  console.log(`Состояние БД: networks=${result.networks}, trading_points=${result.trading_points}, trading_point_external_codes=${result.trading_point_external_codes}`);
  console.log(`Режим загрузки: ${reset ? 'reset + upsert' : 'upsert'}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
