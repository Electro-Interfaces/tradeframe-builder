/**
 * Создание таблицы system_config для хранения системных настроек
 * Мигрирует конфигурацию из localStorage в базу данных
 */

import { createClient } from '@supabase/supabase-js';

// Подключение к Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createSystemConfigTable() {
    console.log('🏗️ Создание таблицы system_config...');
    
    try {
        // Создаем таблицу через SQL
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS system_config (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                config_key VARCHAR(255) UNIQUE NOT NULL,
                config_value JSONB NOT NULL,
                config_type VARCHAR(50) DEFAULT 'general',
                description TEXT,
                is_encrypted BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by UUID REFERENCES auth.users(id),
                updated_by UUID REFERENCES auth.users(id)
            );
            
            -- Создаем индексы для быстрого поиска
            CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
            CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(config_type);
            
            -- Создаем политики безопасности RLS
            ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
            
            -- Политика для чтения (все аутентифицированные пользователи)
            CREATE POLICY "Allow authenticated users to read system config" ON system_config
                FOR SELECT USING (auth.role() = 'authenticated');
            
            -- Политика для записи (только service_role)
            CREATE POLICY "Allow service role to modify system config" ON system_config
                FOR ALL USING (auth.role() = 'service_role');
                
            -- Функция для автоматического обновления updated_at
            CREATE OR REPLACE FUNCTION update_system_config_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            
            -- Триггер для автоматического обновления updated_at
            DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
            CREATE TRIGGER update_system_config_updated_at
                BEFORE UPDATE ON system_config
                FOR EACH ROW EXECUTE PROCEDURE update_system_config_updated_at();
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { 
            sql: createTableSQL 
        });
        
        if (error) {
            // Если RPC не работает, пытаемся создать через прямой SQL запрос
            console.log('⚠️ Пытаемся создать таблицу альтернативным способом...');
            
            // Создаем таблицу поэтапно
            const { error: createError } = await supabase
                .from('system_config')
                .select('*')
                .limit(0);
                
            if (createError && createError.message.includes('does not exist')) {
                console.log('📝 Создаем таблицу через SQL файл...');
                // Нужно создать таблицу через Supabase Dashboard или миграции
                console.log('⚠️ Необходимо создать таблицу через Supabase Dashboard:');
                console.log(createTableSQL);
                return false;
            }
        }
        
        console.log('✅ Таблица system_config создана или уже существует');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при создании таблицы:', error);
        return false;
    }
}

