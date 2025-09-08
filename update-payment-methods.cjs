/**
 * Обновление способа оплаты существующих операций на online_order
 * Изменяет 10% случайных операций с других способов оплаты на online_order
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function updatePaymentMethods() {
  try {
    console.log('🔍 Получаем все операции...');
    
    // Получаем все операции
    const { data: allOperations, error: fetchError } = await supabase
      .from('operations')
      .select('id, payment_method')
      .neq('payment_method', 'online_order'); // исключаем уже имеющиеся online_order
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`📊 Найдено ${allOperations.length} операций без online_order`);
    
    if (allOperations.length === 0) {
      console.log('⚠️ Нет операций для обновления');
      return;
    }
    
    // Вычисляем количество операций для изменения (10%)
    const totalOperations = 250; // мы знаем что всего 250
    const targetOnlineOrders = Math.ceil(totalOperations * 0.1); // 25 операций
    
    console.log(`🎯 Нужно изменить ${targetOnlineOrders} операций на online_order`);
    
    // Выбираем случайные операции для изменения
    const shuffled = allOperations.sort(() => 0.5 - Math.random());
    const operationsToUpdate = shuffled.slice(0, targetOnlineOrders);
    
    console.log(`📝 Выбрано ${operationsToUpdate.length} операций для изменения`);
    
    // Обновляем каждую операцию
    let successCount = 0;
    let errorCount = 0;
    
    for (const operation of operationsToUpdate) {
      try {
        // Обновляем способ оплаты и детали
        const { error: updateError } = await supabase
          .from('operations')
          .update({
            payment_method: 'online_order',
            details: operation.payment_method === 'bank_card' ? 
              'Онлайн заказ через банковскую карту' :
              operation.payment_method === 'cash' ?
              'Онлайн заказ с наличной оплатой' :
              operation.payment_method === 'fuel_card' ?
              'Онлайн заказ топливной картой' :
              'Онлайн заказ топлива',
            updated_at: new Date().toISOString()
          })
          .eq('id', operation.id);
        
        if (updateError) {
          console.error(`❌ Ошибка обновления ${operation.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Обновлено: ${operation.id} (было: ${operation.payment_method})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Исключение при обновлении ${operation.id}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Результаты обновления:`);
    console.log(`✅ Успешно обновлено: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    
    // Проверяем итоговое количество
    const { count: finalOnlineOrderCount } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'online_order');
      
    const { count: totalCount } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n📊 Итоговая статистика:`);
    console.log(`💳 Операций с online_order: ${finalOnlineOrderCount}`);
    console.log(`📈 Процент от общего числа: ${((finalOnlineOrderCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount > 0) {
      console.log('🎉 Обновление завершено успешно!');
      return true;
    } else {
      console.log('💔 Не удалось обновить ни одной операции');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    return false;
  }
}

updatePaymentMethods().then((success) => {
  process.exit(success ? 0 : 1);
});