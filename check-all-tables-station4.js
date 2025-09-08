/**
 * Полная проверка всех таблиц для АЗС 4 (сеть 15)
 * и очистка всех найденных данных
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Целевые ID из предыдущей проверки
const TARGET_NETWORK_ID = 'b5e25b51-a950-481e-a09d-ac25e6b5d6ab'; // Норд Лайн, external_id: 15
const TARGET_TRADING_POINT_ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'; // АЗС 4

// Список таблиц для проверки
const TABLES_TO_CHECK = [
  'operations',
  'prices', 
  'price_history',
  'tanks',
  'equipment',
  'components',
  'fuel_stocks',
  'fuel_stock_history',
  'shift_reports',
  'messages',
  'user_document_acceptances',
  'notifications',
  'workflows',
  'workflow_executions',
  'trading_transactions',
  'api_logs',
  'system_logs',
  'equipment_events',
  'component_status_records'
];

async function checkTableForTradingPoint(tableName, tradingPointId) {
  try {
    console.log(`🔍 Проверка таблицы: ${tableName}`);
    
    // Попробуем разные поля для связи с торговой точкой
    const possibleFields = [
      'trading_point_id',
      'point_id', 
      'station_id',
      'network_id'
    ];
    
    let data = null;
    let usedField = null;
    
    for (const field of possibleFields) {
      try {
        const query = supabase.from(tableName).select('*');
        
        if (field === 'network_id') {
          query.eq(field, TARGET_NETWORK_ID);
        } else {
          query.eq(field, tradingPointId);
        }
        
        const result = await query.limit(10);
        
        if (!result.error && result.data && result.data.length > 0) {
          data = result.data;
          usedField = field;
          break;
        }
      } catch (fieldError) {
        // Поле не существует, пробуем следующее
        continue;
      }
    }
    
    if (data && data.length > 0) {
      console.log(`  ✅ Найдено ${data.length} записей по полю '${usedField}'`);
      console.log(`  📄 Первые записи:`, data.slice(0, 3).map(record => ({
        id: record.id,
        created_at: record.created_at || record.timestamp || 'N/A',
        [usedField]: record[usedField]
      })));
      
      return {
        tableName,
        field: usedField,
        count: data.length,
        data
      };
    } else {
      console.log(`  ⚪ Нет записей в таблице ${tableName}`);
      return null;
    }
    
  } catch (error) {
    console.log(`  ❌ Ошибка проверки таблицы ${tableName}:`, error.message);
    return null;
  }
}

async function getAllTablesData() {
  console.log('🚀 Начинаем проверку всех таблиц...\n');
  console.log(`🎯 Целевая сеть: ${TARGET_NETWORK_ID}`);
  console.log(`🎯 Целевая АЗС: ${TARGET_TRADING_POINT_ID}\n`);
  
  const results = [];
  
  for (const tableName of TABLES_TO_CHECK) {
    const result = await checkTableForTradingPoint(tableName, TARGET_TRADING_POINT_ID);
    if (result) {
      results.push(result);
    }
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function cleanupTableData(tableResult) {
  const { tableName, field, count, data } = tableResult;
  
  try {
    console.log(`🗑️  Очистка таблицы ${tableName} (${count} записей)...`);
    
    const query = supabase.from(tableName).delete();
    
    if (field === 'network_id') {
      query.eq(field, TARGET_NETWORK_ID);
    } else {
      query.eq(field, TARGET_TRADING_POINT_ID);
    }
    
    const { error } = await query;
    
    if (error) {
      console.log(`  ❌ Ошибка удаления из ${tableName}:`, error.message);
      return false;
    } else {
      console.log(`  ✅ Успешно очищена таблица ${tableName}`);
      return true;
    }
    
  } catch (error) {
    console.log(`  💥 Критическая ошибка при очистке ${tableName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 ПОЛНАЯ ПРОВЕРКА И ОЧИСТКА ДАННЫХ ДЛЯ АЗС 4 (СЕТЬ 15)\n');
  
  // Шаг 1: Проверка всех таблиц
  const tablesWithData = await getAllTablesData();
  
  if (tablesWithData.length === 0) {
    console.log('\n✅ В базе данных нет записей для указанной АЗС 4');
    console.log('🎉 Очистка не требуется');
    return;
  }
  
  // Показываем сводку найденных данных
  console.log('\n📊 СВОДКА НАЙДЕННЫХ ДАННЫХ:');
  console.log('================================');
  let totalRecords = 0;
  tablesWithData.forEach(table => {
    console.log(`📋 ${table.tableName}: ${table.count} записей`);
    totalRecords += table.count;
  });
  console.log(`🔢 Всего записей: ${totalRecords}\n`);
  
  // Шаг 2: Подтверждение очистки
  console.log('⚠️  ВНИМАНИЕ: Сейчас будут удалены ВСЕ найденные данные!');
  console.log('🗑️  Начинаю очистку через 3 секунды...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Шаг 3: Очистка данных
  let successCount = 0;
  let errorCount = 0;
  
  for (const tableResult of tablesWithData) {
    const success = await cleanupTableData(tableResult);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Пауза между удалениями
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Финальный отчет
  console.log('\n🏁 ИТОГИ ОЧИСТКИ:');
  console.log('==================');
  console.log(`✅ Успешно очищено таблиц: ${successCount}`);
  console.log(`❌ Ошибок при очистке: ${errorCount}`);
  console.log(`📊 Было записей: ${totalRecords}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 ВСЕ ДАННЫЕ ДЛЯ АЗС 4 (СЕТЬ 15) УСПЕШНО УДАЛЕНЫ!');
  } else {
    console.log('\n⚠️  Очистка завершена с ошибками. Проверьте логи выше.');
  }
}

// Запуск
main().catch(console.error);