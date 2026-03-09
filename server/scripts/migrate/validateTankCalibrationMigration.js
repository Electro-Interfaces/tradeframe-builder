require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'tank-calibration-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items) {
  return new Set(items.map((item) => item?.tank_id).filter(Boolean));
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

async function fetchCount(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM tank_calibration_settings`
  );

  return rows[0].count;
}

async function fetchTankIds(client) {
  const { rows } = await client.query('SELECT tank_id FROM tank_calibration_settings');
  return new Set(rows.map((row) => row.tank_id));
}

async function main() {
  const input = readJson(inputPath);
  const items = Array.isArray(input.tankCalibrationSettings) ? input.tankCalibrationSettings : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const sourceIds = buildIdSet(items);
    const targetIds = await fetchTankIds(client);
    const count = await fetchCount(client);
    const errors = [];

    if (count !== items.length) {
      errors.push(`Count mismatch tank_calibration_settings: source=${items.length} target=${count}`);
    }

    const missing = diffMissing(sourceIds, targetIds);
    const unexpected = diffUnexpected(sourceIds, targetIds);

    if (missing.length) {
      errors.push(`Отсутствуют tank_id: ${missing.slice(0, 10).join(', ')}`);
    }

    if (unexpected.length) {
      errors.push(`Лишние tank_id в БД: ${unexpected.slice(0, 10).join(', ')}`);
    }

    console.log(`Source count: ${items.length}`);
    console.log(`Database count: ${count}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация tank-calibration-миграции прошла успешно');
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
