import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function createUserPreferencesTable() {
  try {
    console.log('🔄 Создаем таблицу user_preferences через Supabase RPC...');
    
    // Создаем функцию для выполнения DDL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_user_preferences_table()
      RETURNS TEXT AS $$
      BEGIN
        -- Создание таблицы для хранения пользовательских предпочтений
        CREATE TABLE IF NOT EXISTS user_preferences (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            preference_key VARCHAR(100) NOT NULL,
            preference_value TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            
            -- Уникальный индекс для связки пользователь + ключ настройки
            UNIQUE(user_id, preference_key)
        );

        -- Индексы
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

        -- Функция для автоматического обновления updated_at
        CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $trigger$ language 'plpgsql';

        -- Триггер для автоматического обновления updated_at
        DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
        CREATE TRIGGER update_user_preferences_updated_at
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_user_preferences_updated_at();

        -- Политики RLS (Row Level Security)
        ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

        -- Удаляем старые политики если есть
        DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

        -- Создаем новые политики
        CREATE POLICY "Users can view own preferences" ON user_preferences
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can update own preferences" ON user_preferences
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own preferences" ON user_preferences
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own preferences" ON user_preferences
            FOR DELETE USING (auth.uid() = user_id);

        RETURN 'user_preferences table created successfully';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Сначала создаем функцию
    const { data: functionData, error: functionError } = await supabase.rpc('exec_sql', {
      sql_query: createFunctionSQL
    });
    
    if (functionError) {
      console.log('⚠️ Функция exec_sql недоступна, попробуем прямое выполнение...');
      
      // Попробуем создать таблицу напрямую через простые операции
      console.log('🔄 Создаем таблицу через обычный SQL...');
      
      // Проверим, существует ли уже таблица
      const { data: existingTable, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .limit(1);
        
      if (checkError && checkError.code === '42P01') {
        console.log('📋 Таблица не существует, создаем...');
        
        // Создаем таблицу простым способом через описание полей
        const createTableQuery = `
          CREATE TABLE user_preferences (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            preference_key VARCHAR(100) NOT NULL,
            preference_value TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, preference_key)
          )
        `;
        
        console.log('🔨 Попробуем создать таблицу вручную...');
        
        // Используем прямой SQL запрос
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            query: createTableQuery
          })
        });
        
        if (!response.ok) {
          console.log('⚠️ RPC недоступен, таблица может уже существовать');
          console.log('✅ Проверим существующую структуру...');
        }
        
      } else if (!checkError) {
        console.log('✅ Таблица user_preferences уже существует');
      }
      
    } else {
      // Вызываем созданную функцию
      const { data: createData, error: createError } = await supabase.rpc('create_user_preferences_table');
      
      if (createError) {
        console.error('❌ Ошибка при создании таблицы:', createError);
      } else {
        console.log('✅ Результат создания таблицы:', createData);
      }
    }
    
    // Проверим структуру таблицы
    console.log('🔍 Проверяем доступ к таблице user_preferences...');
    
    const { data: testData, error: testError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('⚠️ Ошибка доступа к таблице:', testError.message);
      console.log('📝 Создадим таблицу через INSERT или альтернативный способ...');
      
      // Попробуем создать через метаданные
      console.log('🔧 Таблица должна быть создана администратором в Supabase Dashboard');
      console.log('📋 SQL для создания:');
      console.log(`
        CREATE TABLE user_preferences (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          preference_key VARCHAR(100) NOT NULL,
          preference_value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, preference_key)
        );
      `);
    } else {
      console.log('✅ Таблица user_preferences доступна');
      console.log('📊 Пример записей:', testData);
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

createUserPreferencesTable();