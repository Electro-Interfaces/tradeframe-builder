const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTczOTM0NSwiZXhwIjoyMDUxMzE1MzQ1fQ.EGsqZKLNrEolXoYSB3K2r1rXCRzIVV6T3lLZ_IkEqZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearStation4() {
  const station4TradingPointId = '6969b08d-1cbe-45c2-ae9c-8002c7022b59';
  
  console.log('🗑️ Удаление всех операций для АЗС №004...');
  
  try {
    const { data, error, count } = await supabase
      .from('operations')
      .delete({ count: 'exact' })
      .eq('trading_point_id', station4TradingPointId);

    if (error) {
      console.error('❌ Ошибка:', error);
      process.exit(1);
    }

    console.log(`✅ Успешно удалено ${count || 0} операций для АЗС №004`);
    console.log('🎉 База данных очищена, готова к тестированию!');
  } catch (err) {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  }
}

clearStation4();