const postgres = require('../../db/pool');
const {
  ensureObject,
  generateLinkCode,
  normalizeNotification,
  normalizeNotificationRule,
  normalizeRoleNotificationSubscription,
  normalizeTelegramLinkCode,
  normalizeUserNotificationSettings,
  normalizeUserNotificationSubscription,
} = require('./notificationTransforms');

async function getNotificationRules(tenantId) {
  const { rows } = await postgres.query(
    `SELECT *
       FROM notification_rules
      WHERE tenant_id = $1
      ORDER BY created_at DESC`,
    [tenantId]
  );

  return rows.map(normalizeNotificationRule);
}

async function getNotificationRule(ruleId) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM notification_rules
      WHERE id = $1
      LIMIT 1`,
    [ruleId]
  );

  return normalizeNotificationRule(row);
}

async function createNotificationRule(rule) {
  const { rows } = await postgres.query(
    `INSERT INTO notification_rules (
       tenant_id,
       name,
       description,
       type,
       is_active,
       rule_config,
       schedule_type,
       schedule_config,
       notification_config,
       recipients,
       created_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::uuid
     )
     RETURNING *`,
    [
      String(rule.tenant_id || ''),
      String(rule.name || ''),
      String(rule.description || ''),
      String(rule.type || ''),
      rule.is_active !== false,
      JSON.stringify(ensureObject(rule.rule_config)),
      String(rule.schedule_type || 'cron'),
      JSON.stringify(ensureObject(rule.schedule_config)),
      JSON.stringify(ensureObject(rule.notification_config)),
      JSON.stringify(ensureObject(rule.recipients)),
      rule.created_by || null,
    ]
  );

  return normalizeNotificationRule(rows[0]);
}

async function updateNotificationRule(ruleId, updates) {
  const current = await getNotificationRule(ruleId);
  if (!current) {
    throw new Error('Правило уведомления не найдено');
  }

  const nextRule = {
    ...current,
    ...updates,
    rule_config: updates.rule_config !== undefined ? ensureObject(updates.rule_config) : ensureObject(current.rule_config),
    schedule_config: updates.schedule_config !== undefined ? ensureObject(updates.schedule_config) : ensureObject(current.schedule_config),
    notification_config: updates.notification_config !== undefined
      ? ensureObject(updates.notification_config)
      : ensureObject(current.notification_config),
    recipients: updates.recipients !== undefined ? ensureObject(updates.recipients) : ensureObject(current.recipients),
  };

  const { rows } = await postgres.query(
    `UPDATE notification_rules
        SET tenant_id = $2,
            name = $3,
            description = $4,
            type = $5,
            is_active = $6,
            rule_config = $7::jsonb,
            schedule_type = $8,
            schedule_config = $9::jsonb,
            notification_config = $10::jsonb,
            recipients = $11::jsonb,
            created_by = $12::uuid,
            last_check_at = $13::timestamptz,
            last_notification_at = $14::timestamptz,
            total_notifications_sent = $15,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [
      ruleId,
      String(nextRule.tenant_id || ''),
      String(nextRule.name || ''),
      String(nextRule.description || ''),
      String(nextRule.type || ''),
      nextRule.is_active !== false,
      JSON.stringify(ensureObject(nextRule.rule_config)),
      String(nextRule.schedule_type || 'cron'),
      JSON.stringify(ensureObject(nextRule.schedule_config)),
      JSON.stringify(ensureObject(nextRule.notification_config)),
      JSON.stringify(ensureObject(nextRule.recipients)),
      nextRule.created_by || null,
      nextRule.last_check_at || null,
      nextRule.last_notification_at || null,
      Number(nextRule.total_notifications_sent || 0),
    ]
  );

  return normalizeNotificationRule(rows[0]);
}

async function deleteNotificationRule(ruleId) {
  await postgres.query(
    `DELETE FROM notification_rules
      WHERE id = $1`,
    [ruleId]
  );
}

