#!/usr/bin/env node

/**
 * Исправление username бота в настройках системы
 * Заменяем @tradeframe_bot на @TradeControl_DW_Export_Bot
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CORRECT_BOT_USERNAME = 'TradeControl_DW_Export_Bot';  // БЕЗ @
const CORRECT_BOT_URL = `https://t.me/${CORRECT_BOT_USERNAME}`;

async function fixBotUsername() {
  console.log('🔧 Исправление настроек username бота...');
  console.log(`✅ Правильный бот: @${CORRECT_BOT_USERNAME}`);
  console.log(`🔗 URL бота: ${CORRECT_BOT_URL}`);
  
  try {
    // 1. Обновляем telegram_bot_username
    console.log('\n1️⃣ Обновляем telegram_bot_username...');
    const { error: usernameError } = await supabase
      .from('system_config')
      .update({
        config_value: CORRECT_BOT_USERNAME,  // БЕЗ @
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'telegram_bot_username');
    
    if (usernameError) {
      console.error('❌ Ошибка обновления username:', usernameError.message);
    } else {
      console.log('✅ telegram_bot_username обновлен');
    }
    
    // 2. Обновляем настройки интеграции
    console.log('2️⃣ Обновляем telegram_integration...');
    const { data: currentIntegration } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'telegram_integration')
      .single();
    
    if (currentIntegration) {
      const updatedIntegration = {
        ...currentIntegration.config_value,
        botUsername: CORRECT_BOT_USERNAME,  // БЕЗ @
        botUrl: CORRECT_BOT_URL
      };
      
      const { error: integrationError } = await supabase
        .from('system_config')
        .update({
          config_value: updatedIntegration,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'telegram_integration');
      
      if (integrationError) {
        console.error('❌ Ошибка обновления интеграции:', integrationError.message);
      } else {
        console.log('✅ telegram_integration обновлена');
      }
    }
    
    // 3. Обновляем api_settings
    console.log('3️⃣ Обновляем api_settings...');
    const { data: currentApi } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'api_settings')
      .single();
    
    if (currentApi && currentApi.config_value.telegram) {
      const updatedApi = {
        ...currentApi.config_value,
        telegram: {
          ...currentApi.config_value.telegram,
          botUsername: CORRECT_BOT_USERNAME,  // БЕЗ @
          botUrl: CORRECT_BOT_URL
        }
      };
      
      const { error: apiError } = await supabase
        .from('system_config')
        .update({
          config_value: updatedApi,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'api_settings');
      
      if (apiError) {
        console.error('❌ Ошибка обновления api_settings:', apiError.message);
      } else {
        console.log('✅ api_settings обновлен');
      }
    }
    
    // 4. Добавляем переменную окружения для Vite
    console.log('4️⃣ Добавляем настройки для фронтенда...');
    const { error: viteError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'vite_telegram_bot_username',
        config_value: CORRECT_BOT_USERNAME,
        config_type: 'frontend',
        description: 'Username Telegram бота для фронтенда (без @)',
        is_encrypted: false
      });
    
    if (viteError) {
      console.error('❌ Ошибка добавления vite настроек:', viteError.message);
    } else {
      console.log('✅ Настройки для фронтенда добавлены');
    }
    
    // 5. Проверяем результат
    console.log('\n🔍 Проверка обновленных настроек...');
    const { data: telegramConfigs } = await supabase
      .from('system_config')
      .select('config_key, config_value, description')
      .or('config_key.ilike.%telegram%,config_type.eq.telegram,config_type.eq.integration')
      .order('config_key');
    
    console.log('📊 Обновленные Telegram настройки:');
    telegramConfigs?.forEach(config => {
      console.log(`   🔧 ${config.config_key}:`);
      if (config.config_key.includes('username') || config.config_key.includes('bot')) {
        console.log(`      📝 ${JSON.stringify(config.config_value)}`);
      }
      console.log(`      💭 ${config.description}`);
    });
    
    console.log('\n🎉 Username бота исправлен!');
    console.log(`✅ Теперь система использует: @${CORRECT_BOT_USERNAME}`);
    console.log(`🔗 URL: ${CORRECT_BOT_URL}`);
    
    console.log('\n🎯 Что нужно сделать:');
    console.log('1. Обновите страницу веб-интерфейса (Ctrl+F5)');
    console.log('2. Перейдите в Профиль → Интеграции → Telegram');
    console.log('3. Кнопка должна теперь открывать правильного бота');
    console.log(`4. Проверьте ссылку: ${CORRECT_BOT_URL}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

fixBotUsername().catch(console.error);