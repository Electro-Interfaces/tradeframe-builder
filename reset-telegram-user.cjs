#!/usr/bin/env node

/**
 * Скрипт для сброса Telegram привязки пользователя
 * Для тестирования системы верификации
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function resetTelegramUser(userEmail) {
  console.log(`🔄 Сброс Telegram привязки для пользователя: ${userEmail}`);
  
  try {
    // Найти пользователя по email
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, name, telegram_chat_id')
      .eq('email', userEmail)
      .limit(1);
    
    if (findError) {
      console.error('❌ Ошибка поиска пользователя:', findError.message);
      return false;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Пользователь не найден:', userEmail);
      return false;
    }
    
    const user = users[0];
    console.log(`👤 Найден пользователь: ${user.name} (${user.email})`);
    console.log(`📱 Текущий chat_id: ${user.telegram_chat_id || 'не установлен'}`);
    
    // Сброс всех Telegram полей
    const { error: updateError } = await supabase
      .from('users')
      .update({
        telegram_chat_id: null,
        telegram_verified_at: null,
        telegram_notifications_enabled: true
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Ошибка обновления пользователя:', updateError.message);
      return false;
    }
    
    // Удаляем все неиспользованные коды верификации этого пользователя
    const { error: codesError } = await supabase
      .from('telegram_verification_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('is_used', false);
    
    if (codesError) {
      console.warn('⚠️ Ошибка очистки кодов верификации:', codesError.message);
    } else {
      console.log('🧹 Неиспользованные коды верификации удалены');
    }
    
    console.log('✅ Telegram привязка успешно сброшена!');
    console.log('💡 Теперь можно заново тестировать процесс верификации');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка сброса:', error.message);
    return false;
  }
}

// Получаем email из аргументов командной строки
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('❌ Укажите email пользователя:');
  console.log('node reset-telegram-user.cjs admin@tradeframe.com');
  console.log('');
  console.log('Доступные тестовые пользователи:');
  console.log('  • admin@tradeframe.com');
  console.log('  • network.admin@demo-azs.ru');
  console.log('  • manager@demo-azs.ru');
  console.log('  • operator@demo-azs.ru');
  process.exit(1);
}

resetTelegramUser(userEmail).then(success => {
  if (success) {
    console.log('\n🎯 Следующие шаги:');
    console.log('1. Обновите страницу в браузере (F5)');
    console.log('2. Перейдите в Профиль → Интеграции → Telegram'); 
    console.log('3. Нажмите "Сгенерировать код верификации"');
    console.log('4. Протестируйте новый процесс верификации');
  }
  process.exit(success ? 0 : 1);
}).catch(console.error);