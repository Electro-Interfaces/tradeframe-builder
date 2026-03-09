// Тестовый скрипт для проверки данных торговых точек
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testTradingPoints() {
  // Получаем все tenants с type='network'
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('type', 'network')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log('✅ Найдено сетей:', tenants.length);

  for (const tenant of tenants) {
    console.log(`\n📍 Сеть: ${tenant.name} (code: ${tenant.code})`);
    const stations = tenant.settings?.stations || [];
    console.log(`  Станций: ${stations.length}`);

    for (const station of stations) {
      console.log(`  - ${station.name}`);
      console.log(`    code: ${station.code}`);
      console.log(`    active: ${station.active}`);
      console.log(`    ID будет: ${tenant.code}-azs-${station.code}`);
      console.log(`    external_id будет: ${station.code}`);
    }
  }
}

testTradingPoints();
