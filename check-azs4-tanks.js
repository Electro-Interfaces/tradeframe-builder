/**
 * Проверка резервуаров для АЗС 4 в базе данных
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_TRADING_POINT_ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'; // АЗС 4

async function checkTanksData() {
  console.log('🔍 Проверяем резервуары в базе данных для АЗС 4');
  console.log('ID торговой точки:', TARGET_TRADING_POINT_ID);
  console.log('================================\n');
  
  // Проверим таблицу tanks
  console.log('📊 ТАБЛИЦА: tanks');
  console.log('------------------');
  
  const { data: tanksData, error: tanksError } = await supabase
    .from('tanks')
    .select('*')
    .eq('trading_point_id', TARGET_TRADING_POINT_ID);
    
  if (tanksError) {
    console.error('❌ Ошибка при запросе tanks:', tanksError);
  } else {
    console.log(`Найдено записей: ${tanksData?.length || 0}`);
    if (tanksData && tanksData.length > 0) {
      tanksData.forEach((tank, i) => {
        console.log(`  ${i+1}. ${tank.name} | ID: ${tank.id}`);
        console.log(`     - Тип топлива: ${tank.fuelType || 'не указан'}`);
        console.log(`     - Статус: ${tank.status || 'не указан'}`);
        console.log(`     - trading_point_id: ${tank.trading_point_id}`);
      });
    }
  }
  
  console.log('\n📊 ТАБЛИЦА: equipment (fuel_tank)');
  console.log('-----------------------------------');
  
  // Проверим таблицу equipment
  const { data: equipData, error: equipError } = await supabase
    .from('equipment')
    .select('*')
    .eq('trading_point_id', TARGET_TRADING_POINT_ID)
    .eq('system_type', 'fuel_tank');
    
  if (equipError) {
    console.error('❌ Ошибка при запросе equipment:', equipError);
  } else {
    console.log(`Найдено записей: ${equipData?.length || 0}`);
    if (equipData && equipData.length > 0) {
      equipData.forEach((equip, i) => {
        console.log(`  ${i+1}. ${equip.name} | ${equip.display_name || 'нет display_name'}`);
        console.log(`     - ID: ${equip.id}`);
        console.log(`     - trading_point_id: ${equip.trading_point_id}`);
        console.log(`     - system_type: ${equip.system_type}`);
        console.log(`     - status: ${equip.status || 'не указан'}`);
      });
    }
  }
  
  // Также проверим название торговой точки
  console.log('\n📊 ТОРГОВАЯ ТОЧКА');
  console.log('------------------');
  
  const { data: tradingPointData, error: tradingPointError } = await supabase
    .from('trading_points')
    .select('*')
    .eq('id', TARGET_TRADING_POINT_ID);
    
  if (tradingPointError) {
    console.error('❌ Ошибка при запросе trading_points:', tradingPointError);
  } else {
    if (tradingPointData && tradingPointData.length > 0) {
      const tp = tradingPointData[0];
      console.log(`Название: ${tp.name}`);
      console.log(`Код: ${tp.code || 'не указан'}`);
      console.log(`External ID: ${tp.external_id || 'не указан'}`);
      console.log(`Network ID: ${tp.network_id}`);
    } else {
      console.log('❌ Торговая точка не найдена!');
    }
  }
}

checkTanksData().catch(console.error);