/**
 * Исправление операций сети 15 - обновление trading_point_id
 * Переназначаем операции на правильную торговую точку АЗС 4 сети 15
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNetwork15Operations() {
  console.log('🔧 Исправляем операции сети 15...');
  
  try {
    // Текущие данные операций сети 15
    const incorrectTradingPointId = '6ec53f75-c3c1-4afc-81f6-19c588ae1d28'; // АЗС №004 демо сети
    const correctTradingPointId = '6969b08d-1cbe-45c2-ae9c-8002c7022b59';   // АЗС 4 сети 15
    
    // 1. Проверим операции с неправильным trading_point_id
    const { data: incorrectOps, error: checkError } = await supabase
      .from('operations')
      .select('*')
      .eq('trading_point_id', incorrectTradingPointId);
    
    if (checkError) {
      console.error('❌ Ошибка проверки операций:', checkError);
      return;
    }
    
    console.log(`📊 Найдено операций с неправильным trading_point_id: ${incorrectOps?.length || 0}`);
    
    if (!incorrectOps || incorrectOps.length === 0) {
      console.log('✅ Операций для исправления не найдено');
      return;
    }
    
    // 2. Показываем какие операции будут исправлены
    console.log('\n📋 Операции для исправления:');
    incorrectOps.forEach(op => {
      console.log(`- ${op.id}: ${op.trading_point_name} (${op.total_cost}₽)`);
    });
    
    // 3. Обновляем trading_point_id для этих операций
    const operationIds = incorrectOps.map(op => op.id);
    
    const { data: updatedOps, error: updateError } = await supabase
      .from('operations')
      .update({ 
        trading_point_id: correctTradingPointId,
        trading_point_name: 'АЗС 4',  // Обновляем название тоже
        updated_at: new Date().toISOString()
      })
      .in('id', operationIds)
      .select('*');
    
    if (updateError) {
      console.error('❌ Ошибка обновления операций:', updateError);
      return;
    }
    
    console.log(`✅ Успешно обновлено операций: ${updatedOps?.length || 0}`);
    
    // 4. Проверим результат - операции сети 15
    const { data: network15Ops, error: finalCheckError } = await supabase
      .from('operations')
      .select('*')
      .eq('trading_point_id', correctTradingPointId);
    
    if (finalCheckError) {
      console.error('❌ Ошибка финальной проверки:', finalCheckError);
      return;
    }
    
    console.log(`\n🎉 Итого операций сети 15: ${network15Ops?.length || 0}`);
    
    // 5. Подсчитаем статистику
    const totalRevenue = network15Ops?.reduce((sum, op) => sum + (op.total_cost || 0), 0) || 0;
    const totalVolume = network15Ops?.reduce((sum, op) => sum + (op.quantity || 0), 0) || 0;
    
    console.log(`💰 Общая выручка: ${totalRevenue.toFixed(2)}₽`);
    console.log(`⛽ Общий объем: ${totalVolume.toFixed(2)}л`);
    
    console.log('\n✅ Исправление завершено! Теперь страница операций корректно отобразит данные сети 15.');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении операций:', error);
  }
}

// Запускаем исправление
fixNetwork15Operations();