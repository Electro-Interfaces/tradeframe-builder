/**
 * Удаление дублирующего нерабочего правила "Работа терминала" (equipment_offline)
 * Оставляем только рабочее правило "Проверка работы терминала" (terminal_offline)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function removeDuplicateRule() {
  try {
    console.log('🔍 Поиск нерабочего правила "Работа терминала" (equipment_offline)...');

    // Находим правило
    const { data: rule, error: findError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('id', '30f5c596-c21c-45c7-bb53-e2f207fe0a9a')
      .single();

    if (findError || !rule) {
      console.log('⚠️ Правило не найдено или уже удалено');
      return;
    }

    console.log('📋 Найдено правило:');
    console.log(`   Название: ${rule.name}`);
    console.log(`   Описание: ${rule.description}`);
    console.log(`   Тип: ${rule.type}`);
    console.log(`   Активно: ${rule.is_active}`);

    // Удаляем правило
    const { error: deleteError } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', '30f5c596-c21c-45c7-bb53-e2f207fe0a9a');

    if (deleteError) {
      throw deleteError;
    }

    console.log('✅ Нерабочее правило успешно удалено');
    console.log('');
    console.log('📌 Осталось рабочее правило:');
    console.log('   Название: "Проверка работы терминала"');
    console.log('   Тип: terminal_offline');
    console.log('   Статус: ✅ ПОЛНОСТЬЮ РЕАЛИЗОВАН');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

removeDuplicateRule();
