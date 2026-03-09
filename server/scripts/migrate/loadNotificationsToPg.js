require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'notifications-export.json');

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

function ensureUniqueComposite(items, keys, label) {
  const seen = new Set();

  items.forEach((item) => {
    const signature = keys.map((key) => item?.[key]).join('::');
    if (signature.includes('undefined') || signature.includes('null')) {
      throw new Error(`В ${label} найден элемент без одного из полей ${keys.join(', ')}`);
    }

    if (seen.has(signature)) {
      throw new Error(`В ${label} найден дубликат ${signature}`);
    }

    seen.add(signature);
  });
}

function ensureRelations(notificationRules, notifications, notificationDeliveryLog) {
  const ruleIds = new Set(notificationRules.map((item) => item.id));
  const notificationIds = new Set(notifications.map((item) => item.id));

  notifications.forEach((item) => {
    if (item.rule_id && !ruleIds.has(item.rule_id)) {
      throw new Error(`Для уведомления ${item.id} не найдено правило ${item.rule_id}`);
    }
  });

  notificationDeliveryLog.forEach((item) => {
    if (!notificationIds.has(item.notification_id)) {
      throw new Error(`Для delivery log ${item.id} не найдено уведомление ${item.notification_id}`);
    }
  });
}

function toJson(value, fallback = {}) {
  return JSON.stringify(value && typeof value === 'object' ? value : fallback);
}

function toTextArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