async function insertInitialConfig() {
    console.log('📝 Добавление начальной конфигурации...');
    
    // Базовая конфигурация системы
    const initialConfigs = [
        {
            config_key: 'database_connections',
            config_value: {
                currentConnectionId: 'supabase-db',
                availableConnections: [
                    {
                        id: 'supabase-db',
                        name: 'Основная база данных Supabase',
                        url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
                        type: 'supabase',
                        description: 'Основная база данных системы управления торговыми точками',
                        isActive: true,
                        isDefault: true,
                        settings: {
                            timeout: 8000,
                            retryAttempts: 3,
                            ssl: true,
                            schema: 'public',
                            autoApiKey: true
                        }
                    },
                    {
                        id: 'mock-data',
                        name: 'Демо данные (Mock)',
                        url: 'localStorage',
                        type: 'mock',
                        description: 'Локальные демо-данные для разработки и тестирования',
                        isActive: false,
                        isDefault: false,
                        settings: {
                            timeout: 1000,
                            retryAttempts: 3
                        }
                    }
                ]
            },
            config_type: 'database',
            description: 'Конфигурация подключений к базам данных'
        },
        {
            config_key: 'api_settings',
            config_value: {
                debugMode: false,
                enableRealTime: true,
                cacheTimeout: 30000,
                maxRetries: 3
            },
            config_type: 'api',
            description: 'Настройки API и подключений'
        },
        {
            config_key: 'system_settings',
            config_value: {
                systemName: 'TradeFrame',
                version: '1.0.0',
                environment: 'production',
                timezone: 'Europe/Moscow',
                language: 'ru'
            },
            config_type: 'system',
            description: 'Основные системные настройки'
        },
        {
            config_key: 'security_settings',
            config_value: {
                sessionTimeout: 3600,
                requireHttps: true,
                enableCORS: true,
                allowedOrigins: ['http://localhost:3006', 'https://tohtryzyffcebtyvkxwh.supabase.co']
            },
            config_type: 'security',
            description: 'Настройки безопасности системы'
        }
    ];
    
    let successCount = 0;
    
    for (const config of initialConfigs) {
        try {
            // Проверяем, существует ли уже эта конфигурация
            const { data: existing } = await supabase
                .from('system_config')
                .select('id')
                .eq('config_key', config.config_key)
                .single();
                
            if (existing) {
                console.log(`⚠️ Конфигурация ${config.config_key} уже существует, обновляем...`);
                
                const { error: updateError } = await supabase
                    .from('system_config')
                    .update({
                        config_value: config.config_value,
                        description: config.description,
                        updated_at: new Date().toISOString()
                    })
                    .eq('config_key', config.config_key);
                    
                if (updateError) {
                    console.error(`❌ Ошибка обновления ${config.config_key}:`, updateError);
                } else {
                    console.log(`✅ Обновлена конфигурация: ${config.config_key}`);
                    successCount++;
                }
            } else {
                // Создаем новую запись
                const { error: insertError } = await supabase
                    .from('system_config')
                    .insert(config);
                    
                if (insertError) {
                    console.error(`❌ Ошибка создания ${config.config_key}:`, insertError);
                } else {
                    console.log(`✅ Создана конфигурация: ${config.config_key}`);
                    successCount++;
                }
            }
        } catch (error) {
            console.error(`❌ Ошибка при работе с ${config.config_key}:`, error);
        }
    }
    
    console.log(`📊 Результат: ${successCount}/${initialConfigs.length} конфигураций обработано`);
    return successCount > 0;
}

async function main() {
    console.log('🚀 Инициализация системы конфигурации...');
    
    // Проверим подключение
    const { data: testData, error: testError } = await supabase
        .from('networks')
        .select('id')
        .limit(1);
        
    if (testError) {
        console.error('❌ Ошибка подключения к базе данных:', testError);
        return;
    }
    
    console.log('✅ Подключение к базе данных успешно');
    
    // Сначала попробуем вставить данные (если таблица существует)
    const { data: configTest, error: configError } = await supabase
        .from('system_config')
        .select('id')
        .limit(1);
        
    if (configError && configError.message.includes('does not exist')) {
        console.log('⚠️ Таблица system_config не существует');
        console.log('🛠️ Создайте таблицу в Supabase Dashboard используя следующий SQL:');
        console.log('');
        console.log('-- Таблица для системных настроек');
        console.log(`CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_type ON system_config(config_type);

-- RLS политики
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read system config" ON system_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to modify system config" ON system_config
    FOR ALL USING (auth.role() = 'service_role');`);
        
        console.log('');
        console.log('📋 После создания таблицы запустите скрипт повторно для добавления данных');
        return;
    }
    
    console.log('✅ Таблица system_config доступна');
    
    // Добавляем начальную конфигурацию
    const success = await insertInitialConfig();
    
    if (success) {
        console.log('🎉 Система конфигурации успешно инициализирована!');
        console.log('');
        console.log('📝 Следующие шаги:');
        console.log('1. Обновить apiConfigService.ts для работы с базой данных');
        console.log('2. Создать миграцию данных из localStorage');
        console.log('3. Обновить интерфейс настроек');
        console.log('');
        console.log('🔧 Проверить данные:');
        console.log('SELECT * FROM system_config ORDER BY config_type, config_key;');
    } else {
        console.log('❌ Произошли ошибки при инициализации конфигурации');
    }
}

// Запускаем скрипт
main().catch(console.error);