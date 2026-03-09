require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'notifications-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => item?.[key]).filter(Boolean));
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

async function fetchCounts(client) {
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

async function fetchIdSets(client) {
  const settings = await client.query('SELECT id FROM user_notification_settings');
  const userSubscriptions = await client.query('SELECT id FROM user_notification_subscriptions');
  const roleSubscriptions = await client.query('SELECT id FROM role_notification_subscriptions');
  const linkCodes = await client.query('SELECT id FROM telegram_link_codes');
  const rules = await client.query('SELECT id FROM notification_rules');
  const notifications = await client.query('SELECT id FROM notifications');
  const deliveryLog = await client.query('SELECT id FROM notification_delivery_log');

  return {
    userNotificationSettings: new Set(settings.rows.map((row) => row.id)),
    userNotificationSubscriptions: new Set(userSubscriptions.rows.map((row) => row.id)),
    roleNotificationSubscriptions: new Set(roleSubscriptions.rows.map((row) => row.id)),
    telegramLinkCodes: new Set(linkCodes.rows.map((row) => row.id)),
    notificationRules: new Set(rules.rows.map((row) => row.id)),
    notifications: new Set(notifications.rows.map((row) => row.id)),
    notificationDeliveryLog: new Set(deliveryLog.rows.map((row) => row.id)),
  };
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

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const errors = [];

    const countChecks = [
      ['user_notification_settings', userNotificationSettings.length, counts.user_notification_settings],
      ['user_notification_subscriptions', userNotificationSubscriptions.length, counts.user_notification_subscriptions],
      ['role_notification_subscriptions', roleNotificationSubscriptions.length, counts.role_notification_subscriptions],
      ['telegram_link_codes', telegramLinkCodes.length, counts.telegram_link_codes],
      ['notification_rules', notificationRules.length, counts.notification_rules],
      ['notifications', notifications.length, counts.notifications],
      ['notification_delivery_log', notificationDeliveryLog.length, counts.notification_delivery_log],
    ];

    countChecks.forEach(([label, sourceCount, targetCount]) => {
      if (sourceCount !== targetCount) {
        errors.push(`Count mismatch ${label}: source=${sourceCount} target=${targetCount}`);
      }
    });

    const checks = [
      ['user_notification_settings', buildIdSet(userNotificationSettings), idSets.userNotificationSettings],
      ['user_notification_subscriptions', buildIdSet(userNotificationSubscriptions), idSets.userNotificationSubscriptions],
      ['role_notification_subscriptions', buildIdSet(roleNotificationSubscriptions), idSets.roleNotificationSubscriptions],
      ['telegram_link_codes', buildIdSet(telegramLinkCodes), idSets.telegramLinkCodes],
      ['notification_rules', buildIdSet(notificationRules), idSets.notificationRules],
      ['notifications', buildIdSet(notifications), idSets.notifications],
      ['notification_delivery_log', buildIdSet(notificationDeliveryLog), idSets.notificationDeliveryLog],
    ];

    checks.forEach(([label, sourceIds, targetIds]) => {
      const missing = diffMissing(sourceIds, targetIds);
      const unexpected = diffUnexpected(sourceIds, targetIds);

      if (missing.length) {
        errors.push(`Отсутствуют ${label}: ${missing.slice(0, 10).join(', ')}`);
      }

      if (unexpected.length) {
        errors.push(`Лишние ${label} в БД: ${unexpected.slice(0, 10).join(', ')}`);
      }
    });

    console.log(
      `Source counts: user_notification_settings=${userNotificationSettings.length}, user_notification_subscriptions=${userNotificationSubscriptions.length}, role_notification_subscriptions=${roleNotificationSubscriptions.length}, telegram_link_codes=${telegramLinkCodes.length}, notification_rules=${notificationRules.length}, notifications=${notifications.length}, notification_delivery_log=${notificationDeliveryLog.length}`
    );
    console.log(
      `Database counts: user_notification_settings=${counts.user_notification_settings}, user_notification_subscriptions=${counts.user_notification_subscriptions}, role_notification_subscriptions=${counts.role_notification_subscriptions}, telegram_link_codes=${counts.telegram_link_codes}, notification_rules=${counts.notification_rules}, notifications=${counts.notifications}, notification_delivery_log=${counts.notification_delivery_log}`
    );

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация notifications-миграции прошла успешно');
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
