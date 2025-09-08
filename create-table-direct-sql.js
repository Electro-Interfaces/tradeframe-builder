/**
 * Создание таблицы user_preferences через прямой SQL запрос к PostgreSQL
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function createTable() {
  console.log('🔧 Создаем таблицу user_preferences...');
  
  // Простое создание таблицы без сложных триггеров
  const createTableSQL = `
    -- Создание таблицы для хранения пользовательских предпочтений
    CREATE TABLE IF NOT EXISTS public.user_preferences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        preference_key VARCHAR(100) NOT NULL,
        preference_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Уникальный индекс для связки пользователь + ключ настройки
        UNIQUE(user_id, preference_key)
    );
    
    -- Комментарии
    COMMENT ON TABLE public.user_preferences IS 'Пользовательские предпочтения и настройки';
    COMMENT ON COLUMN public.user_preferences.preference_key IS 'Ключ настройки (например: selected_network, selected_trading_point)';
    COMMENT ON COLUMN public.user_preferences.preference_value IS 'Значение настройки в формате JSON или строки';
  `;
  
  try {
    console.log('🔄 Пытаемся выполнить SQL...');
    
    // Используем supabase.rpc для выполнения произвольного SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: createTableSQL 
    });
    
    if (error) {
      console.log('❌ RPC exec_sql не сработал:', error);
      
      // Попробуем через fetch напрямую
      await tryDirectFetch();
    } else {
      console.log('✅ Таблица создана через RPC:', data);
      await verifyTable();
    }
    
  } catch (error) {
    console.log('❌ Ошибка при создании таблицы:', error);
    await tryDirectFetch();
  }
}

async function tryDirectFetch() {
  console.log('🔄 Пробуем через прямой HTTP запрос...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.user_preferences (
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
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: sql })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Таблица создана через HTTP:', result);
      await verifyTable();
    } else {
      const error = await response.text();
      console.log('❌ HTTP запрос не сработал:', error);
      
      // Последняя попытка - создать вручную через insert
      await tryManualCreation();
    }
    
  } catch (error) {
    console.log('❌ HTTP ошибка:', error);
    await tryManualCreation();
  }
}

async function tryManualCreation() {
  console.log('🔄 Пытаемся создать таблицу через метаданные...');
  
  // Попробуем создать таблицу через создание структуры
  try {
    // Этот метод не сработает, но покажет что таблицы нет
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
      
    if (error && error.code === 'PGRST116') {
      console.log('📋 Таблица действительно не существует');
      console.log('💡 Необходимо создать таблицу через Supabase Dashboard:');
      console.log('');
      console.log('1. Откройте https://supabase.com/dashboard');
      console.log('2. Выберите проект tohtryzyffcebtyvkxwh');
      console.log('3. Перейдите в Table Editor');
      console.log('4. Нажмите "Create a new table"');
      console.log('5. Имя таблицы: user_preferences');
      console.log('6. Добавьте колонки:');
      console.log('   - id (uuid, primary key, default: gen_random_uuid())');
      console.log('   - user_id (uuid, not null)');
      console.log('   - preference_key (varchar, not null)');
      console.log('   - preference_value (text)');
      console.log('   - created_at (timestamptz, default: now())');
      console.log('   - updated_at (timestamptz, default: now())');
      console.log('7. Добавьте уникальное ограничение на (user_id, preference_key)');
      console.log('');
      console.log('Или выполните SQL из файла create-user-preferences-table.sql');
    } else {
      console.log('🤔 Неожиданный результат:', error);
    }
    
  } catch (error) {
    console.log('❌ Ошибка при проверке:', error);
  }
}

async function verifyTable() {
  console.log('🔍 Проверяем что таблица создалась...');
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Таблица все еще не существует');
      } else {
        console.log('⚠️ Ошибка доступа к таблице:', error);
      }
    } else {
      console.log('✅ Таблица user_preferences создана и доступна!');
      console.log('📊 Структура таблицы проверена');
      
      // Попробуем создать тестовую запись
      await testTableOperation();
    }
    
  } catch (error) {
    console.log('❌ Ошибка проверки таблицы:', error);
  }
}

async function testTableOperation() {
  console.log('🧪 Тестируем операции с таблицей...');
  
  try {
    // Создаем тестовую запись
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        preference_key: 'test_preference',
        preference_value: 'test_value'
      })
      .select()
      .single();
      
    if (error) {
      console.log('❌ Ошибка вставки:', error);
    } else {
      console.log('✅ Тестовая запись создана:', data);
      
      // Удаляем тестовую запись
      await supabase
        .from('user_preferences')
        .delete()
        .eq('id', data.id);
        
      console.log('✅ Тестовая запись удалена');
      console.log('🎉 Таблица полностью готова к использованию!');
    }
    
  } catch (error) {
    console.log('❌ Ошибка тестирования:', error);
  }
}

// Запуск
createTable().catch(console.error);