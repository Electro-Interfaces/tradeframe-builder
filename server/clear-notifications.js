/**
 * Очистка тестовых уведомлений
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function clearNotifications() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🧹 Очистка тестовых уведомлений...\n');

  const { error } = await supabase
    .from('notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log('✅ Все уведомления удалены');
}

clearNotifications().catch(console.error);
