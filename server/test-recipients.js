/**
 * Тест получения списка получателей
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function testRecipients() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔍 Тест получения получателей уведомлений\n');

  // Получаем правило
  const { data: rules } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('type', 'bill_acceptor_threshold')
    .limit(1);

  const rule = rules[0];
  console.log('📋 Правило:', rule.name);
  console.log('   Recipients:', JSON.stringify(rule.recipients));

  const hasRecipients = (rule.recipients.roles && rule.recipients.roles.length > 0) ||
                        (rule.recipients.users && rule.recipients.users.length > 0);

  console.log('   Указаны получатели:', hasRecipients);

  if (!hasRecipients) {
    console.log('\n👥 Получаем всех пользователей с активными уведомлениями...');

    // Пробуем разные способы
    console.log('\n1️⃣ Попытка с JOIN:');
    const { data: allSettings1, error: error1 } = await supabase
      .from('user_notification_settings')
      .select('user_id, users(id, email, full_name), *')
      .or('email_enabled.eq.true,telegram_enabled.eq.true');

    if (error1) {
      console.log('   ❌ Ошибка:', error1);
    } else {
      console.log('   ✅ Получено:', allSettings1?.length || 0);
      if (allSettings1 && allSettings1[0]) {
        console.log('   Пример:', JSON.stringify(allSettings1[0], null, 2));
      }
    }

    console.log('\n2️⃣ Попытка без JOIN:');
    const { data: allSettings2, error: error2 } = await supabase
      .from('user_notification_settings')
      .select('*')
      .or('email_enabled.eq.true,telegram_enabled.eq.true');

    if (error2) {
      console.log('   ❌ Ошибка:', error2);
    } else {
      console.log('   ✅ Получено:', allSettings2?.length || 0);
      if (allSettings2 && allSettings2[0]) {
        console.log('   Пример:', JSON.stringify(allSettings2[0], null, 2));
      }
    }

    if (allSettings2 && allSettings2.length > 0) {
      console.log('\n3️⃣ Получаем пользователя по user_id:');
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', allSettings2[0].user_id)
        .single();

      console.log('   ✅ Пользователь:', user);
    }
  }
}

testRecipients().catch(console.error);
