/**
 * Проверка статуса миграции Telegram через Supabase API
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTelegramMigration() {
  console.log('🔍 Проверка статуса миграции Telegram в Supabase...');
  
  try {
    // Проверяем наличие таблицы telegram_verification_codes
    console.log('📋 Проверка таблицы telegram_verification_codes...');
    const { data: codes, error: codesError } = await supabase
      .from('telegram_verification_codes')
      .select('*')
      .limit(1);
    
    if (codesError) {
      console.log('❌ Таблица telegram_verification_codes не найдена:', codesError.message);
    } else {
      console.log('✅ Таблица telegram_verification_codes существует');
      console.log(`📊 Кодов в таблице: ${codes?.length || 0}`);
    }
    
    // Проверяем колонки Telegram в таблице users
    console.log('\n👥 Проверка колонок Telegram в таблице users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_verified_at, telegram_notifications_enabled')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Колонки Telegram в users не найдены:', usersError.message);
    } else {
      console.log('✅ Колонки Telegram в таблице users существуют');
      
      // Проверяем количество пользователей с подключенным Telegram
      const { count: telegramUsersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('telegram_chat_id', 'is', null);
        
      console.log(`📱 Пользователей с привязанным Telegram: ${telegramUsersCount || 0}`);
    }
    
    // Проверяем функции через RPC (если доступны)
    console.log('\n🔧 Проверка функций базы данных...');
    
    try {
      // Попробуем вызвать функцию очистки
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_expired_telegram_codes');
        
      if (cleanupError) {
        console.log('❌ Функция cleanup_expired_telegram_codes не найдена:', cleanupError.message);
      } else {
        console.log('✅ Функция cleanup_expired_telegram_codes работает');
        console.log(`🧹 Очищено просроченных кодов: ${cleanupResult}`);
      }
    } catch (funcError) {
      console.log('⚠️ Ошибка при проверке функций:', funcError.message);
    }
    
    console.log('\n📈 Итоговый статус миграции:');
    
    // Финальная оценка
    let migrationStatus = 'частично выполнена';
    if (!codesError && !usersError) {
      migrationStatus = 'успешно выполнена';
      console.log('🎉 Миграция Telegram верификации полностью выполнена!');
    } else if (codesError && usersError) {
      migrationStatus = 'не выполнена';
      console.log('❌ Миграция не выполнена - требуется применить SQL скрипт');
    } else {
      console.log('⚠️ Миграция выполнена частично - проверьте недостающие элементы');
    }
    
    return migrationStatus;
    
  } catch (error) {
    console.error('❌ Ошибка проверки миграции:', error);
    return 'ошибка проверки';
  }
}

// Запуск проверки
checkTelegramMigration().then(status => {
  console.log(`\n🏁 Статус миграции: ${status}`);
  process.exit(0);
}).catch(console.error);