require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'notifications-export.json');

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('не существует');
}

async function fetchAllRows(supabase, table, orderColumn, options = {}) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn)
      .range(from, from + pageSize - 1);

    if (error) {
      if (options.allowMissing && isMissingTableError(error)) {
        return [];
      }

      throw new Error(`Ошибка выгрузки ${table}: ${error.message}`);
    }

    if (!data?.length) {
      break;
    }

    rows.push(...data);
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL или SUPABASE_SERVICE_KEY не заданы');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [
    userNotificationSettings,
    userNotificationSubscriptions,
    roleNotificationSubscriptions,
    telegramLinkCodes,
    notificationRules,
    notifications,
    notificationDeliveryLog,
  ] = await Promise.all([
    fetchAllRows(supabase, 'user_notification_settings', 'user_id'),
    fetchAllRows(supabase, 'user_notification_subscriptions', 'created_at'),
    fetchAllRows(supabase, 'role_notification_subscriptions', 'created_at', { allowMissing: true }),
    fetchAllRows(supabase, 'telegram_link_codes', 'created_at', { allowMissing: true }),
    fetchAllRows(supabase, 'notification_rules', 'created_at'),
    fetchAllRows(supabase, 'notifications', 'created_at'),
    fetchAllRows(supabase, 'notification_delivery_log', 'created_at', { allowMissing: true }),
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    counts: {
      user_notification_settings: userNotificationSettings.length,
      user_notification_subscriptions: userNotificationSubscriptions.length,
      role_notification_subscriptions: roleNotificationSubscriptions.length,
      telegram_link_codes: telegramLinkCodes.length,
      notification_rules: notificationRules.length,
      notifications: notifications.length,
      notification_delivery_log: notificationDeliveryLog.length,
    },
    userNotificationSettings,
    userNotificationSubscriptions,
    roleNotificationSubscriptions,
    telegramLinkCodes,
    notificationRules,
    notifications,
    notificationDeliveryLog,
  }, null, 2));

  console.log(`Экспортировано настроек уведомлений: ${userNotificationSettings.length}`);
  console.log(`Экспортировано подписок пользователей: ${userNotificationSubscriptions.length}`);
  console.log(`Экспортировано подписок ролей: ${roleNotificationSubscriptions.length}`);
  console.log(`Экспортировано Telegram кодов: ${telegramLinkCodes.length}`);
  console.log(`Экспортировано правил уведомлений: ${notificationRules.length}`);
  console.log(`Экспортировано уведомлений: ${notifications.length}`);
  console.log(`Экспортировано delivery log: ${notificationDeliveryLog.length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
