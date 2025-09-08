/**
 * Проверка и очистка данных для сети 15, АЗС код 4
 * Сначала проверяем наличие данных, затем очищаем
 */

import { createClient } from '@supabase/supabase-js';

// Суpabase конфигурация
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findNetworkAndStation() {
  console.log('🔍 Поиск сети 15 и АЗС с кодом 4...\n');
  
  try {
    // Сначала получим структуру таблицы networks
    console.log('📋 Получение всех сетей...');
    const { data: allNetworks, error: allNetworksError } = await supabase
      .from('networks')
      .select('*')
      .limit(10);
      
    if (allNetworksError) {
      console.error('❌ Ошибка получения сетей:', allNetworksError);
      return null;
    }
    
    console.log(`🏢 Всего найдено сетей: ${allNetworks?.length || 0}`);
    allNetworks?.forEach(network => {
      console.log(`  - ID: ${network.id}, Имя: "${network.name}"`);
      if (network.code) console.log(`    Код: "${network.code}"`);
      if (network.external_id) console.log(`    External ID: "${network.external_id}"`);
    });
    
    // Поиск сети 15 по разным полям
    const networks = allNetworks?.filter(n => 
      n.name?.includes('15') || 
      n.code?.includes('15') || 
      n.external_id?.includes('15')
    ) || [];
    
    console.log(`\n🎯 Найдено сетей с '15': ${networks.length}`);
    
    // Получим структуру таблицы trading_points
    console.log('\n📋 Получение торговых точек...');
    const { data: allTradingPoints, error: allTpError } = await supabase
      .from('trading_points')
      .select('*')
      .limit(10);
      
    if (allTpError) {
      console.error('❌ Ошибка получения торговых точек:', allTpError);
      return null;
    }
    
    console.log(`\n⛽ Всего найдено торговых точек: ${allTradingPoints?.length || 0}`);
    allTradingPoints?.forEach(tp => {
      console.log(`  - ID: ${tp.id}, Имя: "${tp.name}", Network ID: ${tp.network_id}`);
      if (tp.code) console.log(`    Код: "${tp.code}"`);
      if (tp.external_id) console.log(`    External ID: "${tp.external_id}"`);
      if (tp.station_code) console.log(`    Station Code: "${tp.station_code}"`);
    });
    
    // Поиск торговых точек с кодом 4
    const tradingPoints = allTradingPoints?.filter(tp => 
      tp.name?.includes('4') || 
      tp.code?.includes('4') || 
      tp.external_id?.includes('4') ||
      tp.station_code?.includes('4')
    ) || [];
    
    console.log(`\n🎯 Найдено торговых точек с '4': ${tradingPoints.length}`);
    
    // Найдем пересечения
    let targetNetworkId = null;
    let targetTradingPoints = [];
    
    if (networks.length > 0) {
      targetNetworkId = networks[0].id;
      targetTradingPoints = allTradingPoints?.filter(tp => 
        tp.network_id === targetNetworkId && (
          tp.name?.includes('4') || 
          tp.code?.includes('4') || 
          tp.external_id?.includes('4') ||
          tp.station_code?.includes('4')
        )
      ) || [];
    } else {
      // Если сеть 15 не найдена, возьмем любые торговые точки с кодом 4
      targetTradingPoints = tradingPoints;
    }
    
    console.log(`\n🎯 Целевая сеть ID: ${targetNetworkId}`);
    console.log('🎯 Целевые торговые точки:', targetTradingPoints?.length || 0);
    targetTradingPoints?.forEach(tp => {
      console.log(`  - ID: ${tp.id}, Имя: "${tp.name}"`);
    });
    
    return {
      networks: allNetworks,
      tradingPoints: allTradingPoints,
      targetNetworkId,
      targetTradingPoints
    };
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    return null;
  }
}

