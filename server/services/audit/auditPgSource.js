const postgres = require('../../db/pool');

const {
  buildAuditStatistics,
  normalizeAuditLogEntry,
} = require('./auditTransforms');

function toJson(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.stringify(value)
    : null;
}

async function createAuditLog(input) {
  const timestamp = input.timestamp || new Date().toISOString();
  const { rows } = await postgres.query(
    `INSERT INTO audit_log (
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
       $1::timestamptz, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::timestamptz
     )
     RETURNING *`,
    [
      timestamp,
      input.user_id || null,
      input.user_email || '',
      input.user_name || null,
      input.action,
      input.action_type,
      input.object || null,
      input.object_type || null,
      input.object_id || null,
      input.ip_address || null,
      input.user_agent || null,
      toJson(input.details),
      toJson(input.metadata),
      input.created_at || timestamp,
    ]
  );

  return normalizeAuditLogEntry(rows[0]);
}

async function getAuditLogs(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.date_from) {
    params.push(filters.date_from);
    conditions.push(`timestamp >= $${params.length}::timestamptz`);
  }

  if (filters.date_to) {
    params.push(filters.date_to);
    conditions.push(`timestamp <= $${params.length}::timestamptz`);
  }

  if (filters.user_id) {
    params.push(filters.user_id);
    conditions.push(`user_id = $${params.length}::uuid`);
  }

  if (filters.user_email) {
    params.push(filters.user_email);
    conditions.push(`user_email = $${params.length}`);
  }

  if (filters.action_type && filters.action_type !== 'all') {
    params.push(filters.action_type);
    conditions.push(`action_type = $${params.length}`);
  }

  if (filters.object_type) {
    params.push(filters.object_type);
    conditions.push(`object_type = $${params.length}`);
  }

  if (filters.object_id) {
    params.push(filters.object_id);
    conditions.push(`object_id = $${params.length}`);
  }

  if (filters.search_query) {
    params.push(`%${String(filters.search_query).trim()}%`);
    const param = `$${params.length}`;
    conditions.push(`(
      action ILIKE ${param}
      OR COALESCE(object, '') ILIKE ${param}
      OR user_email ILIKE ${param}
      OR COALESCE(user_name, '') ILIKE ${param}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(Number(filters.limit || 100));
  const limitParam = params.length;
  params.push(Number(filters.offset || 0));
  const offsetParam = params.length;

  const { rows } = await postgres.query(
    `SELECT *
       FROM audit_log
       ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}`,
    params
  );

  return rows.map(normalizeAuditLogEntry);
}

async function getAuditLogById(id) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM audit_log
      WHERE id = $1::uuid
      LIMIT 1`,
    [id]
  );

  return normalizeAuditLogEntry(row);
}

async function getAuditLogStatistics() {
  return buildAuditStatistics(await getAuditLogs({ limit: 10000 }));
}

async function getRecentAuditLogs(limit = 10) {
  return getAuditLogs({ limit });
}

async function cleanOldAuditLogs(daysToKeep = 180) {
  const { rows } = await postgres.query(
    `DELETE FROM audit_log
      WHERE timestamp < now() - make_interval(days => $1::int)
      RETURNING id`,
    [Number(daysToKeep)]
  );

  return rows.length;
}

module.exports = {
  cleanOldAuditLogs,
  createAuditLog,
  getAuditLogById,
  getAuditLogStatistics,
  getAuditLogs,
  getRecentAuditLogs,
};
