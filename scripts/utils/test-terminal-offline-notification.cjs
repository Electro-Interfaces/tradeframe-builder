/**
 * Тестовая проверка уведомлений о проблемах с передачей данных от терминала
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STS_API_URL = process.env.STS_API_URL || 'https://pos.autooplata.ru/tms';
const STS_USERNAME = process.env.STS_API_USERNAME;
const STS_PASSWORD = process.env.STS_API_PASSWORD;

async function getStsToken() {
  try {
    const response = await axios.post(`${STS_API_URL}/v1/login`, {
      username: STS_USERNAME,
      password: STS_PASSWORD
    });
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Ошибка получения токена:', error.message);
    return null;
  }
}

async function checkTerminalOfflineNotification() {
  try {
    console.log('🔍 Проверка уведомлений о проблемах с передачей данных от терминала...\n');

    // 1. Проверяем правило уведомления
    console.log('📋 Шаг 1: Проверка правила уведомления');
    const { data: rule, error: ruleError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('type', 'terminal_offline')
      .single();

    if (ruleError || !rule) {
      console.log('❌ Правило не найдено:', ruleError);
      return;
    }

    console.log(`✅ Правило найдено: ${rule.name}`);
    console.log(`   ID: ${rule.id}`);
    console.log(`   Активно: ${rule.is_active}`);
    console.log(`   Расписание: ${rule.schedule_config?.cron || 'N/A'}`);
    console.log(`   Порог задержки: ${rule.rule_config?.maxDelayMinutes || 12} минут`);
    console.log(`   Получатели (роли): ${JSON.stringify(rule.recipients?.roles || [])}`);

    // 2. Проверяем текущее время передачи данных от терминала
    console.log('\n📡 Шаг 2: Проверка времени последней передачи данных');

    // Используем локальный backend proxy
    const response = await axios.get('http://localhost:3001/api/sts/v2/info', {
      params: {
        system: '15',
        station_number: '4'
      }
    });

    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    const posData = data?.pos?.[0];
    const lastUpdate = posData?.dt_info;

    if (!lastUpdate) {
      console.log('❌ Нет данных о времени последнего обновления');
      return;
    }

    const now = new Date();
    const lastUpdateDate = new Date(lastUpdate);
    const delayMs = now - lastUpdateDate;
    const delayMinutes = Math.floor(delayMs / 60000);

    console.log(`   Последнее обновление: ${lastUpdateDate.toLocaleString('ru-RU')}`);
    console.log(`   Текущее время: ${now.toLocaleString('ru-RU')}`);
    console.log(`   Задержка: ${delayMinutes} минут`);

    const maxDelay = rule.rule_config?.maxDelayMinutes || 12;
    if (delayMinutes > maxDelay) {
      console.log(`   ⚠️  ПРЕВЫШЕН ПОРОГ! (${delayMinutes} > ${maxDelay} минут)`);
      console.log(`   ✅ Уведомление должно быть отправлено`);
    } else {
      console.log(`   ✅ Задержка в пределах нормы (${delayMinutes} <= ${maxDelay} минут)`);
      console.log(`   ℹ️  Уведомление не будет отправлено`);
    }

    // 3. Проверяем пользователей с ролью Суперадминистратор
    console.log('\n👥 Шаг 3: Проверка получателей (Суперадминистраторы)');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        user_notification_settings (*)
      `)
      .eq('role', 'Суперадминистратор');

    if (usersError) {
      console.log('❌ Ошибка получения пользователей:', usersError);
      return;
    }

    console.log(`   Найдено пользователей с ролью Суперадминистратор: ${users.length}`);

    users.forEach((user, index) => {
      const settings = user.user_notification_settings?.[0];
      console.log(`\n   Пользователь ${index + 1}:`);
      console.log(`   - Имя: ${user.full_name || user.username}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Telegram включен: ${settings?.telegram_enabled || false}`);
      console.log(`   - Telegram chat ID: ${settings?.telegram_chat_id || 'не привязан'}`);
      console.log(`   - Email включен: ${settings?.email_enabled || false}`);
    });

    // 4. Проверяем подписки на тип уведомления
    console.log('\n📬 Шаг 4: Проверка подписок на terminal_offline');

    for (const user of users) {
      const { data: subscription } = await supabase
        .from('user_notification_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_type', 'terminal_offline')
        .single();

      if (subscription) {
        console.log(`   ✅ ${user.full_name || user.username}: подписан`);
      } else {
        console.log(`   ⚠️  ${user.full_name || user.username}: НЕ подписан`);
      }
    }

    // 5. Проверяем последние уведомления
    console.log('\n📨 Шаг 5: Проверка истории уведомлений terminal_offline');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'terminal_offline')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifError) {
      console.log('❌ Ошибка получения уведомлений:', notifError);
    } else if (notifications && notifications.length > 0) {
      console.log(`   Найдено уведомлений: ${notifications.length}`);
      notifications.forEach((notif, index) => {
        console.log(`\n   Уведомление ${index + 1}:`);
        console.log(`   - Создано: ${new Date(notif.created_at).toLocaleString('ru-RU')}`);
        console.log(`   - Станция: ${notif.context?.stationName || 'N/A'}`);
        console.log(`   - Задержка: ${notif.context?.delayMinutes || 'N/A'} мин`);
        console.log(`   - Статус: ${notif.status}`);
      });
    } else {
      console.log('   ℹ️  Уведомлений пока нет');
    }

    // 6. Проверяем журнал доставки
    console.log('\n📊 Шаг 6: Проверка журнала доставки');
    const { data: deliveryLog, error: logError } = await supabase
      .from('notification_delivery_log')
      .select(`
        *,
        notifications!inner(type)
      `)
      .eq('notifications.type', 'terminal_offline')
      .order('sent_at', { ascending: false })
      .limit(5);

    if (logError) {
      console.log('❌ Ошибка получения журнала:', logError);
    } else if (deliveryLog && deliveryLog.length > 0) {
      console.log(`   Найдено записей в журнале: ${deliveryLog.length}`);
      deliveryLog.forEach((log, index) => {
        console.log(`\n   Доставка ${index + 1}:`);
        console.log(`   - Канал: ${log.channel}`);
        console.log(`   - Статус: ${log.status}`);
        console.log(`   - Отправлено: ${new Date(log.sent_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('   ℹ️  Записей в журнале доставки пока нет');
    }

    console.log('\n📝 Резюме:');
    console.log(`   Правило активно: ${rule.is_active ? '✅' : '❌'}`);
    console.log(`   Задержка превышает порог: ${delayMinutes > maxDelay ? '✅' : '❌'}`);
    console.log(`   Есть получатели (Суперадминистраторы): ${users.length > 0 ? '✅' : '❌'}`);

    if (rule.is_active && delayMinutes > maxDelay && users.length > 0) {
      console.log('\n✅ Уведомление должно быть отправлено при следующей проверке (каждые 15 минут)');
    } else {
      console.log('\n⚠️  Уведомление НЕ будет отправлено:');
      if (!rule.is_active) console.log('   - Правило неактивно');
      if (delayMinutes <= maxDelay) console.log('   - Задержка в пределах нормы');
      if (users.length === 0) console.log('   - Нет получателей');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkTerminalOfflineNotification()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
