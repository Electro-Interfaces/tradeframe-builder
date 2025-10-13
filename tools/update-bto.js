import { createClient } from '@supabase/supabase-js';

// Используем те же credentials что и sql-direct.js
const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function updateBTONetwork() {
  console.log('🔄 Обновление сети БТО...\n');

  try {
    // Обновляем сеть БТО
    const { data, error } = await supabase
      .from('tenants')
      .update({
        name: 'БТО',
        settings: {
          region: 'Башкортостан',
          external_id: '15',
          description: 'Сеть БТО',
          stations: [
            {
              code: '4',
              name: 'БТО АЗС №4',
              active: true,
              address: 'г. Уфа, ул. Победы, 100'
            }
          ]
        },
        updated_at: new Date().toISOString()
      })
      .eq('code', 'bto')
      .select();

    if (error) {
      console.error('❌ Ошибка при обновлении:', error);
      process.exit(1);
    }

    console.log('✅ Сеть БТО успешно обновлена!');
    console.log('\n📊 Обновленные данные:');
    console.log(JSON.stringify(data, null, 2));

    // Проверяем результат
    const { data: checkData, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (checkError) {
      console.error('❌ Ошибка при проверке:', checkError);
      process.exit(1);
    }

    console.log('\n🔍 Проверка:');
    console.log(`Название: ${checkData.name}`);
    console.log(`External ID: ${checkData.settings.external_id}`);
    console.log(`Количество станций: ${checkData.settings.stations.length}`);
    console.log(`Станция: ${checkData.settings.stations[0].name} (код: ${checkData.settings.stations[0].code})`);

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

updateBTONetwork();
