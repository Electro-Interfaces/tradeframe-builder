/**
 * Устанавливает тестовый порог для проверки уведомлений о проблемах с терминалом
 * Временно устанавливает порог 1 минута вместо 12 минут
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setTestThreshold() {
  try {
    console.log('🔧 Установка тестового порога для уведомлений о работе терминала...\n');

    // Получаем правило
    const { data: rule, error: ruleError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('type', 'terminal_offline')
      .single();

    if (ruleError || !rule) {
      console.error('❌ Правило не найдено:', ruleError);
      return;
    }

    console.log(`📍 Правило: ${rule.name}`);
    console.log(`   Текущий порог: ${rule.rule_config?.maxDelayMinutes || 12} минут`);

    // Обновляем порог на 1 минуту для теста
    const { error: updateError } = await supabase
      .from('notification_rules')
      .update({
        rule_config: {
          maxDelayMinutes: 1, // Тестовый порог - 1 минута
          checkInterval: 15
        }
      })
      .eq('id', rule.id);

    if (updateError) {
      console.error('❌ Ошибка обновления правила:', updateError);
      return;
    }

    console.log('\n✅ Тестовый порог установлен: 1 минута');
    console.log('\n⏰ Следующая проверка произойдет через несколько секунд (каждые 15 минут по расписанию)');
    console.log('   Или подождите до начала следующей 15-минутки (XX:00, XX:15, XX:30, XX:45)');
    console.log('\n📱 Проверьте Telegram через 1-2 минуты для получения уведомления');
    console.log('\n⚠️  НЕ ЗАБУДЬТЕ вернуть порог обратно на 12 минут после теста!');
    console.log('   Команда: node restore-terminal-offline-threshold.cjs');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

setTestThreshold()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