async function getNotifications(tenantId, options = {}) {
  const params = [tenantId];
  const conditions = ['tenant_id = $1'];

  if (options.status) {
    params.push(String(options.status));
    conditions.push(`status = $${params.length}`);
  }

  params.push(Number(options.limit || 100));
  const limitParam = params.length;
  params.push(Number(options.offset || 0));
  const offsetParam = params.length;

  const { rows } = await postgres.query(
    `SELECT *
       FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}`,
    params
  );

  return rows.map(normalizeNotification);
}

async function markNotificationAsRead(notificationId) {
  const { rows } = await postgres.query(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, now()),
            status = 'read',
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [notificationId]
  );

  return normalizeNotification(rows[0]);
}

async function getUserNotificationSettings(userId) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM user_notification_settings
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );

  return normalizeUserNotificationSettings(row);
}

async function saveUserNotificationSettings(userId, settings) {
  const current = await getUserNotificationSettings(userId);
  const nextSettings = {
    ...current,
    ...settings,
    user_id: userId,
  };

  const { rows } = await postgres.query(
    `INSERT INTO user_notification_settings (
       user_id,
       email_enabled,
       email_address,
       email_verified,
       telegram_chat_id,
       telegram_username,
       telegram_verified,
       telegram_enabled,
       dnd_enabled,
       dnd_start,
       dnd_end,
       created_at,
       updated_at
     ) VALUES (
       $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
       COALESCE($12::timestamptz, now()), now()
     )
     ON CONFLICT (user_id) DO UPDATE
     SET email_enabled = EXCLUDED.email_enabled,
         email_address = EXCLUDED.email_address,
         email_verified = EXCLUDED.email_verified,
         telegram_chat_id = EXCLUDED.telegram_chat_id,
         telegram_username = EXCLUDED.telegram_username,
         telegram_verified = EXCLUDED.telegram_verified,
         telegram_enabled = EXCLUDED.telegram_enabled,
         dnd_enabled = EXCLUDED.dnd_enabled,
         dnd_start = EXCLUDED.dnd_start,
         dnd_end = EXCLUDED.dnd_end,
         updated_at = now()
     RETURNING *`,
    [
      userId,
      Boolean(nextSettings.email_enabled),
      nextSettings.email_address || null,
      Boolean(nextSettings.email_verified),
      nextSettings.telegram_chat_id || null,
      nextSettings.telegram_username || null,
      Boolean(nextSettings.telegram_verified),
      Boolean(nextSettings.telegram_enabled),
      Boolean(nextSettings.dnd_enabled),
      nextSettings.dnd_start || null,
      nextSettings.dnd_end || null,
      nextSettings.created_at || null,
    ]
  );

  return normalizeUserNotificationSettings(rows[0]);
}

async function getUserNotificationSubscriptions(userId) {
  const { rows } = await postgres.query(
    `SELECT *
       FROM user_notification_subscriptions
      WHERE user_id = $1
      ORDER BY notification_type`,
    [userId]
  );

  return rows.map(normalizeUserNotificationSubscription);
}

async function saveUserNotificationSubscription(userId, notificationType, subscription) {
  const current = (await getUserNotificationSubscriptions(userId))
    .find((item) => item.notification_type === notificationType);
  const nextSubscription = {
    ...current,
    ...subscription,
  };

  const { rows } = await postgres.query(
    `INSERT INTO user_notification_subscriptions (
       user_id,
       notification_type,
       enabled,
       channels,
       filters,
       created_at,
       updated_at
     ) VALUES (
       $1::uuid, $2, $3, $4::text[], $5::jsonb, COALESCE($6::timestamptz, now()), now()
     )
     ON CONFLICT (user_id, notification_type) DO UPDATE
     SET enabled = EXCLUDED.enabled,
         channels = EXCLUDED.channels,
         filters = EXCLUDED.filters,
         updated_at = now()
     RETURNING *`,
    [
      userId,
      String(notificationType),
      nextSubscription.enabled !== false,
      nextSubscription.channels && nextSubscription.channels.length
        ? nextSubscription.channels
        : ['telegram'],
      JSON.stringify(ensureObject(nextSubscription.filters)),
      nextSubscription.created_at || null,
    ]
  );

  return normalizeUserNotificationSubscription(rows[0]);
}

