/**
 * Скрипт для обновления количества купюр на станции (для тестирования)
 * Запуск: node server/update-station-bill-count.js <код_станции> <количество_купюр>
 * Пример: node server/update-station-bill-count.js 4 320
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function updateStationBillCount(stationCode, billCount) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(`🔄 Обновление купюр для станции ${stationCode}...\n`);

  // Получаем тенанты
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .eq('type', 'network')
    .eq('is_active', true);

  if (tenantsError) {
    console.error('❌ Ошибка получения тенантов:', tenantsError);
    return;
  }

  let updated = false;

  for (const tenant of tenants) {
    const settings = { ...tenant.settings };
    const stations = settings.stations || [];

    for (let i = 0; i < stations.length; i++) {
      if (stations[i].code === stationCode) {
        const oldCount = stations[i].billAcceptorCount || 0;
        stations[i].billAcceptorCount = billCount;

        // Обновляем тенант
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ settings })
          .eq('id', tenant.id);

        if (updateError) {
          console.error('❌ Ошибка обновления:', updateError);
          return;
        }

        console.log(`✅ Станция "${stations[i].name}" обновлена:`);
        console.log(`   Купюр было: ${oldCount}`);
        console.log(`   Купюр стало: ${billCount}`);
        console.log(`   Порог warning: ${stations[i].billAcceptorThresholds?.billCountWarning}`);
        console.log(`   Порог critical: ${stations[i].billAcceptorThresholds?.billCountCritical}`);

        if (billCount >= stations[i].billAcceptorThresholds?.billCountCritical) {
          console.log(`   🔴 КРИТИЧЕСКИЙ ПОРОГ ПРЕВЫШЕН!`);
        } else if (billCount >= stations[i].billAcceptorThresholds?.billCountWarning) {
          console.log(`   🟡 Предупреждающий порог превышен`);
        } else {
          console.log(`   ✅ В норме`);
        }

        updated = true;
        break;
      }
    }

    if (updated) break;
  }

  if (!updated) {
    console.log(`❌ Станция с кодом "${stationCode}" не найдена`);
  }
}

const stationCode = process.argv[2];
const billCount = parseInt(process.argv[3]);

if (!stationCode || isNaN(billCount)) {
  console.log('Использование: node update-station-bill-count.js <код_станции> <количество_купюр>');
  console.log('Пример: node update-station-bill-count.js 4 320');
  process.exit(1);
}

updateStationBillCount(stationCode, billCount).catch(console.error);
