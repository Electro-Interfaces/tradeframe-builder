require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');
const { splitCalibrationSettings } = require('../../services/tankCalibration/tankCalibrationTransforms');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'tank-calibration-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureUniqueTankIds(items) {
  const seen = new Set();

  items.forEach((item) => {
    if (!item?.tank_id) {
      throw new Error('В tankCalibrationSettings найден элемент без tank_id');
    }

    if (seen.has(item.tank_id)) {
      throw new Error(`Найден дубликат tank_id: ${item.tank_id}`);
    }

    seen.add(item.tank_id);
  });
}

async function upsertSettings(client, items) {
  for (const item of items) {
    const record = splitCalibrationSettings(item);
    await client.query(
      `INSERT INTO tank_calibration_settings (
         tank_id,
         settings,
         calibration_status,
         last_calibration_date,
         created_at,
         updated_at
       ) VALUES (
         $1, $2::jsonb, $3, $4::timestamptz, $5::timestamptz, $6::timestamptz
       )
       ON CONFLICT (tank_id) DO UPDATE
       SET settings = EXCLUDED.settings,
           calibration_status = EXCLUDED.calibration_status,
           last_calibration_date = EXCLUDED.last_calibration_date,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        record.tank_id,
        JSON.stringify(record.settings || {}),
        record.calibration_status,
        record.last_calibration_date || null,
        record.created_at || new Date().toISOString(),
        record.updated_at || record.created_at || new Date().toISOString(),
      ]
    );
  }
}

async function getCount(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM tank_calibration_settings`
  );

  return rows[0].count;
}

async function main() {
  const input = readJson(inputPath);
  const items = Array.isArray(input.tankCalibrationSettings) ? input.tankCalibrationSettings : [];

  ensureUniqueTankIds(items);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const count = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM tank_calibration_settings');
    }

    await upsertSettings(client, items);
    return getCount(client);
  });

  console.log(`Загружено настроек калибровки: ${items.length}`);
  console.log(`Состояние БД: tank_calibration_settings=${count}`);
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
