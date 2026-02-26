/**
 * Обновляет расписание правила уведомлений для немедленной проверки
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchedule() {
  console.log('🔧 Обновление расписания проверки уровня топлива...\n');

  // Обновляем расписание на проверку каждую минуту
  const { data, error } = await supabase
    .from('notification_rules')
    .update({ schedule: '*/1 * * * *' })
    .eq('type', 'low_fuel_level')
    .select();

  if (error) {
    console.error('❌ Ошибка обновления расписания:', error);
    return;
  }

  console.log('✅ Расписание обновлено на проверку каждую минуту');
  console.log('   Старое: "0 */1 * * *" (каждый час)');
  console.log('   Новое: "*/1 * * * *" (каждую минуту)');
  console.log('\n⏰ Следующая проверка начнется в течение 1 минуты');
  console.log('📱 Проверьте Telegram через 1-2 минуты для получения уведомления');
  console.log('\n⚠️  После теста верните расписание обратно на "0 */1 * * *"');
}

updateSchedule()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
