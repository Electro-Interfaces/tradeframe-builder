#!/usr/bin/env node

/**
 * Детальная проверка конфигурации Telegram бота в системе
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkBotConfiguration() {
  console.log('🔍 Детальная проверка настроек Telegram бота...');
  
  try {
    // 1. Проверяем все конфигурации системы
    console.log('\n📊 1. ВСЕ ЗАПИСИ В SYSTEM_CONFIG:');
    const { data: allConfigs, error: allError } = await supabase
      .from('system_config')
      .select('*')
      .order('config_key');
    
    if (allError) {
      console.error('❌ Ошибка получения всех конфигураций:', allError.message);
    } else {
      console.log(`   Всего записей: ${allConfigs?.length || 0}`);
      allConfigs?.forEach(config => {
        console.log(`   • ${config.config_key} (${config.config_type})`);
        if (config.config_key.includes('telegram') || config.config_key.includes('bot')) {
          console.log(`     📝 ${config.description || 'Нет описания'}`);
          console.log(`     💾 ${JSON.stringify(config.config_value).substring(0, 100)}...`);
        }
      });
    }
    
    // 2. Проверяем настройки API
    console.log('\n🌐 2. НАСТРОЙКИ API И ИНТЕГРАЦИЙ:');
    const { data: apiSettings, error: apiError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', 'api_settings')
      .single();
    
    if (apiError && apiError.code !== 'PGRST116') {
      console.error('❌ Ошибка получения api_settings:', apiError.message);
    } else if (apiSettings) {
      console.log('   ✅ Найдены api_settings:');
      console.log(`   📝 ${apiSettings.description}`);
      
      const apiValue = apiSettings.config_value;
      console.log('\n   📋 Структура api_settings:');
      
      if (apiValue && typeof apiValue === 'object') {
        Object.keys(apiValue).forEach(key => {
          console.log(`   • ${key}:`, typeof apiValue[key]);
          if (key.toLowerCase().includes('telegram') || key.toLowerCase().includes('bot')) {
            console.log(`     🤖 TELEGRAM НАСТРОЙКА:`, JSON.stringify(apiValue[key], null, 2));
          }
        });
      }
    } else {
      console.log('   ❌ api_settings не найдены');
    }
    
    // 3. Проверяем конфигурацию обмена данными
    console.log('\n🔄 3. НАСТРОЙКИ ОБМЕНА ДАННЫМИ:');
    const { data: exchangeSettings, error: exchangeError } = await supabase
      .from('system_config')
      .select('*')
      .or('config_key.ilike.%exchange%,config_key.ilike.%integration%,config_type.eq.integration')
      .order('config_key');
    
    if (exchangeError) {
      console.error('❌ Ошибка получения настроек обмена:', exchangeError.message);
    } else if (exchangeSettings?.length) {
      console.log(`   ✅ Найдено настроек обмена: ${exchangeSettings.length}`);
      exchangeSettings.forEach(setting => {
        console.log(`   • ${setting.config_key}`);
        console.log(`     Тип: ${setting.config_type}`);
        console.log(`     Описание: ${setting.description || 'Нет описания'}`);
        
        if (setting.config_value && typeof setting.config_value === 'object') {
          const value = setting.config_value;
          if (value.telegram || value.bot || value.telegramBot) {
            console.log(`     🤖 TELEGRAM в обмене данными:`, JSON.stringify(value, null, 2));
          }
        }
      });
    } else {
      console.log('   ❌ Настройки обмена данными не найдены');
    }
    
    // 4. Поиск по ключевым словам
    console.log('\n🔍 4. ПОИСК ПО КЛЮЧЕВЫМ СЛОВАМ:');
    const keywords = ['telegram', 'bot', '8162072057', 'TradeControl', 'DW_Export'];
    
    for (const keyword of keywords) {
      const { data: keywordResults } = await supabase
        .from('system_config')
        .select('*')
        .or(`config_key.ilike.%${keyword}%,config_value::text.ilike.%${keyword}%,description.ilike.%${keyword}%`);
      
      if (keywordResults?.length) {
        console.log(`   🔑 "${keyword}" найдено в ${keywordResults.length} записях:`);
        keywordResults.forEach(result => {
          console.log(`     • ${result.config_key}: ${result.description || 'Нет описания'}`);
        });
      }
    }
    
    // 5. Проверяем системные настройки
    console.log('\n⚙️ 5. СИСТЕМНЫЕ НАСТРОЙКИ:');
    const { data: systemSettings } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_type', 'system')
      .order('config_key');
    
    if (systemSettings?.length) {
      console.log(`   ✅ Системных настроек: ${systemSettings.length}`);
      systemSettings.forEach(setting => {
        if (setting.config_key.includes('telegram') || setting.config_key.includes('bot')) {
          console.log(`   🤖 ${setting.config_key}: ${setting.description}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

checkBotConfiguration().then(() => {
  console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
  console.log('1. Проверьте раздел "Обмен данными" в веб-интерфейсе');
  console.log('2. Найдите настройки Telegram бота');
  console.log('3. Убедитесь, что токен 8162072057:*** правильно сохранен');
  console.log('4. Проверьте username бота @TradeControl_DW_Export_Bot');
  process.exit(0);
}).catch(console.error);