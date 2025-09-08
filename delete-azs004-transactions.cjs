const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAzs004Transactions() {
  console.log('🔍 Удаление всех транзакций для АЗС №004...');

  try {
    // Сначала подсчитаем количество транзакций для подтверждения
    const { count: beforeCount, error: countError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .ilike('trading_point_name', '%АЗС №004%');

    if (countError) {
      throw countError;
    }

    console.log(`📊 Найдено ${beforeCount} транзакций для удаления`);

    if (beforeCount === 0) {
      console.log('✅ Транзакций для удаления не найдено');
      return;
    }

    // Удаляем все транзакции для АЗС №004
    console.log('🗑️ Выполнение удаления...');
    
    const { error: deleteError } = await supabase
      .from('operations')
      .delete()
      .ilike('trading_point_name', '%АЗС №004%');

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Команда удаления выполнена успешно`);

    // Проверяем, что транзакции действительно удалены
    const { count: afterCount, error: checkError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .ilike('trading_point_name', '%АЗС №004%');

    if (checkError) {
      throw checkError;
    }

    if (afterCount === 0) {
      console.log(`✅ УСПЕШНО: Все ${beforeCount} транзакций для АЗС №004 удалены из базы данных`);
    } else {
      console.log(`⚠️ Внимание: После удаления осталось ${afterCount} транзакций`);
    }

    // Дополнительная проверка по trading_point_id
    const { count: byIdCount, error: byIdError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('trading_point_id', '6969b08d-1cbe-45c2-ae9c-8002c7022b59');

    if (byIdError) {
      console.log('⚠️ Ошибка при проверке по trading_point_id:', byIdError);
    } else {
      console.log(`🔍 Проверка по trading_point_id: осталось ${byIdCount} транзакций`);
    }

  } catch (error) {
    console.error('❌ Ошибка при удалении транзакций:', error);
    console.error('Детали ошибки:', error.message);
  }
}

// Запуск скрипта
deleteAzs004Transactions();