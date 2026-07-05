let pgModule = null;
let pgLoadAttempted = false;
let pool = null;

function getPgModule() {
  if (!pgLoadAttempted) {
    pgLoadAttempted = true;
    try {
      pgModule = require('pg');
    } catch (error) {
      console.warn('[PostgreSQL] Пакет pg не найден, pg-слой отключен');
      pgModule = null;
    }
  }

  return pgModule;
}

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  const pg = getPgModule();
  if (!pg) {
    return null;
  }

  const { Pool } = pg;
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_MAX_POOL_SIZE || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000),
    // Зависший/тяжёлый SQL не должен держать соединение из пула (max=10) бесконечно
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30000),
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Pool error:', err.message);
  });

  return pool;
}

async function query(text, params = []) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('PostgreSQL не настроен');
  }
  return currentPool.query(text, params);
}

async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function withTransaction(fn) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('PostgreSQL не настроен');
  }

  const client = await currentPool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function checkConnection() {
  try {
    const currentPool = getPool();
    if (!currentPool) {
      return false;
    }

    const result = await currentPool.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch (error) {
    return false;
  }
}

async function closePool() {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;
  await currentPool.end();
}

module.exports = {
  getPool,
  query,
  queryOne,
  withTransaction,
  checkConnection,
  closePool,
};
