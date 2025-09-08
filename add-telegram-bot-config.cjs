#!/usr/bin/env node

/**
 * Добавление настроек Telegram бота в system_config
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addTelegramBotConfig() {
  console.log('🤖 Добавление настроек Telegram бота в систему...');
  
  try {
    // 1. Настройки токена бота
    console.log('1️⃣ Добавляем токен бота...');
    const { error: tokenError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'telegram_bot_token',
        config_value: '8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs',
        config_type: 'telegram',
        description: 'Токен Telegram бота для верификации пользователей',
        is_encrypted: false
      });
    
    if (tokenError) {
      console.error('❌ Ошибка добавления токена:', tokenError.message);
    } else {
      console.log('✅ Токен бота добавлен');
    }
    
    // 2. Username бота
    console.log('2️⃣ Добавляем username бота...');
    const { error: usernameError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'telegram_bot_username',
        config_value: '@TradeControl_DW_Export_Bot',
        config_type: 'telegram',
        description: 'Username Telegram бота в системе',
        is_encrypted: false
      });
    
    if (usernameError) {
      console.error('❌ Ошибка добавления username:', usernameError.message);
    } else {
      console.log('✅ Username бота добавлен');
    }
    
    // 3. Общие настройки Telegram интеграции
    console.log('3️⃣ Добавляем настройки интеграции...');
    const telegramSettings = {
      enabled: true,
      botToken: '8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs',
      botUsername: '@TradeControl_DW_Export_Bot',
      botId: '8162072057',
      verificationEnabled: true,
      notificationsEnabled: true,
      codeExpiryMinutes: 15,
      maxRetries: 3,
      webhookUrl: null,
      pollingEnabled: true
    };
    
    const { error: settingsError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'telegram_integration',
        config_value: telegramSettings,
        config_type: 'integration',
        description: 'Настройки интеграции с Telegram для верификации и уведомлений',
        is_encrypted: false
      });
    
    if (settingsError) {
      console.error('❌ Ошибка добавления настроек интеграции:', settingsError.message);
    } else {
      console.log('✅ Настройки интеграции добавлены');
    }
    
    // 4. Обновляем api_settings
    console.log('4️⃣ Обновляем api_settings...');
    const { data: currentApiSettings } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'api_settings')
      .single();
    
    if (currentApiSettings) {
      const updatedApiSettings = {
        ...currentApiSettings.config_value,
        telegram: {
          botToken: '8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs',
          botUsername: '@TradeControl_DW_Export_Bot',
          enabled: true
        }
      };
      
      const { error: apiUpdateError } = await supabase
        .from('system_config')
        .update({
          config_value: updatedApiSettings,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'api_settings');
      
      if (apiUpdateError) {
        console.error('❌ Ошибка обновления api_settings:', apiUpdateError.message);
      } else {
        console.log('✅ api_settings обновлен с Telegram настройками');
      }
    }
    
    // 5. Проверяем результат
    console.log('\n🔍 Проверка добавленных настроек...');
    const { data: telegramConfigs } = await supabase
      .from('system_config')
      .select('*')
      .or('config_key.ilike.%telegram%,config_type.eq.telegram,config_type.eq.integration')
      .order('config_key');
    
    console.log(`📊 Найдено Telegram конфигураций: ${telegramConfigs?.length || 0}`);
    telegramConfigs?.forEach(config => {
      console.log(`   ✅ ${config.config_key} (${config.config_type})`);
      console.log(`      📝 ${config.description}`);
    });
    
    console.log('\n🎉 Настройки Telegram бота успешно добавлены в систему!');
    console.log('\n🎯 Следующие шаги:');
    console.log('1. Обновите страницу веб-интерфейса');
    console.log('2. Перейдите в раздел "Обмен данными"');
    console.log('3. Проверьте настройки Telegram интеграции');
    console.log('4. Попробуйте запустить бота через интерфейс');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

addTelegramBotConfig().catch(console.error);