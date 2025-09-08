const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Настройки подключения к Supabase (используем SERVICE_ROLE key для полного доступа)
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function executeDirectSQL() {
  console.log('🔧 Исправление конфигурации торговой сети через прямые запросы...');
  
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
      
      // Пробуем альтернативный способ через обычную вставку
      console.log('🔄 Пробуем создать через простую вставку...');
      const { data: testInsert, error: testError } = await supabase
        .from('system_config')
        .select('count')
        .limit(1);
      
      if (testError && testError.code === '42P01') {
        console.log('❌ Таблица system_config не существует. Создаем через SQL...');
        
        // Прямой SQL запрос
        const { error: directError } = await supabase.rpc('exec_sql', { 
          sql_query: `
            DO $$
            BEGIN
              CREATE TABLE IF NOT EXISTS system_config (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                config_key text UNIQUE NOT NULL,
                config_value jsonb NOT NULL,
                description text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                is_active boolean DEFAULT true
              );
              
              ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
              
              CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON system_config
                FOR SELECT USING (true);
                
              CREATE POLICY IF NOT EXISTS "Enable insert for all users" ON system_config
                FOR INSERT WITH CHECK (true);
                
              CREATE POLICY IF NOT EXISTS "Enable update for all users" ON system_config
                FOR UPDATE USING (true);
            EXCEPTION
              WHEN OTHERS THEN
                RAISE NOTICE 'Error: %', SQLERRM;
            END$$;
          `
        });
        
        if (directError) {
          console.log('❌ Ошибка прямого SQL:', directError.message);
        } else {
          console.log('✅ Таблица создана через прямой SQL');
        }
      }
    } else {
      console.log('✅ Таблица system_config создана или уже существует');
    }
    
    // 2. Вставка конфигурации напрямую
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
    
    // Пробуем вставить через upsert
    const { data: insertedConfig, error: insertError } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'trading_network_integration',
        config_value: configData,
        description: 'Конфигурация интеграции с API торговой сети',
        is_active: true
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Ошибка вставки конфигурации:', insertError.message);
      
      // Альтернативный способ через SQL
      const { error: sqlInsertError } = await supabase.rpc('exec_sql', {
        sql_query: `
          INSERT INTO system_config (config_key, config_value, description, is_active)
          VALUES (
            'trading_network_integration',
            '${JSON.stringify(configData)}'::jsonb,
            'Конфигурация интеграции с API торговой сети',
            true
          )
          ON CONFLICT (config_key) 
          DO UPDATE SET 
            config_value = EXCLUDED.config_value,
            updated_at = now();
        `
      });
      
      if (sqlInsertError) {
        console.log('❌ Ошибка SQL вставки:', sqlInsertError.message);
      } else {
        console.log('✅ Конфигурация вставлена через SQL');
      }
    } else {
      console.log('✅ Конфигурация успешно вставлена:', insertedConfig.id);
    }
    
    // 3. Проверяем результат
    console.log('🔍 Проверка созданной конфигурации...');
    const { data: config, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', 'trading_network_integration')
      .single();
    
    if (configError) {
      console.log('❌ Ошибка при проверке конфигурации:', configError.message);
    } else {
      console.log('✅ Конфигурация торговой сети найдена:');
      console.log('📋 ID:', config.id);
      console.log('🔑 Ключ:', config.config_key);
      console.log('📝 Описание:', config.description);
      console.log('⚡ Активна:', config.is_active);
      console.log('🕒 Создана:', config.created_at);
      console.log('📦 Размер конфигурации:', JSON.stringify(config.config_value).length, 'символов');
    }
    
    console.log('\n✨ Исправление завершено!');
    console.log('🔄 Перезагрузите приложение для применения изменений');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Запуск исправления
console.log('🚀 Запуск исправления конфигурации торговой сети...');
executeDirectSQL().then(() => {
  console.log('✅ Скрипт завершен');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Необработанная ошибка:', error);
  process.exit(1);
});