async function checkOperationsAndTransactions(targetData) {
  if (!targetData?.targetTradingPoints?.length) {
    console.log('\n❌ Нет целевых торговых точек для проверки операций');
    return;
  }
  
  console.log('\n🔍 Проверка операций и транзакций...');
  
  const tradingPointIds = targetData.targetTradingPoints.map(tp => tp.id);
  
  try {
    // Проверяем операции
    const { data: operations, error: opsError } = await supabase
      .from('operations')
      .select('*')
      .in('trading_point_id', tradingPointIds);
      
    if (opsError) {
      console.error('❌ Ошибка поиска операций:', opsError);
    } else {
      console.log(`📊 Найдено операций: ${operations?.length || 0}`);
      if (operations?.length > 0) {
        console.log('  Последние 5 операций:');
        operations.slice(0, 5).forEach(op => {
          console.log(`    - ID: ${op.id}, Тип: ${op.operation_type}, Время: ${op.start_time}, ТП: ${op.trading_point_id}`);
        });
      }
    }
    
    // Проверяем транзакции
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('trading_point_id', tradingPointIds);
      
    if (txError) {
      console.error('❌ Ошибка поиска транзакций:', txError);
    } else {
      console.log(`💳 Найдено транзакций: ${transactions?.length || 0}`);
      if (transactions?.length > 0) {
        console.log('  Последние 5 транзакций:');
        transactions.slice(0, 5).forEach(tx => {
          console.log(`    - ID: ${tx.id}, Сумма: ${tx.total_amount}, Время: ${tx.created_at}, ТП: ${tx.trading_point_id}`);
        });
      }
    }
    
    return {
      operations: operations || [],
      transactions: transactions || []
    };
    
  } catch (error) {
    console.error('💥 Ошибка проверки данных:', error);
    return null;
  }
}

async function cleanupData(targetData, dataToClean) {
  if (!dataToClean?.operations?.length && !dataToClean?.transactions?.length) {
    console.log('\n✅ Нет данных для очистки');
    return;
  }
  
  console.log('\n🗑️  Начинаем очистку данных...');
  
  const tradingPointIds = targetData.targetTradingPoints.map(tp => tp.id);
  
  try {
    // Очистка операций
    if (dataToClean.operations.length > 0) {
      console.log(`🔄 Удаление ${dataToClean.operations.length} операций...`);
      const { error: opsDeleteError } = await supabase
        .from('operations')
        .delete()
        .in('trading_point_id', tradingPointIds);
        
      if (opsDeleteError) {
        console.error('❌ Ошибка удаления операций:', opsDeleteError);
      } else {
        console.log('✅ Операции успешно удалены');
      }
    }
    
    // Очистка транзакций
    if (dataToClean.transactions.length > 0) {
      console.log(`🔄 Удаление ${dataToClean.transactions.length} транзакций...`);
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .in('trading_point_id', tradingPointIds);
        
      if (txDeleteError) {
        console.error('❌ Ошибка удаления транзакций:', txDeleteError);
      } else {
        console.log('✅ Транзакции успешно удалены');
      }
    }
    
    console.log('\n🎉 Очистка завершена!');
    
  } catch (error) {
    console.error('💥 Ошибка при очистке:', error);
  }
}

async function main() {
  console.log('🚀 Запуск проверки и очистки данных для сети 15, АЗС код 4\n');
  
  // Шаг 1: Найти целевую сеть и АЗС
  const targetData = await findNetworkAndStation();
  if (!targetData) {
    console.log('❌ Не удалось найти целевые данные');
    return;
  }
  
  // Шаг 2: Проверить наличие операций и транзакций
  const dataToClean = await checkOperationsAndTransactions(targetData);
  if (!dataToClean) {
    console.log('❌ Не удалось проверить данные');
    return;
  }
  
  // Шаг 3: Очистка данных
  await cleanupData(targetData, dataToClean);
  
  console.log('\n✨ Процесс завершен');
}

// Запуск
main().catch(console.error);