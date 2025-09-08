#!/usr/bin/env node

/**
 * Диагностика кодов верификации Telegram
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function debugVerificationCodes() {
  console.log('🔍 Диагностика кодов верификации...');
  
  try {
    // Показать все коды верификации
    const { data: allCodes, error: allError } = await supabase
      .from('telegram_verification_codes')
      .select(`
        *,
        users:user_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Ошибка получения кодов:', allError.message);
      return;
    }
    
    console.log(`📊 Всего кодов в базе: ${allCodes?.length || 0}`);
    
    if (allCodes && allCodes.length > 0) {
      console.log('\n📋 Список всех кодов:');
      allCodes.forEach((code, index) => {
        const user = code.users;
        const isActive = !code.is_used && new Date(code.expires_at) > new Date();
        const status = code.is_used ? '✅ Использован' : (isActive ? '🟡 Активный' : '❌ Просрочен');
        
        console.log(`${index + 1}. ${code.verification_code} - ${user?.name || 'Неизвестно'} (${user?.email || 'нет email'})`);
        console.log(`   📅 Создан: ${new Date(code.created_at).toLocaleString('ru-RU')}`);
        console.log(`   ⏰ Истекает: ${new Date(code.expires_at).toLocaleString('ru-RU')}`);
        console.log(`   📱 Статус: ${status}`);
        if (code.used_at) {
          console.log(`   ✅ Использован: ${new Date(code.used_at).toLocaleString('ru-RU')}`);
        }
        console.log('');
      });
    } else {
      console.log('📭 Нет кодов верификации в базе данных');
      console.log('💡 Возможные причины:');
      console.log('   • Код не был создан через веб-интерфейс');
      console.log('   • Ошибка в сервисе генерации кодов');
      console.log('   • Проблема с аутентификацией пользователя');
    }
    
    // Проверить активные коды
    const { data: activeCodes, error: activeError } = await supabase
      .from('telegram_verification_codes')
      .select('*')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString());
    
    if (!activeError) {
      console.log(`🟡 Активных кодов: ${activeCodes?.length || 0}`);
    }
    
    // Показать пользователей с Telegram
    const { data: telegramUsers, error: usersError } = await supabase
      .from('users')
      .select('name, email, telegram_chat_id, telegram_verified_at')
      .not('telegram_chat_id', 'is', null);
    
    if (!usersError) {
      console.log(`👥 Пользователей с Telegram: ${telegramUsers?.length || 0}`);
      if (telegramUsers && telegramUsers.length > 0) {
        telegramUsers.forEach(user => {
          console.log(`   📱 ${user.name} (${user.email}) - Chat ID: ${user.telegram_chat_id}`);
          console.log(`      Подключен: ${new Date(user.telegram_verified_at).toLocaleString('ru-RU')}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
  }
}

debugVerificationCodes().then(() => {
  console.log('\n🎯 Для тестирования попробуйте:');
  console.log('1. Обновить страницу в браузере');
  console.log('2. Войти под нужным пользователем');
  console.log('3. Перейти в Профиль → Интеграции → Telegram');
  console.log('4. Нажать "Сгенерировать код верификации"');
  console.log('5. Проверить, появился ли код в этом списке');
  process.exit(0);
}).catch(console.error);