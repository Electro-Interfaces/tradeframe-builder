const { createClient } = require('@supabase/supabase-js');

async function cleanupStation4Operations() {
  try {
    console.log('🚀 Очистка операций для сети 15, станции 4...');
    
    // Конфигурация Supabase
    const supabaseUrl = 'https://vxlswbjgsjdvsgwojlka.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bHN3Ympnc2pkdnNnd29qbGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MzI3MTYsImV4cCI6MjA0OTMwODcxNn0.aDGa_3JoNDJaQg5fUECqjqUBBVa9lLCxzWLdBVzN6Ws';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔗 Подключение к Supabase установлено');
    
    // 1. Найдем торговую точку "АЗС 4" для сети 15
    console.log('🔍 Поиск торговой точки АЗС 4...');
    const { data: tradingPoints, error: tpError } = await supabase
      .from('trading_points')
      .select('id, external_id, name, network_id')
      .or('external_id.eq.4,name.ilike.%АЗС 4%,name.ilike.%станция 4%');
    
    if (tpError) {
      console.error('❌ Ошибка поиска торговой точки:', tpError);
      process.exit(1);
    }
    
    console.log('📍 Найденные торговые точки:', tradingPoints);
    
    // Найдем точку с external_id = "4"
    const station4 = tradingPoints?.find(tp => tp.external_id === '4' || tp.external_id === 4);
    
    if (!station4) {
      console.log('❌ Торговая точка АЗС 4 не найдена');
      process.exit(1);
    }
    
    console.log(`✅ Найдена торговая точка: ${station4.name} (ID: ${station4.id})`);
    
    // 2. Проверяем операции до 2 сентября 2025 для этой станции
    console.log('🔍 Проверяем операции за август для станции 4...');
    const { data: operationsToCheck, error: checkError } = await supabase
      .from('operations')
      .select('id, start_time, operation_type, total_cost')
      .eq('trading_point_id', station4.id)
      .lt('start_time', '2025-09-02T00:00:00Z')
      .order('start_time');
    
    if (checkError) {
      console.error('❌ Ошибка при проверке операций:', checkError);
      process.exit(1);
    }
    
    const countToDelete = operationsToCheck?.length || 0;
    console.log(`📊 Найдено операций станции 4 за август: ${countToDelete}`);
    
    if (countToDelete === 0) {
      console.log('✅ Операций станции 4 за август не найдено, уже чисто');
      return;
    }
    
    // Показываем детали операций
    console.log('\n📋 Операции к удалению:');
    operationsToCheck.forEach((op, index) => {
      console.log(`   ${index + 1}. ${op.start_time} - ${op.operation_type} - ${op.total_cost || 0}₽`);
    });
    
    // Показываем диапазон дат
    if (operationsToCheck.length > 0) {
      const firstOp = operationsToCheck[0];
      const lastOp = operationsToCheck[operationsToCheck.length - 1];
      console.log(`\n📅 Диапазон: ${firstOp.start_time} → ${lastOp.start_time}`);
    }
    
    console.log('\n⚠️ Станция 4 работает только с 2 сентября 2025');
    console.log('ℹ️ Все операции до этой даты являются демо-данными');
    
    // 3. Удаляем операции станции 4 до 2 сентября
    console.log('\n🗑️ Удаляем демо-операции станции 4...');
    const { data: deletedOps, error: deleteError } = await supabase
      .from('operations')
      .delete()
      .eq('trading_point_id', station4.id)
      .lt('start_time', '2025-09-02T00:00:00Z')
      .select('id');
    
    if (deleteError) {
      console.error('❌ Ошибка при удалении операций:', deleteError);
      process.exit(1);
    }
    
    const deletedCount = deletedOps?.length || 0;
    console.log(`✅ Удалено операций станции 4: ${deletedCount}`);
    
    // 4. Проверяем результат
    console.log('\n🔍 Проверяем результат...');
    const { data: remainingAugustOps, error: verifyError } = await supabase
      .from('operations')
      .select('id')
      .eq('trading_point_id', station4.id)
      .lt('start_time', '2025-09-02T00:00:00Z');
    
    if (verifyError) {
      console.error('❌ Ошибка при проверке:', verifyError);
    } else {
      const remainingCount = remainingAugustOps?.length || 0;
      if (remainingCount === 0) {
        console.log('✅ Операций станции 4 за август не осталось');
      } else {
        console.log(`⚠️ Осталось ${remainingCount} операций станции 4 за август`);
      }
    }
    
    // 5. Проверяем сентябрьские операции станции 4
    const { data: septemberOps, error: septError } = await supabase
      .from('operations')
      .select('id, start_time')
      .eq('trading_point_id', station4.id)
      .gte('start_time', '2025-09-02T00:00:00Z')
      .order('start_time');
    
    if (septError) {
      console.error('❌ Ошибка при проверке сентябрьских операций:', septError);
    } else {
      const septemberCount = septemberOps?.length || 0;
      console.log(`✅ Реальных операций станции 4 с 2 сентября: ${septemberCount}`);
      
      if (septemberCount > 0) {
        const firstRealOp = septemberOps[0];
        console.log(`   Первая реальная операция: ${firstRealOp.start_time}`);
      }
    }
    
    console.log('\n🎉 ОЧИСТКА СТАНЦИИ 4 ЗАВЕРШЕНА!');
    console.log('❌ Демо-данные станции 4 за август удалены');
    console.log('✅ Реальные данные станции 4 с 2 сентября сохранены');
    console.log('🏪 Теперь АЗС 4 показывает только актуальные транзакции');
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:');
    console.error(error);
    process.exit(1);
  }
}

// Запускаем очистку
cleanupStation4Operations();