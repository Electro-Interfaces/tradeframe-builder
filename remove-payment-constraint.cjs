/**
 * Скрипт для полного удаления ограничения payment_method
 * и добавления поддержки online_order
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removePaymentConstraint() {
  console.log('🚀 Удаляем ограничение payment_method из базы данных...');
  
  try {
    // Сначала создаем RPC функцию для удаления constraint
    console.log('📝 Создаем RPC функцию...');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION remove_payment_constraint()
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            -- Удаляем constraint
            ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check;
            RETURN 'Payment method constraint removed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RETURN 'Error: ' || SQLERRM;
        END;
        $$;
      `
    });

    if (rpcError) {
      console.error('❌ Ошибка создания RPC функции:', rpcError);
      
      // Пробуем прямое выполнение SQL
      console.log('🔄 Пробуем прямое выполнение SQL...');
      
      const { error: directError } = await supabase.from('operations').select('id').limit(1);
      if (!directError) {
        console.log('✅ Подключение к базе работает, пробуем удалить constraint через SQL...');
        
        // Попробуем через SQL запрос
        const { data, error } = await supabase
          .from('operations')
          .select('*')
          .limit(0); // Пустой запрос для проверки доступа
          
        console.log('📋 Подключение проверено, constraint нужно удалять через Supabase Dashboard');
        return false;
      }
    } else {
      console.log('✅ RPC функция создана');
      
      // Выполняем RPC функцию
      const { data: execResult, error: execError } = await supabase.rpc('remove_payment_constraint');
      
      if (execError) {
        console.error('❌ Ошибка выполнения RPC:', execError);
        return false;
      } else {
        console.log('✅ Результат:', execResult);
      }
    }
    
    // Тестируем что constraint удален
    console.log('🧪 Тестируем добавление online_order...');
    
    const { data: testData, error: testError } = await supabase
      .from('operations')
      .insert({
        id: `TEST-ONLINE-${Date.now()}`,
        operation_type: 'sale',
        status: 'completed',
        start_time: '2025-08-31T12:00:00Z',
        payment_method: 'online_order',
        details: 'Test online order after constraint removal',
        created_at: '2025-08-31T12:00:00Z',
        updated_at: '2025-08-31T12:00:00Z'
      })
      .select();

    if (testError) {
      console.error('❌ Тест не прошел:', testError.message);
      console.log('⚠️ Constraint все еще активен, требуется удаление через Dashboard');
      return false;
    } else {
      console.log('✅ Тест прошел! online_order теперь разрешен');
      
      // Удаляем тестовую запись
      await supabase
        .from('operations')
        .delete()
        .eq('id', testData[0].id);
        
      console.log('🧹 Тестовая запись удалена');
      return true;
    }
    
  } catch (error) {
    console.error('💥 Общая ошибка:', error);
    return false;
  }
}

// Функция для создания SQL команды для Dashboard
function createDashboardSQL() {
  console.log('\n📋 SQL команда для Supabase Dashboard:');
  console.log('─'.repeat(60));
  console.log(`-- Удаление ограничения payment_method
ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_payment_method_check;

-- Проверка что ограничение удалено
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
AND conname = 'operations_payment_method_check';`);
  console.log('─'.repeat(60));
  console.log('1. Откройте Supabase Dashboard → SQL Editor');
  console.log('2. Вставьте команду выше');
  console.log('3. Нажмите RUN');
  console.log('4. Запустите этот скрипт снова для проверки\n');
}

// Запуск
removePaymentConstraint().then((success) => {
  if (success) {
    console.log('🎉 Ограничение payment_method успешно удалено!');
    console.log('✅ Теперь можно использовать online_order');
  } else {
    console.log('⚠️ Требуется ручное удаление через Dashboard');
    createDashboardSQL();
  }
  process.exit(0);
}).catch(err => {
  console.error('💥 Критическая ошибка:', err);
  createDashboardSQL();
  process.exit(1);
});