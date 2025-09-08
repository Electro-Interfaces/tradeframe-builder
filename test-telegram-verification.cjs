#!/usr/bin/env node

/**
 * Тестовая имитация Telegram бота для верификации кодов
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function simulateTelegramVerification(verificationCode, fakeChatId) {
  console.log(`🤖 Имитация: Пользователь отправил код "${verificationCode}" в Telegram боте`);
  console.log(`📱 Имитация: Chat ID = ${fakeChatId}`);
  
  try {
    // Вызываем функцию верификации
    const { data: result, error } = await supabase
      .rpc('verify_telegram_code', {
        p_verification_code: verificationCode,
        p_chat_id: fakeChatId.toString()
      });
    
    if (error) {
      console.error('❌ Ошибка верификации:', error.message);
      return false;
    }
    
    console.log('📊 Результат верификации:', result);
    
    if (result?.success) {
      console.log('✅ Код успешно верифицирован!');
      console.log(`👤 Пользователь: ${result.user.name} (${result.user.email})`);
      console.log(`💬 Сообщение: ${result.message}`);
      console.log(`📱 Chat ID ${fakeChatId} привязан к аккаунту`);
    } else {
      console.log('❌ Верификация не удалась:', result?.error || 'Неизвестная ошибка');
      console.log(`🔍 Код ошибки: ${result?.error_code || 'UNKNOWN'}`);
    }
    
    return result?.success || false;
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    return false;
  }
}

// Получаем код и chat_id из аргументов
const verificationCode = process.argv[2];
const chatId = process.argv[3] || Math.floor(Math.random() * 1000000000); // Случайный chat_id

if (!verificationCode) {
  console.log('❌ Укажите код верификации:');
  console.log('node test-telegram-verification.cjs TF6AYX');
  console.log('node test-telegram-verification.cjs TF6AYX 123456789');
  console.log('');
  console.log('💡 Доступные активные коды:');
  
  // Показываем активные коды
  supabase
    .from('telegram_verification_codes')
    .select(`
      verification_code,
      users:user_id (name, email)
    `)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .then(({ data: codes }) => {
      if (codes && codes.length > 0) {
        codes.forEach(code => {
          console.log(`  🔑 ${code.verification_code} - ${code.users?.name || 'Неизвестно'}`);
        });
      } else {
        console.log('  📭 Нет активных кодов');
      }
      process.exit(1);
    });
} else {
  simulateTelegramVerification(verificationCode, chatId).then(success => {
    if (success) {
      console.log('\n🎉 Тестирование завершено успешно!');
      console.log('💡 Обновите страницу в браузере и проверьте статус в Профиле');
    } else {
      console.log('\n❌ Тестирование не удалось');
      console.log('💡 Проверьте код и повторите попытку');
    }
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}