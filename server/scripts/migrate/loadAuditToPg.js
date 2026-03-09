require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'audit-export.json');

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

function toJson(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.stringify(value)
    : null;
}

async function upsertAuditLog(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO audit_log (
         id,
         timestamp,
         user_id,
         user_email,
         user_name,
         action,
         action_type,
         object,
         object_type,
         object_id,
         ip_address,
         user_agent,
         details,
         metadata,
         created_at
       ) VALUES (
         $1::uuid, $2::timestamptz, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET timestamp = EXCLUDED.timestamp,
           user_id = EXCLUDED.user_id,
           user_email = EXCLUDED.user_email,
           user_name = EXCLUDED.user_name,
           action = EXCLUDED.action,
           action_type = EXCLUDED.action_type,
           object = EXCLUDED.object,
           object_type = EXCLUDED.object_type,
           object_id = EXCLUDED.object_id,
           ip_address = EXCLUDED.ip_address,
           user_agent = EXCLUDED.user_agent,
           details = EXCLUDED.details,
           metadata = EXCLUDED.metadata,
           created_at = EXCLUDED.created_at`,
      [
        item.id,
        item.timestamp,
        item.user_id || null,
        item.user_email || '',
        item.user_name || null,
        item.action || '',
        item.action_type || '',
        item.object || null,
        item.object_type || null,
        item.object_id || null,
        item.ip_address || null,
        item.user_agent || null,
        toJson(item.details),
        toJson(item.metadata),
        item.created_at || item.timestamp,
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT (SELECT COUNT(*)::int FROM audit_log) AS audit_log`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const auditLog = Array.isArray(input.auditLog) ? input.auditLog : [];

  ensureUniqueIds(auditLog, 'id', 'auditLog');

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM audit_log');
    }

    await upsertAuditLog(client, auditLog);
    return getCounts(client);
  });

  console.log(`Загружено записей аудита: ${auditLog.length}`);
  console.log(`Состояние БД: audit_log=${result.audit_log}`);
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