async function getRoleNotificationSubscriptions(roleId) {
  const { rows } = await postgres.query(
    `SELECT *
       FROM role_notification_subscriptions
      WHERE role_id = $1
      ORDER BY notification_type`,
    [roleId]
  );

  return rows.map(normalizeRoleNotificationSubscription);
}

async function generateTelegramLinkCode(userId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateLinkCode();
    const result = await postgres.query(
      `INSERT INTO telegram_link_codes (
         user_id,
         code,
         expires_at,
         used,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2, $3::timestamptz, false, now(), now()
       )
       ON CONFLICT (code) DO NOTHING
       RETURNING *`,
      [userId, code, expiresAt]
    );

    if (result.rows[0]) {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TradeControlDW_Bot';
      return {
        linkCode: result.rows[0].code,
        telegramLink: `https://t.me/${botUsername}?start=${result.rows[0].code}`,
        expiresAt: result.rows[0].expires_at,
      };
    }
  }

  throw new Error('Не удалось сгенерировать код привязки Telegram');
}

async function findTelegramLinkCode(code) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM telegram_link_codes
      WHERE code = $1
      LIMIT 1`,
    [code]
  );

  return normalizeTelegramLinkCode(row);
}

async function markTelegramLinkCodeUsed(linkCodeId) {
  const { rows } = await postgres.query(
    `UPDATE telegram_link_codes
        SET used = true,
            used_at = COALESCE(used_at, now()),
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [linkCodeId]
  );

  return normalizeTelegramLinkCode(rows[0]);
}

async function saveTelegramBinding(userId, binding) {
  return saveUserNotificationSettings(userId, {
    telegram_chat_id: binding.telegram_chat_id || null,
    telegram_username: binding.telegram_username || null,
    telegram_verified: binding.telegram_verified !== false,
    telegram_enabled: binding.telegram_enabled !== false,
  });
}

async function getUserById(userId) {
  return postgres.queryOne(
    `SELECT id, email, name
       FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1`,
    [userId]
  );
}

async function getUserByTelegramChatId(chatId) {
  const row = await postgres.queryOne(
    `SELECT
       s.*,
       u.id AS user_id,
       u.email,
       u.name
     FROM user_notification_settings s
     INNER JOIN users u
       ON u.id = s.user_id
      AND u.deleted_at IS NULL
     WHERE s.telegram_chat_id = $1
       AND s.telegram_verified = true
     LIMIT 1`,
    [String(chatId)]
  );

  if (!row) {
    return null;
  }

  return {
    settings: normalizeUserNotificationSettings(row),
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
    },
  };
}

async function unlinkTelegramByChatId(chatId) {
  const { rows } = await postgres.query(
    `UPDATE user_notification_settings
        SET telegram_chat_id = null,
            telegram_verified = false,
            telegram_username = null,
            updated_at = now()
      WHERE telegram_chat_id = $1
      RETURNING *`,
    [String(chatId)]
  );

  return normalizeUserNotificationSettings(rows[0]);
}

module.exports = {
  createNotificationRule,
  deleteNotificationRule,
  findTelegramLinkCode,
  generateTelegramLinkCode,
  getNotificationRule,
  getNotificationRules,
  getNotifications,
  getRoleNotificationSubscriptions,
  getUserById,
  getUserByTelegramChatId,
  getUserNotificationSettings,
  getUserNotificationSubscriptions,
  markNotificationAsRead,
  markTelegramLinkCodeUsed,
  saveTelegramBinding,
  saveUserNotificationSettings,
  saveUserNotificationSubscription,
  unlinkTelegramByChatId,
  updateNotificationRule,
};
