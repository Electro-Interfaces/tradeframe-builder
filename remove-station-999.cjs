require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('\n🗑️  Удаление станции 999 из настроек тенанта БТО...\n');

  // 1. Получить текущие настройки БТО
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('id, name, settings')
    .eq('name', 'БТО')
    .eq('type', 'network')
    .single();

  if (fetchError) {
    console.error('❌ Ошибка получения тенанта:', fetchError);
    return;
  }

  console.log(`✅ Тенант найден: ${tenant.name} (ID: ${tenant.id})`);

  // 2. Фильтруем станции, удаляя 999
  const currentStations = tenant.settings?.stations || [];
  console.log(`📊 Текущее количество станций: ${currentStations.length}`);

  const station999 = currentStations.find(s => s.code === '999' || s.code === 999);
  if (station999) {
    console.log(`\n🔍 Найдена станция для удаления:`);
    console.log(`   Код: ${station999.code}`);
    console.log(`   Название: ${station999.name}`);
    console.log(`   Активна: ${station999.active}`);
  } else {
    console.log('⚠️ Станция 999 не найдена в настройках');
    return;
  }

  const filteredStations = currentStations.filter(s => s.code !== '999' && s.code !== 999);
  console.log(`\n📊 Станций после удаления: ${filteredStations.length}`);

  // 3. Обновляем настройки тенанта
  const updatedSettings = {
    ...tenant.settings,
    stations: filteredStations
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', tenant.id);

  if (updateError) {
    console.error('❌ Ошибка обновления:', updateError);
    return;
  }

  console.log('\n✅ Станция 999 успешно удалена из настроек тенанта БТО!');
  console.log('\n📋 Оставшиеся станции:');
  filteredStations.forEach(st => {
    console.log(`   ${st.code} - ${st.name}`);
  });
})();
