/**
 * Тестовый скрипт для проверки системы уведомлений о купюроприемниках
 * Запуск: node server/test-bill-acceptor-notifications.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function testBillAcceptorNotifications() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🧪 Тестирование системы уведомлений о купюроприемниках\n');

  // 1. Проверка данных тенантов
  console.log('1️⃣ Проверка данных тенантов...');
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, code, name, settings')
    .eq('type', 'network')
    .eq('is_active', true);

  if (tenantsError) {
    console.error('❌ Ошибка получения тенантов:', tenantsError);
    return;
  }

  console.log(`✅ Найдено тенантов: ${tenants.length}`);

  const stations = [];
  for (const tenant of tenants) {
    const tenantStations = tenant.settings?.stations || [];
    console.log(`   📍 Тенант "${tenant.name}" (${tenant.code}): ${tenantStations.length} станций`);

    for (const station of tenantStations) {
      if (station.active !== false) {
        const stationData = {
          id: `${tenant.id}_${station.code}`,
          tenant_id: tenant.id,
          code: station.code,
          name: station.name,
          bill_acceptor_count: station.billAcceptorCount || 0,
          bill_acceptor_amount: station.billAcceptorAmount || 0,
          thresholds: station.billAcceptorThresholds || {}
        };
        stations.push(stationData);

        console.log(`      - ${station.name} (код: ${station.code})`);
        console.log(`        Купюр: ${stationData.bill_acceptor_count}`);
        console.log(`        Пороги: warning=${stationData.thresholds.billCountWarning}, critical=${stationData.thresholds.billCountCritical}`);

        // Проверка превышения порогов
        if (stationData.bill_acceptor_count >= stationData.thresholds.billCountCritical) {
          console.log(`        🔴 КРИТИЧЕСКИЙ ПОРОГ ПРЕВЫШЕН!`);
        } else if (stationData.bill_acceptor_count >= stationData.thresholds.billCountWarning) {
          console.log(`        🟡 Предупреждающий порог превышен`);
        } else {
          console.log(`        ✅ В норме`);
        }
      }
    }
  }

  // 2. Проверка правил уведомлений
  console.log('\n2️⃣ Проверка правил уведомлений...');
  const { data: rules, error: rulesError } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('is_active', true)
    .eq('type', 'bill_acceptor_threshold');

  if (rulesError) {
    console.error('❌ Ошибка получения правил:', rulesError);
    return;
  }

  console.log(`✅ Найдено активных правил: ${rules.length}`);
  for (const rule of rules) {
    console.log(`   📋 Правило: "${rule.name}"`);
    console.log(`      Каналы: ${rule.notification_config?.channels?.join(', ')}`);
    console.log(`      Получатели ролей: ${rule.recipients?.roles?.length || 0}`);
    console.log(`      Получатели пользователей: ${rule.recipients?.users?.length || 0}`);
  }

  // 3. Проверка настроек пользователей
  console.log('\n3️⃣ Проверка настроек пользователей...');
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_notification_settings')
    .select('user_id, email_enabled, email_address, telegram_enabled, telegram_chat_id, telegram_username');

  if (settingsError) {
    console.error('❌ Ошибка получения настроек:', settingsError);
    return;
  }

  console.log(`✅ Найдено пользователей с настройками: ${userSettings.length}`);
  for (const settings of userSettings) {
    console.log(`   👤 Пользователь ID: ${settings.user_id}`);
    console.log(`      Email: ${settings.email_enabled ? '✅' : '❌'} (${settings.email_address || 'не указан'})`);
    console.log(`      Telegram: ${settings.telegram_enabled ? '✅' : '❌'} (${settings.telegram_username || 'не привязан'})`);
  }

  // 4. Проверка истории уведомлений
  console.log('\n4️⃣ Проверка истории уведомлений...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'bill_acceptor_threshold')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifError) {
    console.error('❌ Ошибка получения уведомлений:', notifError);
    return;
  }

  console.log(`✅ Последние уведомления: ${notifications.length}`);
  for (const notif of notifications) {
    console.log(`   📨 ${notif.title}`);
    console.log(`      Статус: ${notif.status} | Приоритет: ${notif.priority}`);
    console.log(`      Создано: ${new Date(notif.created_at).toLocaleString('ru-RU')}`);
  }

  // 5. Рекомендации
  console.log('\n📝 РЕКОМЕНДАЦИИ:');

  const hasEnabledUsers = userSettings.some(s => s.email_enabled || s.telegram_enabled);
  if (!hasEnabledUsers) {
    console.log('   ⚠️ У пользователей не включены каналы уведомлений!');
    console.log('   → Включите Email или Telegram в настройках пользователя');
  }

  const hasRecipients = rules.some(r =>
    (r.recipients?.roles?.length > 0) || (r.recipients?.users?.length > 0)
  );
  if (!hasRecipients) {
    console.log('   ⚠️ У правил не указаны получатели!');
    console.log('   → Система будет отправлять уведомления всем пользователям с включенными каналами');
  }

  const hasThresholdExceeded = stations.some(s =>
    s.bill_acceptor_count >= s.thresholds.billCountWarning
  );
  if (hasThresholdExceeded) {
    console.log('   🔴 Обнаружены превышения порогов!');
    console.log('   → Уведомления должны быть отправлены автоматически при следующей проверке');
  }

  console.log('\n✅ Диагностика завершена!');
}

testBillAcceptorNotifications().catch(console.error);
