require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'nomenclature-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => item?.[key]).filter(Boolean));
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

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
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

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM nomenclature) AS nomenclature,
       (SELECT COUNT(*)::int FROM nomenclature_external_codes) AS nomenclature_external_codes`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const nomenclatureResult = await client.query('SELECT id FROM nomenclature');
  const externalCodesResult = await client.query('SELECT id FROM nomenclature_external_codes');

  return {
    nomenclature: new Set(nomenclatureResult.rows.map((row) => row.id)),
    nomenclatureExternalCodes: new Set(externalCodesResult.rows.map((row) => row.id)),
  };
}

async function fetchExternalCodeCounts(client) {
  const { rows } = await client.query(
    `SELECT nomenclature_id, COUNT(*)::int AS count
       FROM nomenclature_external_codes
      GROUP BY nomenclature_id`
  );

  return new Map(rows.map((row) => [row.nomenclature_id, row.count]));
}

async function main() {
  const input = readJson(inputPath);
  const nomenclature = Array.isArray(input.nomenclature) ? input.nomenclature : [];
  const nomenclatureExternalCodes = Array.isArray(input.nomenclatureExternalCodes)
    ? input.nomenclatureExternalCodes
    : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const externalCodeCounts = await fetchExternalCodeCounts(client);
    const errors = [];

    if (counts.nomenclature !== nomenclature.length) {
      errors.push(`Count mismatch nomenclature: source=${nomenclature.length} target=${counts.nomenclature}`);
    }

    if (counts.nomenclature_external_codes !== nomenclatureExternalCodes.length) {
      errors.push(`Count mismatch nomenclature_external_codes: source=${nomenclatureExternalCodes.length} target=${counts.nomenclature_external_codes}`);
    }

    const sourceNomenclatureIds = buildIdSet(nomenclature);
    const sourceExternalCodeIds = buildIdSet(nomenclatureExternalCodes);

    const missingNomenclature = diffMissing(sourceNomenclatureIds, idSets.nomenclature);
    const missingExternalCodes = diffMissing(sourceExternalCodeIds, idSets.nomenclatureExternalCodes);
    const unexpectedNomenclature = diffUnexpected(sourceNomenclatureIds, idSets.nomenclature);
    const unexpectedExternalCodes = diffUnexpected(sourceExternalCodeIds, idSets.nomenclatureExternalCodes);

    if (missingNomenclature.length) {
      errors.push(`Отсутствуют nomenclature: ${missingNomenclature.slice(0, 10).join(', ')}`);
    }

    if (missingExternalCodes.length) {
      errors.push(`Отсутствуют nomenclature_external_codes: ${missingExternalCodes.slice(0, 10).join(', ')}`);
    }

    if (unexpectedNomenclature.length) {
      errors.push(`Лишние nomenclature в БД: ${unexpectedNomenclature.slice(0, 10).join(', ')}`);
    }

    if (unexpectedExternalCodes.length) {
      errors.push(`Лишние nomenclature_external_codes в БД: ${unexpectedExternalCodes.slice(0, 10).join(', ')}`);
    }

    const sourceExternalCodeCounts = buildCountMap(nomenclatureExternalCodes, 'nomenclature_id');
    pushMismatches(
      errors,
      'Несовпадение количества внешних кодов по номенклатуре',
      sourceExternalCodeCounts,
      externalCodeCounts
    );

    console.log(`Source counts: nomenclature=${nomenclature.length}, nomenclature_external_codes=${nomenclatureExternalCodes.length}`);
    console.log(`Database counts: nomenclature=${counts.nomenclature}, nomenclature_external_codes=${counts.nomenclature_external_codes}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация nomenclature-миграции прошла успешно');
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
