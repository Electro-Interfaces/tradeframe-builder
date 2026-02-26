/**
 * Восстанавливает оригинальные пороги уровня топлива после тестирования
 */

require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreThresholds() {
  console.log('🔧 Восстановление оригинальных порогов уровня топлива...\n');

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
  console.log(`   Текущие (тестовые) пороги:`);

  const station = tenant.settings.stations[0];
  const currentThresholds = station.fuelLevelThresholds?.thresholds || [];

  currentThresholds.forEach(t => {
    console.log(`   - ${t.fuelType}: ⚠️ ${t.levelWarning}%, 🔴 ${t.levelCritical}%`);
  });

  // Восстанавливаем оригинальные пороги (20% и 10%)
  const newSettings = { ...tenant.settings };
  newSettings.stations[0].fuelLevelThresholds = {
    thresholds: [
      { fuelType: 'ДТ', levelWarning: 20, levelCritical: 10 },
      { fuelType: 'АИ-95', levelWarning: 20, levelCritical: 10 },
      { fuelType: 'АИ-92', levelWarning: 20, levelCritical: 10 }
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

  console.log('\n✅ Оригинальные пороги восстановлены:');
  newSettings.stations[0].fuelLevelThresholds.thresholds.forEach(t => {
    console.log(`   - ${t.fuelType}: ⚠️ ${t.levelWarning}%, 🔴 ${t.levelCritical}%`);
  });

  console.log('\n⚠️  Не забудьте также вернуть расписание планировщика на "0 */4 * * *"!');
  console.log('   (Откройте server/services/notificationScheduler.js и измените строку 37)');
}

restoreThresholds()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
