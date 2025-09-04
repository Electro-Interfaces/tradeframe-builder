/**
 * Быстрая проверка количества операций в базе данных
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOperations() {
  console.log('🔍 Проверка операций в базе данных...\n');

  // Общее количество
  const { data: countData, count } = await supabase
    .from('operations')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Общее количество операций: ${count}`);

  // Группировка по типам
  const { data: byType } = await supabase
    .from('operations')
    .select('operation_type, status, trading_point_name, payment_method');

  if (byType) {
    const stats = {};
    const statusStats = {};
    const paymentStats = {};
    const pointStats = {};
    
    byType.forEach(op => {
      // По типам операций
      stats[op.operation_type] = (stats[op.operation_type] || 0) + 1;
      
      // По статусам
      statusStats[op.status] = (statusStats[op.status] || 0) + 1;
      
      // По способам оплаты
      if (op.payment_method) {
        paymentStats[op.payment_method] = (paymentStats[op.payment_method] || 0) + 1;
      }
      
      // По торговым точкам
      if (op.trading_point_name) {
        pointStats[op.trading_point_name] = (pointStats[op.trading_point_name] || 0) + 1;
      }
    });

    console.log('\n📈 Статистика по типам операций:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    console.log('\n🎯 Статистика по статусам:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    console.log('\n💳 Статистика по способам оплаты:');
    Object.entries(paymentStats).forEach(([method, count]) => {
      console.log(`  - ${method}: ${count}`);
    });

    console.log('\n🏪 Статистика по торговым точкам:');
    Object.entries(pointStats).forEach(([point, count]) => {
      console.log(`  - ${point}: ${count}`);
    });
  }

  console.log('\n✅ Проверка завершена!');
}

checkOperations().catch(console.error);