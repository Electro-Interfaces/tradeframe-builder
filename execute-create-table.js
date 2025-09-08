/**
 * Прямое создание таблицы user_preferences через Supabase REST API
 */

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function executeSQL() {
  console.log('🔧 Пытаемся создать таблицу user_preferences...');
  
  // Минимальная таблица без триггеров и политик RLS
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      preference_key VARCHAR(100) NOT NULL,
      preference_value TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, preference_key)
    );
  `;
  
  try {
    // Попробуем через PostgREST direct SQL execution
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });
    
    if (response.ok) {
      console.log('✅ Таблица создана через exec_sql RPC');
    } else {
      const error = await response.text();
      console.log('❌ exec_sql недоступен:', error);
      
      // Попробуем другие методы
      await tryAlternativeMethods();
    }
    
  } catch (error) {
    console.log('❌ Прямой SQL не сработал:', error.message);
    await tryAlternativeMethods();
  }
}

async function tryAlternativeMethods() {
  console.log('🔄 Пробуем альтернативные методы...');
  
  try {
    // Попробуем создать простую запись для проверки доступа
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/user_preferences`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: '00000000-0000-0000-0000-000000000000',
        preference_key: 'test_key',
        preference_value: 'test_value'
      })
    });
    
    if (testResponse.ok) {
      console.log('✅ Таблица user_preferences уже существует и доступна!');
      
      // Удалим тестовую запись
      await fetch(`${supabaseUrl}/rest/v1/user_preferences?user_id=eq.00000000-0000-0000-0000-000000000000&preference_key=eq.test_key`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });
      
    } else {
      const error = await testResponse.text();
      console.log('⚠️ Таблица недоступна:', error);
      
      if (error.includes('relation "user_preferences" does not exist')) {
        console.log('📋 Таблица не существует, нужно создать через Supabase Dashboard');
        console.log('💡 Инструкции:');
        console.log('1. Идите на https://supabase.com/dashboard');
        console.log('2. Выберите проект tohtryzyffcebtyvkxwh');
        console.log('3. SQL Editor → New Query');
        console.log('4. Скопируйте и выполните SQL из файла create-user-preferences-table.sql');
      }
    }
    
  } catch (error) {
    console.log('❌ Альтернативные методы не сработали:', error.message);
  }
}

async function checkTableExists() {
  console.log('🔍 Проверяем существование таблицы...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/user_preferences?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Таблица user_preferences существует и доступна');
      console.log('📊 Записей в таблице:', data.length);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Таблица недоступна:', error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Ошибка проверки таблицы:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Начинаем процесс создания таблицы user_preferences');
  
  // Сначала проверим существует ли уже таблица
  const tableExists = await checkTableExists();
  
  if (!tableExists) {
    console.log('📝 Таблица не существует, пытаемся создать...');
    await executeSQL();
  } else {
    console.log('✅ Таблица уже существует, готова к использованию!');
  }
  
  // Проверим еще раз после попытки создания
  await checkTableExists();
}

main().catch(console.error);