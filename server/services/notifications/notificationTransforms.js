function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function ensureTextArray(value, fallback = []) {
  const items = ensureArray(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

function normalizeUserName(row) {
  return row?.name || row?.full_name || row?.email || 'Пользователь';
}

function parseScopeValues(userRole) {
  const parsed = [];
  const rawScopeValue = userRole?.scope_value;

  if (Array.isArray(rawScopeValue)) {
    rawScopeValue.forEach((value) => parsed.push(String(value)));
  } else if (typeof rawScopeValue === 'string' && rawScopeValue.trim()) {
    try {
      const jsonValue = JSON.parse(rawScopeValue);
      if (Array.isArray(jsonValue)) {
        jsonValue.forEach((value) => parsed.push(String(value)));
      } else {
        parsed.push(String(rawScopeValue));
      }
    } catch {
      parsed.push(String(rawScopeValue));
    }
  } else if (rawScopeValue !== undefined && rawScopeValue !== null && rawScopeValue !== '') {
    parsed.push(String(rawScopeValue));
  }

  if (!parsed.length) {
    ensureArray(userRole?.role?.scope_values).forEach((value) => {
      parsed.push(String(value));
    });
  }

  return [...new Set(parsed.filter(Boolean))];
}

function normalizeNotificationRule(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: row.is_active !== false,
    rule_config: ensureObject(row.rule_config),
    schedule_config: ensureObject(row.schedule_config),
    notification_config: {
      channels: ensureTextArray(row.notification_config?.channels, ['telegram']),
      ...ensureObject(row.notification_config),
    },
    recipients: {
      roles: ensureTextArray(row.recipients?.roles),
      users: ensureTextArray(row.recipients?.users),
    },
    total_notifications_sent: Number(row.total_notifications_sent || 0),
  };
}

function normalizeNotification(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    channels: ensureTextArray(row.channels, ['telegram']),
    context: ensureObject(row.context),
    metadata: ensureObject(row.metadata || row.context),
  };
}

function normalizeUserNotificationSettings(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    telegram_verified: Boolean(row.telegram_verified),
    telegram_enabled: Boolean(row.telegram_enabled),
    email_verified: Boolean(row.email_verified),
    email_enabled: Boolean(row.email_enabled),
    dnd_enabled: Boolean(row.dnd_enabled),
  };
}

function normalizeUserNotificationSubscription(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    enabled: row.enabled !== false,
    channels: ensureTextArray(row.channels, ['telegram']),
    filters: ensureObject(row.filters),
  };
}

function normalizeRoleNotificationSubscription(row) {
  return normalizeUserNotificationSubscription(row);
}

function normalizeTelegramLinkCode(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    used: Boolean(row.used),
  };
}

function generateLinkCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let index = 0; index < 8; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  ensureArray,
  ensureObject,
  ensureTextArray,
  generateLinkCode,
  normalizeNotification,
  normalizeNotificationRule,
  normalizeRoleNotificationSubscription,
  normalizeTelegramLinkCode,
  normalizeUserName,
  normalizeUserNotificationSettings,
  normalizeUserNotificationSubscription,
  parseScopeValues,
};
