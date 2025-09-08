/**
 * Тестирование разрешенных способов оплаты
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentMethods() {
  const testMethods = [
    'cash',
    'bank_card', 
    'fuel_card',
    'online_order',
    'mobile_order',
    'card',
    'credit_card',
    'online'
  ];

  console.log('🧪 Тестируем разрешенные способы оплаты...\n');

  for (const method of testMethods) {
    try {
      console.log(`Тестирую "${method}"...`);
      
      const { data, error } = await supabase
        .from('operations')
        .insert({
          id: `TEST-${method}-${Date.now()}`,
          operation_type: 'sale',
          status: 'completed',
          start_time: '2025-08-31T12:00:00Z',
          payment_method: method,
          details: `Test ${method}`,
          created_at: '2025-08-31T12:00:00Z',
          updated_at: '2025-08-31T12:00:00Z'
        })
        .select();

      if (error) {
        console.log(`❌ "${method}" - НЕ РАЗРЕШЕН: ${error.message}`);
      } else {
        console.log(`✅ "${method}" - РАЗРЕШЕН`);
        
        // Удаляем тестовую запись
        await supabase
          .from('operations')
          .delete()
          .eq('id', `TEST-${method}-${Date.now()}`);
      }
    } catch (err) {
      console.log(`💥 "${method}" - ОШИБКА: ${err.message}`);
    }
  }
}

testPaymentMethods().then(() => {
  console.log('\n🎯 Тестирование завершено');
  process.exit(0);
}).catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});