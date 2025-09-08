/**
 * Скрипт для проверки структуры таблицы system_config
 * и создания записи для trading_network_integration
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase (замените на ваши данные)
const SUPABASE_URL = 'https://tohtryzyffcebtyvkywh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSystemConfig() {
  console.log('🔍 Проверяем структуру таблицы system_config...\n');

  try {
    // 1. Проверяем существование таблицы
    console.log('1️⃣ Проверка существования таблицы...');
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    if (tablesError) {
      console.log('⚠️ Не удалось получить список таблиц, пробуем прямой запрос...');
    } else {
      const systemConfigExists = tables?.some(table => table.table_name === 'system_config');
      console.log(`📋 Таблица system_config: ${systemConfigExists ? '✅ существует' : '❌ не найдена'}`);
    }

    // 2. Пробуем получить структуру таблицы
    console.log('\n2️⃣ Получаем структуру таблицы...');
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Ошибка при запросе к system_config:', error);
      
      if (error.code === '42P01') {
        console.log('\n🔧 Таблица system_config не существует. Создаем...');
        await createSystemConfigTable();
      } else {
        console.log('💡 Возможные причины ошибки:');
        console.log('   - Недостаточно прав доступа');
        console.log('   - Таблица существует, но имеет другую структуру');
        console.log('   - Проблемы с RLS (Row Level Security)');
      }
    } else {
      console.log('✅ Таблица system_config доступна');
      console.log('📊 Пример структуры:', data?.[0] || 'Пустая таблица');
    }

    // 3. Проверяем существующие записи
    console.log('\n3️⃣ Проверяем существующие конфигурации...');
    const { data: configs, error: configsError } = await supabase
      .from('system_config')
      .select('config_key, description, is_active')
      .order('created_at', { ascending: false });

    if (configsError) {
      console.error('❌ Ошибка получения конфигураций:', configsError);
    } else {
      console.log(`📋 Найдено конфигураций: ${configs?.length || 0}`);
      configs?.forEach(config => {
        console.log(`   • ${config.config_key} - ${config.description} (${config.is_active ? 'активна' : 'неактивна'})`);
      });
    }

    // 4. Ищем конкретно trading_network_integration
    console.log('\n4️⃣ Поиск записи trading_network_integration...');
    const { data: tradingConfig, error: tradingError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', 'trading_network_integration')
      .single();

    if (tradingError) {
      if (tradingError.code === 'PGRST116') {
        console.log('❌ Запись trading_network_integration не найдена');
        console.log('\n🔧 Создаем запись...');
        await createTradingNetworkConfig();
      } else {
        console.error('❌ Ошибка поиска trading_network_integration:', tradingError);
      }
    } else {
      console.log('✅ Запись trading_network_integration найдена:');
      console.log(JSON.stringify(tradingConfig, null, 2));
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

async function createSystemConfigTable() {
  console.log('🔨 Создаем таблицу system_config...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS system_config (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      config_key VARCHAR(255) UNIQUE NOT NULL,
      value JSONB,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Добавляем индексы
    CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
    CREATE INDEX IF NOT EXISTS idx_system_config_active ON system_config(is_active);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Ошибка создания таблицы:', error);
    } else {
      console.log('✅ Таблица system_config создана успешно');
    }
  } catch (error) {
    console.log('⚠️ Не удалось создать таблицу через RPC, пробуем альтернативный способ...');
    console.log('💡 Выполните SQL вручную в Supabase Dashboard:');
    console.log(createTableSQL);
  }
}

async function createTradingNetworkConfig() {
  console.log('🔧 Создаем конфигурацию trading_network_integration...');

  const defaultConfig = {
    enabled: true,
    baseUrl: 'https://pos.autooplata.ru/tms',
    systemId: '15',
    defaultStationId: '4',
    authType: 'bearer',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6eyJpZCI6IkFDQ0FFNDA4LTYzMzItNDI0NS04NUIxLTI1RjkxNEYzQkQ2NCIsIm5hbWUiOiJVc2VyVGVzdCIsInJvbGUiOjB9LCJ1c2VyIjp7ImlkIjoiQUNDQUU0MDgtNjMzMi00MjQ1LTg1QjEtMjVGOTE0RjNCRDY0IiwibmFtZSI6IlVzZXJUZXN0In0sImV4cCI6MTc1NzE1NzkzN30.7fDPBwtWej80K2ePRXYKXsJH3b3pLSUqtjo2uIbyXEE',
    timeout: 30000,
    retryAttempts: 3,
    endpoints: {
      tanks: '/v1/tanks',
      transactions: '/v1/transactions'
    }
  };

  try {
    const { data, error } = await supabase
      .from('system_config')
      .insert({
        config_key: 'trading_network_integration',
        value: defaultConfig,
        description: 'Конфигурация интеграции с торговой сетью pos.autooplata.ru',
        is_active: true
      })
      .select();

    if (error) {
      console.error('❌ Ошибка создания конфигурации:', error);
    } else {
      console.log('✅ Конфигурация trading_network_integration создана:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (error) {
    console.error('💥 Критическая ошибка создания конфигурации:', error);
  }
}

// Запускаем проверку
checkSystemConfig().then(() => {
  console.log('\n🎯 Проверка завершена!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка выполнения скрипта:', error);
  process.exit(1);
});