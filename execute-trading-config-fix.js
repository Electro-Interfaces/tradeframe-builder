const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Настройки подключения к Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTEwNTgzNiwiZXhwIjoyMDUwNjgxODM2fQ.JVBVl9wJOa6hUOiLdFOYgXvvKp8FQJ_6qs-I-I4_fBA';

async function executeTradingConfigFix() {
  console.log('🔧 Исправление конфигурации торговой сети...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('fix-trading-network-config-db.sql', 'utf8');
    
    // Выполняем SQL команды по частям
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        console.log(`📝 Выполняем команду ${i + 1}/${commands.length}...`);
        console.log(`💡 ${command.substring(0, 100)}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command
        });
        
        if (error) {
          console.log(`⚠️ Ошибка в команде ${i + 1}: ${error.message}`);
          // Продолжаем выполнение остальных команд
        } else {
          console.log(`✅ Команда ${i + 1} выполнена успешно`);
        }
      }
    }
    
    // Проверяем, что таблица создана и данные вставлены
    console.log('\n🔍 Проверка созданной конфигурации...');
    const { data: config, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', 'trading_network_integration')
      .single();
    
    if (configError) {
      console.log('❌ Ошибка при проверке конфигурации:', configError.message);
    } else {
      console.log('✅ Конфигурация торговой сети успешно создана:');
      console.log('📋 ID:', config.id);
      console.log('🔑 Ключ:', config.config_key);
      console.log('📝 Описание:', config.description);
      console.log('⚡ Активна:', config.is_active);
      console.log('🕒 Создана:', config.created_at);
    }
    
    console.log('\n✨ Исправление завершено!');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
  }
}

// Альтернативный способ через прямые SQL запросы
async function executeDirectSQL() {
  console.log('🔧 Альтернативное исправление через прямые запросы...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Создание таблицы
    console.log('📝 Создаем таблицу system_config...');
    const createTableResult = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS system_config (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          config_key text UNIQUE NOT NULL,
          config_value jsonb NOT NULL,
          description text,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now(),
          is_active boolean DEFAULT true
        );
      `
    });
    
    if (createTableResult.error) {
      console.log('❌ Ошибка создания таблицы:', createTableResult.error.message);
    } else {
      console.log('✅ Таблица system_config создана');
    }
    
    // 2. Создание индексов
    console.log('📝 Создаем индексы...');
    await supabase.rpc('exec_sql', {
      sql_query: `CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);`
    });
    await supabase.rpc('exec_sql', {
      sql_query: `CREATE INDEX IF NOT EXISTS idx_system_config_active ON system_config(is_active);`
    });
    console.log('✅ Индексы созданы');
    
    // 3. Настройка RLS
    console.log('📝 Настраиваем RLS политики...');
    await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;`
    });
    
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON system_config
          FOR SELECT USING (is_active = true);
      `
    });
    
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY IF NOT EXISTS "Enable insert for all users" ON system_config
          FOR INSERT WITH CHECK (true);
      `
    });
    
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY IF NOT EXISTS "Enable update for all users" ON system_config
          FOR UPDATE USING (true);
      `
    });
    console.log('✅ RLS политики настроены');
    
    // 4. Вставка конфигурации
    console.log('📝 Вставляем базовую конфигурацию...');
    const configData = {
      enabled: false,
      baseUrl: "https://pos.autooplata.ru/tms",
      systemId: "15",
      defaultStationId: "77",
      timeout: 30000,
      authType: "basic",
      username: "UserApi",
      password: "lHQfLZHzB3tn",
      endpoints: {
        tanks: "/api/get_level_measure",
        transactions: "/api/get_transactions",
        auth: "/api/auth",
        services: "/api/get_services",
        prices: "/api/get_prices",
        monitoring: "/api/monitoring"
      },
      defaultParams: {
        refreshInterval: 60,
        maxRecords: 1000
      },
      retryAttempts: 3,
      universalMapping: {
        enabled: false,
        syncStrategy: "hybrid",
        conflictResolution: "prefer_internal",
        mappings: []
      }
    };
    
    const { data: insertedConfig, error: insertError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'trading_network_integration',
        config_value: configData,
        description: 'Конфигурация интеграции с API торговой сети'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Ошибка вставки конфигурации:', insertError.message);
    } else {
      console.log('✅ Конфигурация успешно вставлена:', insertedConfig.id);
    }
    
    console.log('\n✨ Альтернативное исправление завершено!');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
  }
}

// Запуск исправления
if (require.main === module) {
  console.log('🚀 Запуск исправления конфигурации торговой сети...');
  
  // Сначала пробуем прямые SQL запросы
  executeDirectSQL().then(() => {
    process.exit(0);
  });
}