/**
 * Удаление дубликатов правил уведомлений
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function cleanupDuplicates() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🧹 Очистка дубликатов правил уведомлений...\n');

  // Получаем все правила купюроприемника
  const { data: rules } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('type', 'bill_acceptor_threshold')
    .order('created_at', { ascending: true });

  console.log(`📋 Найдено правил купюроприемника: ${rules.length}\n`);

  for (const rule of rules) {
    console.log(`   - ${rule.name} (ID: ${rule.id.substring(0, 8)}...)`);
    console.log(`     Создано: ${new Date(rule.created_at).toLocaleString('ru-RU')}`);
    console.log(`     Tenant: ${rule.tenant_id || 'null'}`);
  }

  // Оставляем только одно правило с tenant_id
  const ruleToKeep = rules.find(r => r.tenant_id === 'cbb4029e-757b-41a2-a770-e619f1bf74e9');

  if (!ruleToKeep) {
    console.log('\n❌ Не найдено правило с tenant_id');
    return;
  }

  console.log(`\n✅ Оставляем правило: "${ruleToKeep.name}" (ID: ${ruleToKeep.id})`);

  // Удаляем остальные
  const rulesToDelete = rules.filter(r => r.id !== ruleToKeep.id);

  console.log(`\n🗑️ Удаляем ${rulesToDelete.length} дубликатов:\n`);

  for (const rule of rulesToDelete) {
    console.log(`   Удаление: "${rule.name}" (${rule.id.substring(0, 8)}...)`);

    const { error } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', rule.id);

    if (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    } else {
      console.log(`   ✅ Удалено`);
    }
  }

  console.log('\n✅ Очистка завершена!');
  console.log(`   Осталось правил купюроприемника: 1`);
}

cleanupDuplicates().catch(console.error);
