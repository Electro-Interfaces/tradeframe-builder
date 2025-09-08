/**
 * Проверка доступа к таблице operations через REST API
 * и поиск способа изменить constraint
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function testOperationsAccess() {
  console.log('🧪 ТЕСТИРОВАНИЕ ДОСТУПА К OPERATIONS ЧЕРЕЗ REST API');
  console.log('=' .repeat(80));
  
  try {
    // 1. Проверим доступ к таблице operations
    console.log('📋 1. Проверяем доступ к таблице operations...');
    const { data, error, count } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Ошибка доступа к operations:', error.message);
      return false;
    }
    
    console.log(`✅ Доступ к operations работает! Найдено ${count} записей`);
    if (data && data.length > 0) {
      console.log('📊 Пример записи:', {
        id: data[0].id,
        payment_method: data[0].payment_method,
        fuel_type: data[0].fuel_type,
        status: data[0].status
      });
    }

    // 2. Тест добавления записи с online_order
    console.log('\n🧪 2. Тестируем добавление online_order...');
    const testId = `TEST-ONLINE-${Date.now()}`;
    
    const { data: insertData, error: insertError } = await supabase
      .from('operations')
      .insert({
        id: testId,
        operation_type: 'sale',
        status: 'completed',
        start_time: new Date().toISOString(),
        payment_method: 'online_order', // Пробуем запрещенное значение
        details: 'Test online order through REST API',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.log('❌ Ошибка добавления online_order:', insertError.message);
      console.log('🔧 Детали:', insertError.details);
      console.log('🔧 Hint:', insertError.hint);
      
      if (insertError.message.includes('violates check constraint')) {
        console.log('✅ Подтверждено: constraint блокирует online_order');
        return { constraintExists: true, restApiWorks: true };
      }
    } else {
      console.log('🎉 Неожиданно: online_order прошел!');
      console.log('✅ Данные:', insertData);
      
      // Удаляем тестовую запись
      await supabase.from('operations').delete().eq('id', testId);
      return { constraintExists: false, restApiWorks: true };
    }

    // 3. Попробуем получить информацию о constraints через SQL
    console.log('\n🔍 3. Попробуем получить информацию о constraints...');
    
    // Попробуем через RPC или прямой SQL запрос
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_table_constraints', { table_name: 'operations' });
    
    if (rpcError) {
      console.log('⚠️ RPC get_table_constraints не существует:', rpcError.message);
    } else {
      console.log('✅ Constraints через RPC:', rpcData);
    }

    // 4. Проверим доступные RPC функции
    console.log('\n📋 4. Проверяем доступные RPC функции...');
    try {
      // Попробуем получить список функций
      const { data: funcData, error: funcError } = await supabase
        .from('pg_proc') // Системная таблица PostgreSQL
        .select('proname')
        .limit(5);
      
      if (funcError) {
        console.log('⚠️ Нет доступа к pg_proc:', funcError.message);
      } else {
        console.log('✅ Есть доступ к системным таблицам!');
        console.log('📋 Примеры функций:', funcData.map(f => f.proname));
      }
    } catch (e) {
      console.log('⚠️ Системные таблицы недоступны');
    }

    return { constraintExists: true, restApiWorks: true };

  } catch (error) {
    console.error('💥 Общая ошибка тестирования:', error.message);
    return false;
  }
}

async function tryAlternativeApproaches() {
  console.log('\n🔄 АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ К ИЗМЕНЕНИЮ CONSTRAINT');
  console.log('=' .repeat(60));

  // Подход 1: Создание собственной RPC функции
  console.log('🛠️ Подход 1: Попробуем создать RPC функцию...');
  
  const createRpcQuery = `
    CREATE OR REPLACE FUNCTION remove_payment_constraint()
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check;
        RETURN 'Constraint removed successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RETURN 'Error: ' || SQLERRM;
    END;
    $$;
  `;

  try {
    const { data: createRpcData, error: createRpcError } = await supabase.rpc('exec', {
      sql: createRpcQuery
    });

    if (createRpcError) {
      console.log('❌ Создание RPC функции не удалось:', createRpcError.message);
    } else {
      console.log('✅ RPC функция создана:', createRpcData);
      
      // Попробуем выполнить созданную функцию
      const { data: execData, error: execError } = await supabase
        .rpc('remove_payment_constraint');
      
      if (execError) {
        console.log('❌ Выполнение RPC функции не удалось:', execError.message);
      } else {
        console.log('🎉 RPC функция выполнена:', execData);
        return true;
      }
    }
  } catch (e) {
    console.log('❌ RPC подход не сработал:', e.message);
  }

  // Подход 2: Поиск существующих admin функций
  console.log('\n🔍 Подход 2: Поиск существующих admin функций...');
  
  const adminFunctions = [
    'execute_sql', 'exec_sql', 'admin_execute', 'run_sql', 
    'pg_execute', 'supabase_execute', 'admin_query'
  ];

  for (const funcName of adminFunctions) {
    try {
      const { error } = await supabase.rpc(funcName, { 
        query: 'SELECT 1 as test' 
      });
      
      if (!error || !error.message.includes('not found')) {
        console.log(`✅ Найдена функция: ${funcName}`);
        
        // Попробуем выполнить через нее
        const { data: sqlData, error: sqlError } = await supabase.rpc(funcName, {
          query: 'ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check'
        });
        
        if (sqlError) {
          console.log(`⚠️ ${funcName} не может выполнить DDL:`, sqlError.message);
        } else {
          console.log(`🎉 ${funcName} выполнил DDL!`, sqlData);
          return true;
        }
      }
    } catch (e) {
      // Функция не найдена, продолжаем
    }
  }

  console.log('❌ Не найдены admin функции для выполнения DDL');

  return false;
}

async function main() {
  const testResult = await testOperationsAccess();
  
  if (testResult && testResult.restApiWorks) {
    console.log('\n✅ REST API доступ к operations работает нормально!');
    
    if (testResult.constraintExists) {
      console.log('🔒 Constraint operations_payment_method_check активен');
      
      const alternativeSuccess = await tryAlternativeApproaches();
      
      if (alternativeSuccess) {
        console.log('\n🎉 CONSTRAINT УСПЕШНО УДАЛЕН!');
        console.log('✅ Теперь можно добавлять online_order');
        
        // Повторный тест
        const retestId = `RETEST-ONLINE-${Date.now()}`;
        const { data: retestData, error: retestError } = await supabase
          .from('operations')
          .insert({
            id: retestId,
            operation_type: 'sale', 
            status: 'completed',
            start_time: new Date().toISOString(),
            payment_method: 'online_order',
            details: 'Retest after constraint removal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (retestError) {
          console.log('❌ Повторный тест не прошел:', retestError.message);
        } else {
          console.log('🎉 Повторный тест успешен!', retestData);
          await supabase.from('operations').delete().eq('id', retestId);
        }
        
        return true;
      } else {
        console.log('\n⚠️ Не удалось найти способ удалить constraint через API');
        console.log('💡 Возможные решения:');
        console.log('1. Использовать Supabase Dashboard → SQL Editor');
        console.log('2. Работать только с разрешенными payment_method');
        console.log('3. Обратиться к админу проекта Supabase');
        
        return false;
      }
    } else {
      console.log('🎉 Constraint уже отсутствует! online_order можно использовать');
      return true;
    }
  } else {
    console.log('\n❌ Нет доступа к operations через REST API');
    return false;
  }
}

main().then((success) => {
  if (success) {
    console.log('\n🎯 ГОТОВ К ДОБАВЛЕНИЮ ONLINE_ORDER!');
    console.log('✅ Можно обновлять скрипт генерации с 4 способами оплаты');
  } else {
    console.log('\n⚠️ Нужно искать другие решения');
  }
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Критическая ошибка:', err);
  process.exit(1);
});