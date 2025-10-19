/**
 * Миграция подписок пользователей: equipment_offline → terminal_offline
 * Удаление подписок на нереализованный тип shift_not_closed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateSubscriptions() {
  try {
    console.log('🔄 Миграция подписок пользователей...\n');

    // 1. Находим все подписки на equipment_offline
    const { data: equipmentOfflineSubscriptions, error: findError } = await supabase
      .from('user_notification_subscriptions')
      .select('*')
      .eq('notification_type', 'equipment_offline');

    if (findError) {
      throw findError;
    }

    console.log(`📋 Найдено подписок на equipment_offline: ${equipmentOfflineSubscriptions?.length || 0}`);

    // 2. Заменяем equipment_offline на terminal_offline
    if (equipmentOfflineSubscriptions && equipmentOfflineSubscriptions.length > 0) {
      for (const subscription of equipmentOfflineSubscriptions) {
        const { error: updateError } = await supabase
          .from('user_notification_subscriptions')
          .update({ notification_type: 'terminal_offline' })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`❌ Ошибка обновления подписки ${subscription.id}:`, updateError.message);
        } else {
          console.log(`✅ Обновлена подписка ${subscription.id}: equipment_offline → terminal_offline`);
        }
      }
    }

    // 3. Находим все подписки на shift_not_closed
    const { data: shiftNotClosedSubscriptions, error: findShiftError } = await supabase
      .from('user_notification_subscriptions')
      .select('*')
      .eq('notification_type', 'shift_not_closed');

    if (findShiftError) {
      throw findShiftError;
    }

    console.log(`\n📋 Найдено подписок на shift_not_closed: ${shiftNotClosedSubscriptions?.length || 0}`);

    // 4. Удаляем подписки на shift_not_closed (не реализовано)
    if (shiftNotClosedSubscriptions && shiftNotClosedSubscriptions.length > 0) {
      for (const subscription of shiftNotClosedSubscriptions) {
        const { error: deleteError } = await supabase
          .from('user_notification_subscriptions')
          .delete()
          .eq('id', subscription.id);

        if (deleteError) {
          console.error(`❌ Ошибка удаления подписки ${subscription.id}:`, deleteError.message);
        } else {
          console.log(`✅ Удалена подписка ${subscription.id}: shift_not_closed (не реализовано)`);
        }
      }
    }

    console.log('\n✅ Миграция завершена!');
    console.log('\n📌 Актуальные типы событий:');
    console.log('   1. bill_acceptor_threshold ✅ (Пороги купюроприемника)');
    console.log('   2. terminal_offline ✅ (Проблемы с терминалом)');
    console.log('   3. low_fuel_level ✅ (Низкий уровень топлива)');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
  }
}

migrateSubscriptions();
