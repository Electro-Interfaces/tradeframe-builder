const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOperationsStructure() {
  console.log('🔍 Проверка структуры таблицы operations...');

  try {
    // Получаем несколько записей для анализа структуры
    const { data: operations, error } = await supabase
      .from('operations')
      .select('*')
      .limit(3);

    if (error) {
      throw error;
    }

    if (operations && operations.length > 0) {
      console.log('📊 Структура таблицы operations:');
      console.log('Поля в таблице:', Object.keys(operations[0]));
      console.log('\nПример записи:');
      console.log(JSON.stringify(operations[0], null, 2));
    } else {
      console.log('⚠️ Таблица operations пуста');
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке структуры:', error);
  }
}

// Запуск скрипта
checkOperationsStructure();