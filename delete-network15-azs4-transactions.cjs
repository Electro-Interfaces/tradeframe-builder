const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteNetwork15Station4Transactions() {
  console.log('🔍 Проверка транзакций для сети 15, АЗС 4...');

  try {
    // Сначала найдем все транзакции для сети 15, АЗС 4
    const { data: transactions, error: selectError } = await supabase
      .from('operations')
      .select('*')
      .eq('network_id', 15)
      .eq('trading_point_id', 4);

    if (selectError) {
      throw selectError;
    }

    console.log(`📊 Найдено ${transactions.length} транзакций для сети 15, АЗС 4`);

    if (transactions.length === 0) {
      console.log('✅ Транзакций для удаления не найдено');
      return;
    }

    // Показываем статистику найденных транзакций
    const transactionTypes = transactions.reduce((acc, t) => {
      acc[t.operation_type] = (acc[t.operation_type] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Статистика найденных транзакций:');
    Object.entries(transactionTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    // Удаляем все найденные транзакции
    console.log('🗑️ Удаление транзакций...');
    
    const { error: deleteError } = await supabase
      .from('operations')
      .delete()
      .eq('network_id', 15)
      .eq('trading_point_id', 4);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Успешно удалено ${transactions.length} транзакций для сети 15, АЗС 4`);

    // Проверяем, что транзакции действительно удалены
    const { data: remainingTransactions, error: checkError } = await supabase
      .from('operations')
      .select('*')
      .eq('network_id', 15)
      .eq('trading_point_id', 4);

    if (checkError) {
      throw checkError;
    }

    if (remainingTransactions.length === 0) {
      console.log('✅ Подтверждено: все транзакции сети 15, АЗС 4 удалены');
    } else {
      console.log(`⚠️ Внимание: осталось ${remainingTransactions.length} транзакций`);
    }

  } catch (error) {
    console.error('❌ Ошибка при удалении транзакций:', error);
  }
}

// Запуск скрипта
deleteNetwork15Station4Transactions();