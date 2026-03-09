require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'audit-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT (SELECT COUNT(*)::int FROM audit_log) AS audit_log`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const logs = await client.query('SELECT id FROM audit_log');

  return {
    auditLog: new Set(logs.rows.map((row) => row.id)),
  };
}

async function main() {
  const input = readJson(inputPath);
  const auditLog = Array.isArray(input.auditLog) ? input.auditLog : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const errors = [];

    if (counts.audit_log !== auditLog.length) {
      errors.push(`Count mismatch audit_log: source=${auditLog.length} target=${counts.audit_log}`);
    }

    const sourceIds = buildIdSet(auditLog);
    const missing = diffMissing(sourceIds, idSets.auditLog);
    const unexpected = diffUnexpected(sourceIds, idSets.auditLog);

    if (missing.length) {
      errors.push(`Отсутствуют audit_log: ${missing.slice(0, 10).join(', ')}`);
    }

    if (unexpected.length) {
      errors.push(`Лишние audit_log в БД: ${unexpected.slice(0, 10).join(', ')}`);
    }

    console.log(`Source counts: audit_log=${auditLog.length}`);
    console.log(`Database counts: audit_log=${counts.audit_log}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация audit-миграции прошла успешно');
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
