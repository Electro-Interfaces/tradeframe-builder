function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

function normalizeAuditLogEntry(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    timestamp: row.timestamp,
    user_id: row.user_id || null,
    user_email: row.user_email || '',
    user_name: row.user_name || undefined,
    action: row.action || '',
    action_type: row.action_type || '',
    object: row.object || undefined,
    object_type: row.object_type || undefined,
    object_id: row.object_id || undefined,
    ip_address: row.ip_address || undefined,
    user_agent: row.user_agent || undefined,
    details: ensureObject(row.details),
    metadata: ensureObject(row.metadata),
    created_at: row.created_at || row.timestamp,
  };
}

function buildAuditStatistics(logs) {
  const rows = Array.isArray(logs) ? logs : [];
  const eventsByType = {};
  const userEventsMap = new Map();
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;

  let recentEvents = 0;
  let failedOperations = 0;

  rows.forEach((row) => {
    const log = normalizeAuditLogEntry(row);
    if (!log) {
      return;
    }

    eventsByType[log.action_type] = (eventsByType[log.action_type] || 0) + 1;

    const userKey = log.user_email || log.user_id || 'unknown';
    if (!userEventsMap.has(userKey)) {
      userEventsMap.set(userKey, {
        user_id: log.user_id || '',
        user_email: log.user_email || '',
        user_name: log.user_name,
        count: 0,
      });
    }
    userEventsMap.get(userKey).count += 1;

    if (Date.parse(log.timestamp) > yesterday) {
      recentEvents += 1;
    }

    if (log.details?.success === false) {
      failedOperations += 1;
    }
  });

  return {
    total_events: rows.length,
    events_by_type: eventsByType,
    events_by_user: [...userEventsMap.values()].sort((left, right) => right.count - left.count),
    recent_events: recentEvents,
    failed_operations: failedOperations,
  };
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('не существует');
}

function createMissingTableError() {
  const error = new Error('Таблица audit_log не создана');
  error.status = 404;
  error.code = '42P01';
  return error;
}

module.exports = {
  buildAuditStatistics,
  createMissingTableError,
  ensureObject,
  isMissingTableError,
  normalizeAuditLogEntry,
};
