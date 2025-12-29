require('dotenv').config({ path: './server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, settings')
    .eq('type', 'network')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📋 Список станций во всех сетях:\n');
  data.forEach(tenant => {
    console.log(`\n=== ${tenant.name} ===`);
    const stations = tenant.settings?.stations || [];
    stations.forEach(st => {
      const activeStatus = st.active === false ? '❌ НЕАКТИВНА' : '✅ активна';
      console.log(`  ${st.code.padEnd(6)} ${st.name.padEnd(30)} ${activeStatus}`);

      if (st.code === '999' || st.code === 999) {
        console.log(`\n  ⚠️ НАЙДЕНА СТАНЦИЯ 999!`);
        console.log(`  Статус active: ${st.active}`);
        console.log(`  JSON:`, JSON.stringify(st, null, 2));
      }
    });
  });
})();