async function upsertUserNotificationSettings(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO user_notification_settings (
         id,
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
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz, $14::timestamptz
       )
       ON CONFLICT (user_id) DO UPDATE
       SET id = EXCLUDED.id,
           email_enabled = EXCLUDED.email_enabled,
           email_address = EXCLUDED.email_address,
           email_verified = EXCLUDED.email_verified,
           telegram_chat_id = EXCLUDED.telegram_chat_id,
           telegram_username = EXCLUDED.telegram_username,
           telegram_verified = EXCLUDED.telegram_verified,
           telegram_enabled = EXCLUDED.telegram_enabled,
           dnd_enabled = EXCLUDED.dnd_enabled,
           dnd_start = EXCLUDED.dnd_start,
           dnd_end = EXCLUDED.dnd_end,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.user_id,
        Boolean(item.email_enabled),
        item.email_address || null,
        Boolean(item.email_verified),
        item.telegram_chat_id || null,
        item.telegram_username || null,
        Boolean(item.telegram_verified),
        Boolean(item.telegram_enabled),
        Boolean(item.dnd_enabled),
        item.dnd_start || null,
        item.dnd_end || null,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertUserNotificationSubscriptions(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO user_notification_subscriptions (
         id,
         user_id,
         notification_type,
         enabled,
         channels,
         filters,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5::text[], $6::jsonb, $7::timestamptz, $8::timestamptz
       )
       ON CONFLICT (user_id, notification_type) DO UPDATE
       SET id = EXCLUDED.id,
           enabled = EXCLUDED.enabled,
           channels = EXCLUDED.channels,
           filters = EXCLUDED.filters,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.user_id,
        item.notification_type,
        item.enabled !== false,
        toTextArray(item.channels, ['telegram']),
        toJson(item.filters),
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertRoleNotificationSubscriptions(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO role_notification_subscriptions (
         id,
         role_id,
         notification_type,
         enabled,
         channels,
         filters,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::bigint, $3, $4, $5::text[], $6::jsonb, $7::timestamptz, $8::timestamptz
       )
       ON CONFLICT (role_id, notification_type) DO UPDATE
       SET id = EXCLUDED.id,
           enabled = EXCLUDED.enabled,
           channels = EXCLUDED.channels,
           filters = EXCLUDED.filters,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.role_id,
        item.notification_type,
        item.enabled !== false,
        toTextArray(item.channels, ['telegram']),
        toJson(item.filters),
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertTelegramLinkCodes(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO telegram_link_codes (
         id,
         user_id,
         code,
         expires_at,
         used,
         used_at,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4::timestamptz, $5, $6::timestamptz, $7::timestamptz, $8::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           code = EXCLUDED.code,
           expires_at = EXCLUDED.expires_at,
           used = EXCLUDED.used,
           used_at = EXCLUDED.used_at,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.user_id,
        item.code,
        item.expires_at,
        Boolean(item.used),
        item.used_at || null,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertNotificationRules(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO notification_rules (
         id,
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
         created_by,
         last_check_at,
         last_notification_at,
         total_notifications_sent,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10::jsonb, $11::jsonb,
         $12::uuid, $13::timestamptz, $14::timestamptz, $15, $16::timestamptz, $17::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           type = EXCLUDED.type,
           is_active = EXCLUDED.is_active,
           rule_config = EXCLUDED.rule_config,
           schedule_type = EXCLUDED.schedule_type,
           schedule_config = EXCLUDED.schedule_config,
           notification_config = EXCLUDED.notification_config,
           recipients = EXCLUDED.recipients,
           created_by = EXCLUDED.created_by,
           last_check_at = EXCLUDED.last_check_at,
           last_notification_at = EXCLUDED.last_notification_at,
           total_notifications_sent = EXCLUDED.total_notifications_sent,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        String(item.tenant_id || ''),
        String(item.name || ''),
        String(item.description || ''),
        String(item.type || ''),
        item.is_active !== false,
        toJson(item.rule_config),
        String(item.schedule_type || 'cron'),
        toJson(item.schedule_config),
        toJson(item.notification_config),
        toJson(item.recipients, { roles: [], users: [] }),
        item.created_by || null,
        item.last_check_at || null,
        item.last_notification_at || null,
        Number(item.total_notifications_sent || 0),
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertNotifications(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO notifications (
         id,
         tenant_id,
         rule_id,
         type,
         title,
         message,
         priority,
         context,
         status,
         channels,
         sent_at,
         read_at,
         expires_at,
         archived_at,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8::jsonb, $9, $10::text[], $11::timestamptz,
         $12::timestamptz, $13::timestamptz, $14::timestamptz, $15::timestamptz, $16::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           rule_id = EXCLUDED.rule_id,
           type = EXCLUDED.type,
           title = EXCLUDED.title,
           message = EXCLUDED.message,
           priority = EXCLUDED.priority,
           context = EXCLUDED.context,
           status = EXCLUDED.status,
           channels = EXCLUDED.channels,
           sent_at = EXCLUDED.sent_at,
           read_at = EXCLUDED.read_at,
           expires_at = EXCLUDED.expires_at,
           archived_at = EXCLUDED.archived_at,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        String(item.tenant_id || ''),
        item.rule_id || null,
        String(item.type || ''),
        String(item.title || ''),
        String(item.message || ''),
        String(item.priority || 'medium'),
        toJson(item.context),
        String(item.status || 'pending'),
        toTextArray(item.channels, ['telegram']),
        item.sent_at || null,
        item.read_at || null,
        item.expires_at || null,
        item.archived_at || null,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertNotificationDeliveryLog(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO notification_delivery_log (
         id,
         notification_id,
         user_id,
         channel,
         status,
         sent_at,
         delivered_at,
         error_message,
         metadata,
         created_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9::jsonb, $10::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET notification_id = EXCLUDED.notification_id,
           user_id = EXCLUDED.user_id,
           channel = EXCLUDED.channel,
           status = EXCLUDED.status,
           sent_at = EXCLUDED.sent_at,
           delivered_at = EXCLUDED.delivered_at,
           error_message = EXCLUDED.error_message,
           metadata = EXCLUDED.metadata,
           created_at = EXCLUDED.created_at`,
      [
        item.id,
        item.notification_id,
        item.user_id || null,
        String(item.channel || ''),
        String(item.status || ''),
        item.sent_at,
        item.delivered_at || null,
        item.error_message || null,
        toJson(item.metadata),
        item.created_at || item.sent_at,
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM user_notification_settings) AS user_notification_settings,
       (SELECT COUNT(*)::int FROM user_notification_subscriptions) AS user_notification_subscriptions,
       (SELECT COUNT(*)::int FROM role_notification_subscriptions) AS role_notification_subscriptions,
       (SELECT COUNT(*)::int FROM telegram_link_codes) AS telegram_link_codes,
       (SELECT COUNT(*)::int FROM notification_rules) AS notification_rules,
       (SELECT COUNT(*)::int FROM notifications) AS notifications,
       (SELECT COUNT(*)::int FROM notification_delivery_log) AS notification_delivery_log`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const userNotificationSettings = Array.isArray(input.userNotificationSettings)
    ? input.userNotificationSettings
    : [];
  const userNotificationSubscriptions = Array.isArray(input.userNotificationSubscriptions)
    ? input.userNotificationSubscriptions
    : [];
  const roleNotificationSubscriptions = Array.isArray(input.roleNotificationSubscriptions)
    ? input.roleNotificationSubscriptions
    : [];
  const telegramLinkCodes = Array.isArray(input.telegramLinkCodes) ? input.telegramLinkCodes : [];
  const notificationRules = Array.isArray(input.notificationRules) ? input.notificationRules : [];
  const notifications = Array.isArray(input.notifications) ? input.notifications : [];
  const notificationDeliveryLog = Array.isArray(input.notificationDeliveryLog)
    ? input.notificationDeliveryLog
    : [];

  ensureUniqueIds(userNotificationSettings, 'id', 'userNotificationSettings');
  ensureUniqueIds(userNotificationSubscriptions, 'id', 'userNotificationSubscriptions');
  ensureUniqueIds(roleNotificationSubscriptions, 'id', 'roleNotificationSubscriptions');
  ensureUniqueIds(telegramLinkCodes, 'id', 'telegramLinkCodes');
  ensureUniqueIds(notificationRules, 'id', 'notificationRules');
  ensureUniqueIds(notifications, 'id', 'notifications');
  ensureUniqueIds(notificationDeliveryLog, 'id', 'notificationDeliveryLog');

  ensureUniqueComposite(userNotificationSettings, ['user_id'], 'userNotificationSettings');
  ensureUniqueComposite(
    userNotificationSubscriptions,
    ['user_id', 'notification_type'],
    'userNotificationSubscriptions'
  );
  ensureUniqueComposite(
    roleNotificationSubscriptions,
    ['role_id', 'notification_type'],
    'roleNotificationSubscriptions'
  );
  ensureUniqueComposite(telegramLinkCodes, ['code'], 'telegramLinkCodes');
  ensureRelations(notificationRules, notifications, notificationDeliveryLog);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM notification_delivery_log');
      await client.query('DELETE FROM notifications');
      await client.query('DELETE FROM notification_rules');
      await client.query('DELETE FROM telegram_link_codes');
      await client.query('DELETE FROM role_notification_subscriptions');
      await client.query('DELETE FROM user_notification_subscriptions');
      await client.query('DELETE FROM user_notification_settings');
    }

    await upsertUserNotificationSettings(client, userNotificationSettings);
    await upsertUserNotificationSubscriptions(client, userNotificationSubscriptions);
    await upsertRoleNotificationSubscriptions(client, roleNotificationSubscriptions);
    await upsertTelegramLinkCodes(client, telegramLinkCodes);
    await upsertNotificationRules(client, notificationRules);
    await upsertNotifications(client, notifications);
    await upsertNotificationDeliveryLog(client, notificationDeliveryLog);

    return getCounts(client);
  });

  console.log(`Загружено настроек уведомлений: ${userNotificationSettings.length}`);
  console.log(`Загружено подписок пользователей: ${userNotificationSubscriptions.length}`);
  console.log(`Загружено подписок ролей: ${roleNotificationSubscriptions.length}`);
  console.log(`Загружено Telegram кодов: ${telegramLinkCodes.length}`);
  console.log(`Загружено правил уведомлений: ${notificationRules.length}`);
  console.log(`Загружено уведомлений: ${notifications.length}`);
  console.log(`Загружено delivery log: ${notificationDeliveryLog.length}`);
  console.log(
    `Состояние БД: user_notification_settings=${result.user_notification_settings}, user_notification_subscriptions=${result.user_notification_subscriptions}, role_notification_subscriptions=${result.role_notification_subscriptions}, telegram_link_codes=${result.telegram_link_codes}, notification_rules=${result.notification_rules}, notifications=${result.notifications}, notification_delivery_log=${result.notification_delivery_log}`
  );
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
