import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjU4MTgxMCwiZXhwIjoyMDQyMTU3ODEwfQ.YYUPuWuZoHqWCF6yGAx1BzGBALY6bpRfqkjxOhSLNLQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkNetwork15Tanks() {
  console.log('=== Проверка резервуаров и оборудования для сети 15 ===\n');

  try {
    // 1. Проверяем саму сеть 15
    console.log('1. Проверка сети 15:');
    const { data: network, error: networkError } = await supabase
      .from('networks')
      .select('*')
      .eq('id', 15)
      .single();

    if (networkError) {
      console.log('Ошибка при получении сети:', networkError);
      return;
    }
    console.log('Сеть найдена:', network ? `${network.name} (ID: ${network.id})` : 'НЕ НАЙДЕНА');
    console.log('');

    // 2. Получаем все торговые точки сети 15
    console.log('2. Торговые точки сети 15:');
    const { data: tradingPoints, error: tpError } = await supabase
      .from('trading_points')
      .select('id, name, external_id')
      .eq('network_id', 15);

    if (tpError) {
      console.log('Ошибка при получении торговых точек:', tpError);
    } else {
      console.log(`Найдено торговых точек: ${tradingPoints.length}`);
      tradingPoints.forEach(tp => {
        console.log(`  - ${tp.name} (ID: ${tp.id}, External: ${tp.external_id})`);
      });
    }
    console.log('');

    // 3. Проверяем резервуары для каждой торговой точки
    console.log('3. Резервуары по торговым точкам:');
    for (const tp of tradingPoints || []) {
      const { data: tanks, error: tanksError } = await supabase
        .from('tanks')
        .select('*')
        .eq('trading_point_id', tp.id);

      if (tanksError) {
        console.log(`  Ошибка при получении резервуаров для ${tp.name}:`, tanksError);
      } else {
        console.log(`  ${tp.name}: ${tanks.length} резервуаров`);
        tanks.forEach(tank => {
          console.log(`    - Резервуар ${tank.tank_number}: ${tank.fuel_type}, объем ${tank.max_volume}л, текущий ${tank.current_volume}л`);
        });
      }
    }
    console.log('');

    // 4. Проверяем оборудование резервуаров
    console.log('4. Оборудование резервуаров (equipment):');
    const tpIds = tradingPoints?.map(tp => tp.id) || [];
    
    if (tpIds.length > 0) {
      const { data: equipment, error: equipError } = await supabase
        .from('equipment')
        .select('*')
        .in('trading_point_id', tpIds)
        .or('equipment_type.eq.tank,equipment_type.eq.fuel_tank,equipment_type.eq.reservoir');

      if (equipError) {
        console.log('Ошибка при получении оборудования:', equipError);
      } else {
        console.log(`Найдено оборудования резервуаров: ${equipment?.length || 0}`);
        
        // Группируем по торговым точкам
        const equipByTP = {};
        equipment?.forEach(eq => {
          const tpName = tradingPoints.find(tp => tp.id === eq.trading_point_id)?.name || 'Unknown';
          if (!equipByTP[tpName]) equipByTP[tpName] = [];
          equipByTP[tpName].push(eq);
        });

        Object.entries(equipByTP).forEach(([tpName, eqs]) => {
          console.log(`  ${tpName}:`);
          eqs.forEach(eq => {
            console.log(`    - ${eq.name} (Тип: ${eq.equipment_type}, ID: ${eq.id})`);
            if (eq.parameters) {
              console.log(`      Параметры: ${JSON.stringify(eq.parameters)}`);
            }
          });
        });
      }
    }
    console.log('');

    // 5. Проверяем шаблоны оборудования резервуаров
    console.log('5. Шаблоны оборудования резервуаров:');
    const { data: templates, error: templError } = await supabase
      .from('equipment_templates')
      .select('*')
      .or('equipment_type.eq.tank,equipment_type.eq.fuel_tank,equipment_type.eq.reservoir');

    if (templError) {
      console.log('Ошибка при получении шаблонов:', templError);
    } else {
      console.log(`Найдено шаблонов резервуаров: ${templates?.length || 0}`);
      templates?.forEach(tmpl => {
        console.log(`  - ${tmpl.name} (Тип: ${tmpl.equipment_type})`);
      });
    }
    console.log('');

    // 6. Итоговая статистика
    console.log('=== ИТОГОВАЯ СТАТИСТИКА ===');
    console.log(`Сеть 15: ${network ? 'НАЙДЕНА' : 'НЕ НАЙДЕНА'}`);
    console.log(`Торговых точек: ${tradingPoints?.length || 0}`);
    
    let totalTanks = 0;
    for (const tp of tradingPoints || []) {
      const { count } = await supabase
        .from('tanks')
        .select('*', { count: 'exact', head: true })
        .eq('trading_point_id', tp.id);
      totalTanks += count || 0;
    }
    console.log(`Всего резервуаров в таблице tanks: ${totalTanks}`);
    
    const equipmentCount = tpIds.length > 0 ? 
      (await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .in('trading_point_id', tpIds)
        .or('equipment_type.eq.tank,equipment_type.eq.fuel_tank,equipment_type.eq.reservoir')).count || 0
      : 0;
    console.log(`Оборудование резервуаров в таблице equipment: ${equipmentCount}`);

  } catch (error) {
    console.error('Неожиданная ошибка:', error);
  }
}

checkNetwork15Tanks();