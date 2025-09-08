/**
 * Скрипт для создания таблицы system_config и базовой конфигурации
 * Устраняет проблему отсутствия доступа к БД в универсальном HTTP клиенте
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Получаем переменные окружения
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Настройка системной конфигурации');
console.log('==================================');

async function setupSystemConfig() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Ошибка: Отсутствуют переменные окружения');
        console.error('Убедитесь что .env содержит:');
        console.error('VITE_SUPABASE_URL=https://your-project.supabase.co');
        console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
        process.exit(1);
    }

    console.log('🔗 Подключаемся к Supabase...');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 30)}...`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        console.log('\n📋 Шаг 1: Проверяем существование таблицы system_config');
        
        // Проверяем существование таблицы
        const { data: tableCheck, error: tableError } = await supabase
            .from('system_config')
            .select('count(*)', { count: 'exact', head: true });

        if (tableError && tableError.code === '42P01') {
            console.log('⚠️ Таблица system_config не существует. Создаем...');
            
            // Создаем таблицу
            const { error: createError } = await supabase.rpc('exec_sql', {
                sql: `
                    CREATE TABLE system_config (
                        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                        config_key text UNIQUE NOT NULL,
                        config_value jsonb,
                        config_type text DEFAULT 'general',
                        description text,
                        is_encrypted boolean DEFAULT false,
                        created_at timestamp with time zone DEFAULT now(),
                        updated_at timestamp with time zone DEFAULT now()
                    );
                    
                    -- Создаем индексы
                    CREATE INDEX idx_system_config_key ON system_config(config_key);
                    CREATE INDEX idx_system_config_type ON system_config(config_type);
                    
                    -- Создаем RLS политики
                    ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
                    
                    -- Политика для чтения (анонимный доступ)
                    CREATE POLICY "system_config_select" ON system_config
                        FOR SELECT USING (true);
                    
                    -- Политика для записи (только service_role)
                    CREATE POLICY "system_config_insert" ON system_config
                        FOR INSERT WITH CHECK (auth.role() = 'service_role');
                    
                    CREATE POLICY "system_config_update" ON system_config
                        FOR UPDATE USING (auth.role() = 'service_role');
                    
                    CREATE POLICY "system_config_delete" ON system_config
                        FOR DELETE USING (auth.role() = 'service_role');
                `
            });

            if (createError) {
                // Если RPC недоступно, пробуем создать напрямую через SQL
                console.log('⚠️ RPC недоступно, пробуем создать через прямой SQL...');
                
                const createTableSql = `
                    CREATE TABLE IF NOT EXISTS system_config (
                        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                        config_key text UNIQUE NOT NULL,
                        config_value jsonb,
                        config_type text DEFAULT 'general',
                        description text,
                        is_encrypted boolean DEFAULT false,
                        created_at timestamp with time zone DEFAULT now(),
                        updated_at timestamp with time zone DEFAULT now()
                    )
                `;

                console.log('📄 SQL для создания таблицы:');
                console.log(createTableSql);
                console.log('\n⚠️ Выполните этот SQL вручную в Supabase Dashboard > SQL Editor');
                console.log('Затем запустите скрипт повторно');
                return;
            } else {
                console.log('✅ Таблица system_config создана успешно');
            }
        } else if (tableError) {
            throw tableError;
        } else {
            console.log('✅ Таблица system_config уже существует');
        }

        console.log('\n📋 Шаг 2: Проверяем конфигурацию database_connections');
        
        // Проверяем существование конфигурации БД
        const { data: dbConfig, error: configError } = await supabase
            .from('system_config')
            .select('*')
            .eq('config_key', 'database_connections')
            .single();

        if (configError && configError.code === 'PGRST116') {
            console.log('⚠️ Конфигурация database_connections отсутствует. Создаем...');
            
            // Создаем базовую конфигурацию
            const defaultConfig = {
                currentConnectionId: 'supabase-main',
                availableConnections: [
                    {
                        id: 'supabase-main',
                        name: 'Основная БД Supabase',
                        type: 'supabase',
                        url: SUPABASE_URL,
                        description: 'Основное подключение к Supabase',
                        isActive: true,
                        isDefault: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        settings: {
                            timeout: 30000,
                            retryAttempts: 3,
                            ssl: true,
                            schema: 'public',
                            apiKey: SUPABASE_ANON_KEY,
                            serviceRoleKey: SUPABASE_SERVICE_KEY
                        }
                    }
                ],
                debugMode: true,
                lastUpdated: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('system_config')
                .insert({
                    config_key: 'database_connections',
                    config_value: defaultConfig,
                    config_type: 'database',
                    description: 'Конфигурация подключений к базам данных'
                });

            if (insertError) {
                throw insertError;
            } else {
                console.log('✅ Конфигурация database_connections создана успешно');
                console.log('   - Подключение: supabase-main');
                console.log(`   - URL: ${SUPABASE_URL}`);
                console.log('   - Режим отладки: включен');
            }
        } else if (configError) {
            throw configError;
        } else {
            console.log('✅ Конфигурация database_connections уже существует');
            console.log(`   - ID: ${dbConfig.config_key}`);
            console.log(`   - Тип: ${dbConfig.config_type}`);
            console.log(`   - Подключений: ${dbConfig.config_value?.availableConnections?.length || 0}`);
        }

        console.log('\n📋 Шаг 3: Создаем дополнительные конфигурации');
        
        // Создаем конфигурацию для торговой сети
        const { data: tradingConfig, error: tradingError } = await supabase
            .from('system_config')
            .select('*')
            .eq('config_key', 'trading_network_integration')
            .single();

        if (tradingError && tradingError.code === 'PGRST116') {
            console.log('⚠️ Конфигурация trading_network_integration отсутствует. Создаем...');
            
            const tradingNetworkConfig = {
                enabled: true,
                baseUrl: 'https://pos.autooplata.ru/tms',
                systemId: '',
                defaultStationId: '',
                authType: 'basic',
                username: 'UserApi',
                password: 'PasswordApi',
                apiKey: '',
                timeout: 30000,
                retryAttempts: 3,
                endpoints: {
                    tanks: '/tanks',
                    transactions: '/transactions'
                },
                defaultParams: {
                    refreshInterval: 60,
                    maxRecords: 1000,
                    dateFormat: 'YYYY-MM-DDTHH:mm:ss'
                },
                lastUpdated: new Date().toISOString()
            };

            const { error: tradingInsertError } = await supabase
                .from('system_config')
                .insert({
                    config_key: 'trading_network_integration',
                    config_value: tradingNetworkConfig,
                    config_type: 'api',
                    description: 'Конфигурация интеграции с торговой сетью'
                });

            if (tradingInsertError) {
                console.warn('⚠️ Не удалось создать конфигурацию торговой сети:', tradingInsertError.message);
            } else {
                console.log('✅ Конфигурация trading_network_integration создана');
            }
        } else {
            console.log('✅ Конфигурация trading_network_integration уже существует');
        }

        console.log('\n🎉 Настройка системной конфигурации завершена успешно!');
        console.log('\n📋 Что было сделано:');
        console.log('• Создана таблица system_config (если отсутствовала)');
        console.log('• Настроены RLS политики для безопасности');
        console.log('• Добавлена конфигурация database_connections');
        console.log('• Добавлена конфигурация торговой сети');
        console.log('\n✅ Универсальный HTTP клиент теперь должен работать корректно');
        console.log('🔄 Перезапустите приложение для применения изменений');

    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        console.error('\n🔧 Рекомендации:');
        console.error('• Убедитесь что service_role ключ правильный');
        console.error('• Проверьте доступность Supabase проекта');
        console.error('• Создайте таблицу вручную если автоматическое создание не работает');
        
        process.exit(1);
    }
}

// Запускаем настройку
setupSystemConfig();