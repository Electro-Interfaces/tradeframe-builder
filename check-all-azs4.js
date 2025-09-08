/**
 * Проверка всех торговых точек с именем АЗС 4 и их резервуаров
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllAZS4() {
  console.log('🔍 Ищем все торговые точки с названием "АЗС 4"');
  console.log('====================================================\n');
  
  // Найдем все торговые точки с названием АЗС 4
  const { data: tradingPoints, error: tpError } = await supabase
    .from('trading_points')
    .select('*')
    .ilike('name', '%АЗС%4%');
    
  if (tpError) {
    console.error('❌ Ошибка при поиске торговых точек:', tpError);
    return;
  }
  
  console.log(`📊 Найдено торговых точек: ${tradingPoints?.length || 0}`);
  
  if (!tradingPoints || tradingPoints.length === 0) {
    console.log('⚠️  Торговые точки с названием "АЗС 4" не найдены');
    return;
  }
  
  // Проверим каждую торговую точку
  for (let i = 0; i < tradingPoints.length; i++) {
    const tp = tradingPoints[i];
    console.log(`\n🏪 ТОРГОВАЯ ТОЧКА ${i + 1}: ${tp.name}`);
    console.log(`   ID: ${tp.id}`);
    console.log(`   Code: ${tp.code || 'не указан'}`);
    console.log(`   External ID: ${tp.external_id || 'не указан'}`);
    console.log(`   Network ID: ${tp.network_id}`);
    
    // Проверим резервуары в tanks
    const { data: tanksData, error: tanksError } = await supabase
      .from('tanks')
      .select('*')
      .eq('trading_point_id', tp.id);
      
    if (tanksError) {
      console.error('   ❌ Ошибка при запросе tanks:', tanksError);
    } else {
      console.log(`   📊 Резервуары в tanks: ${tanksData?.length || 0}`);
      if (tanksData && tanksData.length > 0) {
        tanksData.forEach((tank, j) => {
          console.log(`      ${j+1}. ${tank.name} (${tank.fuelType || 'тип не указан'})`);
        });
      }
    }
    
    // Проверим оборудование fuel_tank
    const { data: equipData, error: equipError } = await supabase
      .from('equipment')
      .select('*')
      .eq('trading_point_id', tp.id)
      .eq('system_type', 'fuel_tank');
      
    if (equipError) {
      console.error('   ❌ Ошибка при запросе equipment:', equipError);
    } else {
      console.log(`   🏭 Оборудование fuel_tank: ${equipData?.length || 0}`);
      if (equipData && equipData.length > 0) {
        equipData.forEach((equip, j) => {
          console.log(`      ${j+1}. ${equip.name} / ${equip.display_name || 'нет display_name'}`);
        });
      }
    }
  }
  
  // Также проверим все резервуары без привязки к конкретной торговой точке
  console.log('\n🔍 Проверяем ВСЕ резервуары в базе данных:');
  console.log('==========================================');
  
  const { data: allTanks, error: allTanksError } = await supabase
    .from('tanks')
    .select('*, trading_points(name)')
    .limit(10);
    
  if (allTanksError) {
    console.error('❌ Ошибка при запросе всех резервуаров:', allTanksError);
  } else {
    console.log(`📊 Всего резервуаров в базе (первые 10): ${allTanks?.length || 0}`);
    if (allTanks && allTanks.length > 0) {
      allTanks.forEach((tank, i) => {
        const tpName = tank.trading_points?.name || 'торговая точка не найдена';
        console.log(`   ${i+1}. ${tank.name} | ТП: ${tpName} | ID ТП: ${tank.trading_point_id}`);
      });
    }
  }
}

checkAllAZS4().catch(console.error);