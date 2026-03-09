require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'nomenclature-export.json');

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

function ensureRelations(nomenclature, externalCodes) {
  const nomenclatureIds = new Set(nomenclature.map((item) => item.id));

  externalCodes.forEach((item) => {
    if (!nomenclatureIds.has(item.nomenclature_id)) {
      throw new Error(`Для внешнего кода ${item.id} не найдена номенклатура ${item.nomenclature_id}`);
    }
  });
}

async function upsertNomenclature(client, nomenclature) {
  for (const item of nomenclature) {
    await client.query(
      `INSERT INTO nomenclature (
         id,
         network_id,
         name,
         internal_code,
         network_api_code,
         network_api_settings,
         description,
         status,
         external_id,
         created_at,
         updated_at,
         created_by,
         updated_by,
         deleted_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7, $8, $9,
         $10::timestamptz, $11::timestamptz, $12, $13, $14::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET network_id = EXCLUDED.network_id,
           name = EXCLUDED.name,
           internal_code = EXCLUDED.internal_code,
           network_api_code = EXCLUDED.network_api_code,
           network_api_settings = EXCLUDED.network_api_settings,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           external_id = EXCLUDED.external_id,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           created_by = EXCLUDED.created_by,
           updated_by = EXCLUDED.updated_by,
           deleted_at = EXCLUDED.deleted_at`,
      [
        item.id,
        item.network_id,
        item.name,
        item.internal_code,
        item.network_api_code || null,
        JSON.stringify(item.network_api_settings || {}),
        item.description || '',
        item.status || 'active',
        item.external_id || null,
        item.created_at,
        item.updated_at || item.created_at,
        item.created_by || null,
        item.updated_by || null,
        item.deleted_at || null,
      ]
    );
  }
}

async function upsertExternalCodes(client, externalCodes) {
  for (const item of externalCodes) {
    await client.query(
      `INSERT INTO nomenclature_external_codes (
         id,
         nomenclature_id,
         system_type,
         external_code,
         description,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6::timestamptz, $7::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET nomenclature_id = EXCLUDED.nomenclature_id,
           system_type = EXCLUDED.system_type,
           external_code = EXCLUDED.external_code,
           description = EXCLUDED.description,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.nomenclature_id,
        item.system_type,
        item.external_code,
        item.description || '',
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM nomenclature) AS nomenclature,
       (SELECT COUNT(*)::int FROM nomenclature_external_codes) AS nomenclature_external_codes`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const nomenclature = Array.isArray(input.nomenclature) ? input.nomenclature : [];
  const nomenclatureExternalCodes = Array.isArray(input.nomenclatureExternalCodes)
    ? input.nomenclatureExternalCodes
    : [];

  ensureUniqueIds(nomenclature, 'id', 'nomenclature');
  ensureUniqueIds(nomenclatureExternalCodes, 'id', 'nomenclatureExternalCodes');
  ensureRelations(nomenclature, nomenclatureExternalCodes);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM nomenclature_external_codes');
      await client.query('DELETE FROM nomenclature');
    }

    await upsertNomenclature(client, nomenclature);
    await upsertExternalCodes(client, nomenclatureExternalCodes);

    return getCounts(client);
  });

  console.log(`Загружено номенклатуры: ${nomenclature.length}`);
  console.log(`Загружено внешних кодов: ${nomenclatureExternalCodes.length}`);
  console.log(`Состояние БД: nomenclature=${result.nomenclature}, nomenclature_external_codes=${result.nomenclature_external_codes}`);
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
