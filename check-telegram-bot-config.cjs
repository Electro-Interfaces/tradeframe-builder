#!/usr/bin/env node

/**
 * Проверка настроек Telegram бота из системной конфигурации
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTelegramBotConfig() {
  console.log('🤖 Проверка конфигурации Telegram бота...');
  
  try {
    // Проверяем все записи в system_config связанные с Telegram
    const { data: allConfigs, error } = await supabase
      .from('system_config')
      .select('*')
      .or('config_key.ilike.%telegram%,config_type.eq.telegram,description.ilike.%telegram%')
      .order('config_key');
    
    if (error) {
      console.error('❌ Ошибка получения конфигурации:', error.message);
      return;
    }
    
    console.log(`📊 Найдено записей с Telegram: ${allConfigs?.length || 0}`);
    
    if (allConfigs && allConfigs.length > 0) {
      console.log('\n📋 Конфигурации Telegram:');
      allConfigs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.config_key} (${config.config_type})`);
        console.log(`   📝 Описание: ${config.description || 'Не указано'}`);
        
        // Показываем значение, но скрываем токены
        let value = config.config_value;
        if (typeof value === 'string' && value.includes(':')) {
          // Возможно это токен бота, скрываем часть
          value = value.substring(0, 20) + '***';
        }
        console.log(`   💾 Значение: ${JSON.stringify(value)}`);
        console.log(`   📅 Создано: ${new Date(config.created_at).toLocaleString('ru-RU')}`);
        if (config.updated_at) {
          console.log(`   🔄 Обновлено: ${new Date(config.updated_at).toLocaleString('ru-RU')}`);
        }
        console.log('');
      });
    } else {
      console.log('📭 Не найдено конфигураций Telegram');
      console.log('\n💡 Возможные ключи для поиска:');
      console.log('   • telegram_bot_token');
      console.log('   • telegram_bot_username');
      console.log('   • telegram_notifications');
      console.log('   • integration_telegram');
    }
    
    // Проверяем общие интеграции
    console.log('\n🔍 Проверка интеграций...');
    const { data: integrations, error: intError } = await supabase
      .from('system_config')
      .select('*')
      .or('config_key.ilike.%integration%,config_type.eq.integration')
      .order('config_key');
    
    if (!intError && integrations?.length) {
      console.log(`📊 Найдено интеграций: ${integrations.length}`);
      integrations.forEach(int => {
        console.log(`   🔗 ${int.config_key}: ${int.description || 'Без описания'}`);
      });
    }
    
    // Проверяем настройки внешних API
    console.log('\n🌐 Проверка внешних API...');
    const { data: apis, error: apiError } = await supabase
      .from('system_config')
      .select('*')
      .or('config_type.eq.external-api,config_key.ilike.%api%')
      .order('config_key');
    
    if (!apiError && apis?.length) {
      console.log(`📊 Найдено API конфигураций: ${apis.length}`);
      apis.forEach(api => {
        console.log(`   🌐 ${api.config_key}: ${api.description || 'Без описания'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки конфигурации:', error.message);
  }
}

checkTelegramBotConfig().then(() => {
  console.log('\n🎯 Следующие шаги:');
  console.log('1. Если токен не найден, добавьте его через раздел "Обмен данными"');
  console.log('2. Используйте токен: 8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs');
  console.log('3. Настройте username бота в конфигурации');
  console.log('4. Запустите реального бота с найденными настройками');
  process.exit(0);
}).catch(console.error);