const postgres = require('../../db/pool');

const { ensureObject } = require('./notificationTransforms');

function toJson(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.stringify(value)
    : JSON.stringify({});
}

function dedupeRecipients(recipients) {
  const seen = new Set();
  return recipients.filter((recipient) => {
    const key = String(recipient.id || '');
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function getActiveRules(ruleType) {
  const params = [];
  let whereClause = 'WHERE is_active = true';

  if (ruleType) {
    params.push(String(ruleType));
    whereClause += ` AND type = $${params.length}`;
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM notification_rules
       ${whereClause}`,
    params
  );

  return rows;
}

async function touchRuleCheck(ruleId) {
  await postgres.query(
    `UPDATE notification_rules
        SET last_check_at = now(),
            updated_at = now()
      WHERE id = $1::uuid`,
    [ruleId]
  );
}

async function findRecentNotification(notificationType, identifiers) {
  const params = [String(notificationType)];
  const conditions = ['type = $1'];

  Object.entries(identifiers || {}).forEach(([key, value]) => {
    params.push(String(value));
    conditions.push(`context ->> '${key}' = $${params.length}`);
  });

  return postgres.queryOne(
    `SELECT *
       FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 1`,
    params
  );
}

async function createNotification(notification) {
  const { rows } = await postgres.query(
    `INSERT INTO notifications (
       tenant_id,
       rule_id,
       type,
       title,
       message,
       priority,
       context,
       status,
       channels
     ) VALUES (
       $1, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8, $9::text[]
     )
     RETURNING *`,
    [
      String(notification.tenant_id || ''),
      notification.rule_id || null,
      String(notification.type || ''),
      String(notification.title || ''),
      String(notification.message || ''),
      String(notification.priority || 'medium'),
      JSON.stringify(ensureObject(notification.context)),
      String(notification.status || 'pending'),
      Array.isArray(notification.channels) && notification.channels.length
        ? notification.channels
        : ['telegram'],
    ]
  );

  return rows[0];
}

async function markNotificationSent(notificationId) {
  await postgres.query(
    `UPDATE notifications
        SET status = 'sent',
            sent_at = now(),
            updated_at = now()
      WHERE id = $1::uuid`,
    [notificationId]
  );
}

async function incrementRuleNotifications(ruleId, count) {
  await postgres.query(
    `UPDATE notification_rules
        SET last_notification_at = now(),
            total_notifications_sent = COALESCE(total_notifications_sent, 0) + $2,
            updated_at = now()
      WHERE id = $1::uuid`,
    [ruleId, Number(count || 0)]
  );
}

async function loadUsersByIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT id, name
       FROM users
      WHERE id = ANY($1::uuid[])
        AND deleted_at IS NULL
        AND status = 'active'`,
    [userIds]
  );

  return rows;
}

async function loadSettingsByUserIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM user_notification_settings
      WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  );

  return rows;
}

async function loadSubscriptionsByUserIds(userIds, notificationType) {
  if (!userIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT user_id, enabled
       FROM user_notification_subscriptions
      WHERE user_id = ANY($1::uuid[])
        AND notification_type = $2`,
    [userIds, String(notificationType)]
  );

  return rows;
}

async function getRecipients(rule, notificationType) {
  const recipients = ensureObject(rule.recipients) || {};
  const hasExplicitRecipients = (Array.isArray(recipients.roles) && recipients.roles.length > 0)
    || (Array.isArray(recipients.users) && recipients.users.length > 0);

  let userIds = [];

  if (!hasExplicitRecipients) {
    const { rows: settingsRows } = await postgres.query(
      `SELECT *
         FROM user_notification_settings
        WHERE telegram_enabled = true`
    );

    userIds = settingsRows.map((row) => row.user_id).filter(Boolean);
    const users = await loadUsersByIds(userIds);
    const settingsByUserId = new Map(settingsRows.map((row) => [row.user_id, row]));
    const subscriptions = await loadSubscriptionsByUserIds(users.map((user) => user.id), notificationType);
    const subscriptionsByUserId = new Map(subscriptions.map((row) => [row.user_id, row]));

    return users
      .filter((user) => subscriptionsByUserId.get(user.id)?.enabled !== false)
      .map((user) => ({
        id: user.id,
        full_name: user.name,
        settings: settingsByUserId.get(user.id) || null,
      }));
  }

  if (Array.isArray(recipients.roles) && recipients.roles.length > 0) {
    const { rows: roles } = await postgres.query(
      `SELECT id
         FROM roles
        WHERE name = ANY($1::text[])
          AND deleted_at IS NULL
          AND is_active = true`,
      [recipients.roles.map((role) => String(role))]
    );

    if (roles.length > 0) {
      const { rows: roleUsers } = await postgres.query(
        `SELECT DISTINCT user_id
           FROM user_roles
          WHERE role_id = ANY($1::uuid[])
            AND deleted_at IS NULL
            AND is_active = true`,
        [roles.map((role) => role.id)]
      );

      userIds.push(...roleUsers.map((row) => row.user_id).filter(Boolean));
    }
  }

  if (Array.isArray(recipients.users) && recipients.users.length > 0) {
    userIds.push(...recipients.users.map((value) => String(value)));
  }

  userIds = [...new Set(userIds)];
  const users = await loadUsersByIds(userIds);
  const settingsRows = await loadSettingsByUserIds(users.map((user) => user.id));
  const subscriptions = await loadSubscriptionsByUserIds(users.map((user) => user.id), notificationType);
  const settingsByUserId = new Map(settingsRows.map((row) => [row.user_id, row]));
  const subscriptionsByUserId = new Map(subscriptions.map((row) => [row.user_id, row]));

  return dedupeRecipients(
    users
      .filter((user) => subscriptionsByUserId.get(user.id)?.enabled !== false)
      .map((user) => ({
        id: user.id,
        full_name: user.name,
        settings: settingsByUserId.get(user.id) || null,
      }))
  );
}

async function createDeliveryLog(entry) {
  await postgres.query(
    `INSERT INTO notification_delivery_log (
       notification_id,
       user_id,
       channel,
       status,
       sent_at,
       delivered_at,
       error_message,
       metadata
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8::jsonb
     )`,
    [
      entry.notification_id,
      entry.user_id || null,
      entry.channel,
      entry.status,
      entry.sent_at || new Date().toISOString(),
      entry.delivered_at || null,
      entry.error_message || null,
      toJson(entry.metadata),
    ]
  );
}

module.exports = {
  createDeliveryLog,
  createNotification,
  findRecentNotification,
  getActiveRules,
  getRecipients,
  incrementRuleNotifications,
  markNotificationSent,
  touchRuleCheck,
};
