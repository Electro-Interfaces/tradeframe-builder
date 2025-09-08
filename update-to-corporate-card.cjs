/**
 * Обновление способа оплаты на corporate_card (который разрешен в constraint)
 * Изменяет 10% случайных операций на corporate_card для демонстрации альтернативного способа оплаты
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function updateToCorporateCard() {
  try {
    console.log('🔍 Получаем операции для изменения на corporate_card...');
    
    // Получаем все операции, кроме уже имеющих corporate_card
    const { data: allOperations, error: fetchError } = await supabase
      .from('operations')
      .select('id, payment_method')
      .neq('payment_method', 'corporate_card');
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`📊 Найдено ${allOperations.length} операций без corporate_card`);
    
    if (allOperations.length === 0) {
      console.log('⚠️ Нет операций для обновления');
      return;
    }
    
    // Вычисляем количество операций для изменения (10%)
    const targetCorporateCards = Math.ceil(allOperations.length * 0.1);
    
    console.log(`🎯 Изменим ${targetCorporateCards} операций на corporate_card`);
    
    // Выбираем случайные операции для изменения
    const shuffled = allOperations.sort(() => 0.5 - Math.random());
    const operationsToUpdate = shuffled.slice(0, targetCorporateCards);
    
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
            payment_method: 'corporate_card',
            details: `Корпоративная карта (было: ${operation.payment_method})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', operation.id);
        
        if (updateError) {
          console.error(`❌ Ошибка обновления ${operation.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Обновлено: ${operation.id} (${operation.payment_method} → corporate_card)`);
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
    
    // Проверяем итоговое количество всех способов оплаты
    const paymentMethods = ['cash', 'bank_card', 'fuel_card', 'corporate_card', 'online_order'];
    
    console.log(`\n📊 Статистика способов оплаты:`);
    let totalOperations = 0;
    
    for (const method of paymentMethods) {
      const { count } = await supabase
        .from('operations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', method);
        
      totalOperations += count || 0;
      console.log(`💳 ${method}: ${count || 0}`);
    }
    
    console.log(`📊 Всего операций: ${totalOperations}`);
    
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

updateToCorporateCard().then((success) => {
  process.exit(success ? 0 : 1);
});