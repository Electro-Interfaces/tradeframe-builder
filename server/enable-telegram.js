/**
 * Скрипт для включения Telegram уведомлений пользователю
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function enableTelegram() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const userId = '69b2bb90-454e-4c76-a2cd-12b0f3a8d60a';

  console.log('📱 Включение Telegram уведомлений...\n');

  const { data, error } = await supabase
    .from('user_notification_settings')
    .update({ telegram_enabled: true })
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log('✅ Telegram уведомления включены для пользователя');
  console.log('   User ID:', userId);
  console.log('   Telegram: @' + data[0].telegram_username);
  console.log('   Chat ID:', data[0].telegram_chat_id);
}

enableTelegram().catch(console.error);
