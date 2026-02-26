/**
 * Тестовый скрипт для проверки уведомлений о низком уровне топлива
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFuelLevelNotifications() {
  console.log('🧪 Начало тестирования уведомлений о низком уровне топлива\n');

  // 1. Проверяем правило уведомлений
  console.log('1️⃣ Проверка правила уведомлений...');
  const { data: rules, error: rulesError } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('type', 'low_fuel_level')
    .eq('is_active', true);

  if (rulesError) {
    console.error('❌ Ошибка получения правил:', rulesError);
    return;
  }

  if (!rules || rules.length === 0) {
    console.error('❌ Не найдено активных правил для low_fuel_level');
    return;
  }

  const rule = rules[0];
  console.log(`✅ Найдено правило: "${rule.name}"`);
  console.log(`   Тип: ${rule.type}`);
  console.log(`   Активно: ${rule.is_active}`);
  console.log(`   Расписание: ${rule.schedule_config?.cron}`);
  console.log(`   Каналы: ${rule.notification_config?.channels?.join(', ')}`);
  console.log(`   Последняя проверка: ${rule.last_check_at || 'никогда'}`);
  console.log(`   Последнее уведомление: ${rule.last_notification_at || 'никогда'}`);
  console.log(`   Всего отправлено: ${rule.total_notifications_sent || 0}\n`);

  // 2. Проверяем настройки порогов
  console.log('2️⃣ Проверка настроек порогов топлива...');
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, code, name, settings')
    .eq('type', 'network')
    .eq('is_active', true);

  if (tenantsError) {
    console.error('❌ Ошибка получения тенантов:', tenantsError);
    return;
  }

  console.log(`✅ Найдено сетей: ${tenants.length}\n`);

  for (const tenant of tenants) {
    console.log(`📍 Сеть: ${tenant.name} (${tenant.code})`);
    const stations = tenant.settings?.stations || [];

    for (const station of stations) {
      if (!station.active) continue;

      console.log(`   📌 Станция: ${station.name} (код: ${station.code})`);
      const fuelThresholds = station.fuelLevelThresholds?.thresholds || [];

      if (fuelThresholds.length > 0) {
        console.log(`   ⚙️  Пороги топлива:`);
        fuelThresholds.forEach(t => {
          console.log(`      - ${t.fuelType}: предупреждение ${t.levelWarning}%, критический ${t.levelCritical}%`);
        });
      } else {
        console.log(`   ⚠️  Пороги топлива не настроены!`);
      }
    }
    console.log('');
  }

  // 3. Проверяем настройки пользователей для получения уведомлений
  console.log('3️⃣ Проверка настроек уведомлений пользователей...');
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_notification_settings')
    .select('user_id, telegram_enabled, telegram_chat_id, telegram_username, email_enabled, email_address');

  if (settingsError) {
    console.error('❌ Ошибка получения настроек пользователей:', settingsError);
  } else {
    console.log(`✅ Найдено пользователей с настройками: ${userSettings.length}`);

    for (const settings of userSettings) {
      console.log(`   👤 Пользователь ID: ${settings.user_id}`);
      if (settings.telegram_enabled) {
        console.log(`      ✅ Telegram: включен (${settings.telegram_username || settings.telegram_chat_id})`);
      } else {
        console.log(`      ❌ Telegram: отключен`);
      }
      if (settings.email_enabled) {
        console.log(`      ✅ Email: включен (${settings.email_address})`);
      } else {
        console.log(`      ❌ Email: отключен`);
      }
    }
    console.log('');
  }

  // 4. Проверяем подписки пользователей на уведомления
  console.log('4️⃣ Проверка подписок пользователей на low_fuel_level...');
  const { data: subscriptions, error: subsError } = await supabase
    .from('user_notification_subscriptions')
    .select('user_id, notification_type, is_active')
    .eq('notification_type', 'low_fuel_level')
    .eq('is_active', true);

  if (subsError) {
    console.error('❌ Ошибка получения подписок:', subsError);
  } else {
    console.log(`✅ Активных подписок на low_fuel_level: ${subscriptions.length}`);
    if (subscriptions.length === 0) {
      console.warn(`⚠️  ВНИМАНИЕ: Нет активных подписок! Уведомления не будут отправлены.`);
      console.warn(`   Зайдите в настройки уведомлений и подпишитесь на "Низкий уровень топлива"`);
    }
    console.log('');
  }

  // 5. Проверяем последние уведомления
  console.log('5️⃣ Проверка последних уведомлений о низком уровне топлива...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, title, message, priority, status, created_at')
    .eq('type', 'low_fuel_level')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifError) {
    console.error('❌ Ошибка получения уведомлений:', notifError);
  } else {
    console.log(`✅ Последние уведомления (найдено: ${notifications.length}):\n`);

    if (notifications.length === 0) {
      console.log('   ℹ️  Уведомлений о низком уровне топлива пока не было\n');
    } else {
      notifications.forEach((notif, idx) => {
        console.log(`   ${idx + 1}. ${notif.title}`);
        console.log(`      ${notif.message}`);
        console.log(`      Приоритет: ${notif.priority}, Статус: ${notif.status}`);
        console.log(`      Создано: ${new Date(notif.created_at).toLocaleString('ru-RU')}\n`);
      });
    }
  }

  // 6. Рекомендации
  console.log('📋 РЕКОМЕНДАЦИИ:\n');
  console.log('1️⃣ Для тестирования смените пороги на более высокие значения (например, 50% и 30%)');
  console.log('2️⃣ Убедитесь, что вы подписаны на уведомления типа "Низкий уровень топлива"');
  console.log('3️⃣ Убедитесь, что Telegram бот привязан и настройки включены');
  console.log('4️⃣ Проверьте, что правило активно и расписание настроено');
  console.log('5️⃣ Для немедленной проверки измените cron на "*/1 * * * *" (каждую минуту)');
  console.log('6️⃣ Проверьте логи backend сервера: pm2 logs tradeframe-backend-proxy\n');
}

testFuelLevelNotifications()
  .then(() => {
    console.log('✅ Тестирование завершено');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка тестирования:', error);
    process.exit(1);
  });
