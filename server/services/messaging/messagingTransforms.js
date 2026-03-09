const {
  ensureArray,
  ensureObject,
  ensureTextArray,
  normalizeUserName,
  parseScopeValues,
} = require('../notifications/notificationTransforms');

function normalizeMessageAuthor(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email || '',
    name: normalizeUserName(row),
  };
}

function normalizeMessageRecipient(row, user) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    retry_count: Number(row.retry_count || 0),
    user: user ? normalizeMessageAuthor(user) : row.user || undefined,
  };
}

function normalizeMessage(row, author, recipients = []) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    channels: ensureTextArray(row.channels, ['telegram', 'email']),
    recipient_filter: ensureObject(row.recipient_filter),
    metadata: ensureObject(row.metadata),
    total_recipients: Number(row.total_recipients || 0),
    sent_count: Number(row.sent_count || 0),
    delivered_count: Number(row.delivered_count || 0),
    failed_count: Number(row.failed_count || 0),
    read_count: Number(row.read_count || 0),
    author: author ? normalizeMessageAuthor(author) : row.author || undefined,
    recipients,
  };
}

function buildUserContext(user, settings, roles) {
  return {
    ...user,
    roles: ensureArray(roles),
    settings: settings || null,
  };
}

function matchesRoleFilter(userRoles, roleIds) {
  const targetRoleIds = new Set(ensureArray(roleIds).map((item) => String(item)));
  if (!targetRoleIds.size) {
    return false;
  }

  return userRoles.some((userRole) => {
    const roleId = userRole?.role?.id ?? userRole?.role_id;
    return targetRoleIds.has(String(roleId));
  });
}

function matchesNetworkFilter(userRoles, networkIds) {
  const targetNetworkIds = new Set(ensureArray(networkIds).map((item) => String(item)));
  if (!targetNetworkIds.size) {
    return false;
  }

  return userRoles.some((userRole) => {
    const scope = userRole?.role?.scope || userRole?.scope || 'global';
    if (scope === 'global') {
      return true;
    }

    if (scope !== 'network') {
      return false;
    }

    return parseScopeValues(userRole).some((value) => targetNetworkIds.has(String(value)));
  });
}

function matchesTradingPointFilter(userRoles, tradingPointIds) {
  const targetPointIds = new Set(ensureArray(tradingPointIds).map((item) => String(item)));
  if (!targetPointIds.size) {
    return false;
  }

  return userRoles.some((userRole) => {
    const scope = userRole?.role?.scope || userRole?.scope || 'global';
    if (scope === 'global') {
      return true;
    }

    if (scope !== 'trading_point' && scope !== 'assigned') {
      return false;
    }

    return parseScopeValues(userRole).some((value) => targetPointIds.has(String(value)));
  });
}

function filterUsersForMessage(users, message) {
  const recipientType = String(message?.recipient_type || 'all');
  const recipientFilter = ensureObject(message?.recipient_filter);

  switch (recipientType) {
    case 'users': {
      const userIds = new Set(ensureArray(recipientFilter.user_ids).map((item) => String(item)));
      return users.filter((user) => userIds.has(String(user.id)));
    }
    case 'roles':
      return users.filter((user) => matchesRoleFilter(user.roles, recipientFilter.role_ids));
    case 'networks':
      return users.filter((user) => matchesNetworkFilter(user.roles, recipientFilter.network_ids));
    case 'trading_points':
      return users.filter((user) => matchesTradingPointFilter(user.roles, recipientFilter.trading_point_ids));
    case 'all':
    default:
      return users;
  }
}

function normalizeRecipientCandidate(user) {
  const settings = user.settings || {};

  return {
    id: user.id,
    email: user.email || '',
    name: normalizeUserName(user),
    telegram_chat_id: settings.telegram_chat_id || null,
    telegram_verified: Boolean(settings.telegram_verified),
    telegram_enabled: Boolean(settings.telegram_enabled),
    email_enabled: Boolean(settings.email_enabled),
    email_address: settings.email_address || null,
  };
}

function buildMessageStats(recipients) {
  const rows = ensureArray(recipients);

  return {
    total: rows.length,
    pending: rows.filter((item) => item.delivery_status === 'pending').length,
    sent: rows.filter((item) => item.delivery_status === 'sent').length,
    delivered: rows.filter((item) => item.delivery_status === 'delivered').length,
    failed: rows.filter((item) => item.delivery_status === 'failed').length,
    read: rows.filter((item) => item.delivery_status === 'read').length,
    by_channel: {
      telegram: rows.filter((item) => item.channel === 'telegram').length,
      email: rows.filter((item) => item.channel === 'email').length,
    },
  };
}

module.exports = {
  buildMessageStats,
  buildUserContext,
  filterUsersForMessage,
  normalizeMessage,
  normalizeMessageAuthor,
  normalizeMessageRecipient,
  normalizeRecipientCandidate,
};
