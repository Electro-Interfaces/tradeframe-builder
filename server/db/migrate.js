require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getPool } = require('./pool');

const migrationsDir = path.join(__dirname, 'migrations');
const statusMode = process.argv.includes('--status');

function getMigrationFiles() {
  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function getChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename'
  );
  return new Map(rows.map((row) => [row.filename, row]));
}

async function printStatus(client) {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(client);

  if (files.length === 0) {
    console.log('SQL-миграции не найдены');
    return;
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const checksum = getChecksum(content);
    const appliedRow = applied.get(file);

    if (!appliedRow) {
      console.log(`[PENDING] ${file}`);
      continue;
    }

    if (appliedRow.checksum !== checksum) {
      console.log(`[CHANGED] ${file} applied_at=${appliedRow.applied_at.toISOString()}`);
      continue;
    }

    console.log(`[APPLIED] ${file} applied_at=${appliedRow.applied_at.toISOString()}`);
  }
}

async function applyMigrations(client) {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(client);

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const checksum = getChecksum(content);
    const appliedRow = applied.get(file);

    if (appliedRow) {
      if (appliedRow.checksum !== checksum) {
        throw new Error(`Миграция ${file} уже применена с другим checksum`);
      }
      console.log(`[SKIP] ${file}`);
      continue;
    }

    console.log(`[RUN ] ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(content);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [file, checksum]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Ошибка применения ${file}: ${error.message}`);
    }
  }

  console.log('Миграции применены');
}

async function main() {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан или pg недоступен');
  }

  const client = await pool.connect();
  try {
    await ensureSchemaMigrationsTable(client);
    if (statusMode) {
      await printStatus(client);
    } else {
      await applyMigrations(client);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
