/**
 * Временно устанавливает высокие пороги для тестирования уведомлений
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setTestThresholds() {
  console.log('🔧 Установка тестовых порогов для уведомлений о топливе...\n');

  // Получаем текущие настройки
  const { data: tenant, error: getError } = await supabase
    .from('tenants')
    .select('*')
    .eq('code', 'bto')
    .single();

  if (getError) {
    console.error('❌ Ошибка получения тенанта:', getError);
    return;
  }

  console.log(`📍 Сеть: ${tenant.name}`);
  console.log(`   Текущие пороги:`);

  const station = tenant.settings.stations[0];
  const currentThresholds = station.fuelLevelThresholds?.thresholds || [];

  currentThresholds.forEach(t => {
    console.log(`   - ${t.fuelType}: ⚠️ ${t.levelWarning}%, 🔴 ${t.levelCritical}%`);
  });

  // Устанавливаем тестовые пороги (60% и 50%)
  const newSettings = { ...tenant.settings };
  newSettings.stations[0].fuelLevelThresholds = {
    thresholds: [
      { fuelType: 'ДТ', levelWarning: 60, levelCritical: 50 },
      { fuelType: 'АИ-95', levelWarning: 60, levelCritical: 50 },
      { fuelType: 'АИ-92', levelWarning: 70, levelCritical: 60 }
    ]
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenant.id);

  if (updateError) {
    console.error('❌ Ошибка обновления порогов:', updateError);
    return;
  }

  console.log('\n✅ Новые ТЕСТОВЫЕ пороги установлены:');
  newSettings.stations[0].fuelLevelThresholds.thresholds.forEach(t => {
    console.log(`   - ${t.fuelType}: ⚠️ ${t.levelWarning}%, 🔴 ${t.levelCritical}%`);
  });

  console.log('\n⏰ Следующая проверка произойдет в начале следующего часа.');
  console.log('   Для немедленной проверки измените расписание правила на "*/1 * * * *"');
  console.log('\n⚠️  НЕ ЗАБУДЬТЕ вернуть пороги обратно после теста!');
  console.log('   (20% и 10% для ДТ и АИ-95, 20% и 10% для АИ-92)');
}

setTestThresholds()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
