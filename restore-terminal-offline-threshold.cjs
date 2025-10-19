/**
 * Восстанавливает оригинальный порог для уведомлений о работе терминала
 * Возвращает порог обратно на 12 минут
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreThreshold() {
  try {
    console.log('🔧 Восстановление оригинального порога для уведомлений о работе терминала...\n');

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
    console.log(`   Текущий порог: ${rule.rule_config?.maxDelayMinutes || 'N/A'} минут`);

    // Возвращаем порог на 12 минут
    const { error: updateError } = await supabase
      .from('notification_rules')
      .update({
        rule_config: {
          maxDelayMinutes: 12, // Оригинальный порог - 12 минут
          checkInterval: 15
        }
      })
      .eq('id', rule.id);

    if (updateError) {
      console.error('❌ Ошибка обновления правила:', updateError);
      return;
    }

    console.log('\n✅ Оригинальный порог восстановлен: 12 минут');
    console.log('   Система вернулась в нормальный режим работы');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

restoreThreshold()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
