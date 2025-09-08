const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findNetwork15Transactions() {
  console.log('🔍 Поиск транзакций для сети 15, АЗС 4...');

  try {
    // Сначала найдем все транзакции с "АЗС №004" в названии
    const { data: transactions, error: selectError } = await supabase
      .from('operations')
      .select('*')
      .ilike('trading_point_name', '%АЗС №004%');

    if (selectError) {
      throw selectError;
    }

    console.log(`📊 Найдено ${transactions.length} транзакций для АЗС №004`);

    if (transactions.length === 0) {
      // Попробуем найти по другим вариантам названия
      console.log('🔍 Поиск альтернативных названий АЗС...');
      
      const { data: allTransactions, error: allError } = await supabase
        .from('operations')
        .select('trading_point_name')
        .limit(50);
        
      if (allError) {
        throw allError;
      }
      
      const uniqueNames = [...new Set(allTransactions.map(t => t.trading_point_name))];
      console.log('📋 Доступные названия торговых точек:');
      uniqueNames.forEach(name => console.log(`  - ${name}`));
      
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

    // Показываем уникальные trading_point_id для этих транзакций
    const uniqueTradingPointIds = [...new Set(transactions.map(t => t.trading_point_id))];
    console.log('\n🏪 Найденные trading_point_id:');
    uniqueTradingPointIds.forEach(id => console.log(`  - ${id}`));

    // Показываем уникальные названия торговых точек
    const uniqueTradingPointNames = [...new Set(transactions.map(t => t.trading_point_name))];
    console.log('\n📍 Найденные названия торговых точек:');
    uniqueTradingPointNames.forEach(name => console.log(`  - ${name}`));

    return transactions;

  } catch (error) {
    console.error('❌ Ошибка при поиске транзакций:', error);
  }
}

// Запуск скрипта
findNetwork15Transactions();