/**
 * Создание правила уведомления о проблемах с работой терминала
 * Проверяет время последней передачи данных каждые 15 минут
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTerminalOfflineRule() {
  try {
    console.log('🔧 Создание правила уведомления о проблемах с работой терминала...\n');

    // Получаем тенанта БТО
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (tenantError) {
      console.error('❌ Ошибка получения тенанта:', tenantError);
      return;
    }

    console.log(`📍 Тенант: ${tenant.name} (${tenant.id})`);

    // Проверяем, существует ли уже такое правило
    const { data: existingRule } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('type', 'terminal_offline')
      .single();

    if (existingRule) {
      console.log('⚠️  Правило уже существует:', existingRule.name);
      console.log('   ID:', existingRule.id);
      console.log('   Активно:', existingRule.is_active);

      // Обновляем существующее правило
      const { error: updateError } = await supabase
        .from('notification_rules')
        .update({
          is_active: true,
          schedule_config: {
            cron: '*/15 * * * *', // Каждые 15 минут
            timezone: 'Europe/Moscow'
          },
          rule_config: {
            maxDelayMinutes: 12, // Максимальная задержка в минутах
            checkInterval: 15 // Интервал проверки в минутах
          },
          notification_config: {
            priority: 'high',
            channels: ['email', 'telegram'],
            template: 'terminal_offline'
          },
          recipients: {
            roles: ['Суперадминистратор'], // Только суперадминистраторы
            users: []
          }
        })
        .eq('id', existingRule.id);

      if (updateError) {
        console.error('❌ Ошибка обновления правила:', updateError);
        return;
      }

      console.log('\n✅ Правило обновлено успешно');
      return;
    }

    // Создаем новое правило
    const { data: newRule, error: createError } = await supabase
      .from('notification_rules')
      .insert({
        tenant_id: tenant.id,
        name: 'Проверка работы терминала',
        description: 'Уведомление о проблемах с передачей данных от терминала (задержка более 12 минут)',
        type: 'terminal_offline',
        is_active: true,
        schedule_type: 'cron',
        schedule_config: {
          cron: '*/15 * * * *', // Каждые 15 минут
          timezone: 'Europe/Moscow'
        },
        rule_config: {
          maxDelayMinutes: 12, // Максимальная задержка в минутах
          checkInterval: 15 // Интервал проверки в минутах
        },
        notification_config: {
          priority: 'high',
          channels: ['email', 'telegram'],
          template: 'terminal_offline'
        },
        recipients: {
          roles: ['Суперадминистратор'], // Только суперадминистраторы
          users: []
        }
      })
      .select();

    if (createError) {
      console.error('❌ Ошибка создания правила:', createError);
      return;
    }

    console.log('\n✅ Правило создано успешно:');
    console.log('   ID:', newRule[0].id);
    console.log('   Название:', newRule[0].name);
    console.log('   Тип:', newRule[0].type);
    console.log('   Расписание: каждые 15 минут');
    console.log('   Порог задержки: 12 минут');
    console.log('   Получатели: Суперадминистраторы');
    console.log('   Активно:', newRule[0].is_active);

    // Создаем подписку для роли Суперадминистратор
    console.log('\n🔔 Настройка подписок для роли Суперадминистратор...');

    const { error: subscriptionError } = await supabase
      .from('role_notification_subscriptions')
      .upsert({
        role_name: 'Суперадминистратор',
        notification_type: 'terminal_offline',
        is_active: true,
        channels: ['email', 'telegram']
      }, {
        onConflict: 'role_name,notification_type'
      });

    if (subscriptionError) {
      console.error('⚠️  Ошибка создания подписки:', subscriptionError);
    } else {
      console.log('✅ Подписка для роли Суперадминистратор создана');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createTerminalOfflineRule()
  .then(() => {
    console.log('\n✅ Настройка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
