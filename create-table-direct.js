/**
 * Создание таблицы system_config через прямые HTTP запросы
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function createSystemConfigTable() {
    console.log('🗄️ Попытка создания таблицы system_config...');
    
    // Сначала проверим, есть ли уже таблица
    try {
        console.log('🔍 Проверяем существование таблицы...');
        const checkResponse = await fetch(`${API_URL}/rest/v1/system_config?select=id&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            console.log('✅ Таблица system_config уже существует!');
            return true;
        }
        
        if (checkResponse.status !== 404) {
            console.error(`⚠️ Неожиданный ответ: ${checkResponse.status}`);
            return false;
        }
        
        console.log('📝 Таблица не найдена, создаем...');
        
    } catch (error) {
        console.error('❌ Ошибка проверки таблицы:', error.message);
    }
    
    // Создание через PostgREST напрямую не поддерживается
    // Нужно использовать SQL запросы через Supabase Dashboard или CLI
    
    console.log('');
    console.log('🛠️ НЕОБХОДИМО СОЗДАТЬ ТАБЛИЦУ ВРУЧНУЮ');
    console.log('');
    console.log('📋 Откройте Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/tohtryzyffcebtyvkxwh/sql');
    console.log('');
    console.log('📝 Скопируйте и выполните следующий SQL:');
    console.log('');
    console.log('-- Создание таблицы system_config');
    console.log(`CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(config_type);

-- Настройка RLS (Row Level Security)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Политика для service_role (полный доступ)
CREATE POLICY IF NOT EXISTS "Allow service role full access" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

-- Политика для аутентифицированных пользователей (только чтение)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read" ON system_config
    FOR SELECT USING (auth.role() = 'authenticated');

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
    FOR EACH ROW EXECUTE PROCEDURE update_system_config_updated_at();`);
    
    console.log('');
    console.log('🎯 После выполнения SQL в Dashboard:');
    console.log('1. Запустите этот скрипт повторно для проверки');
    console.log('2. Или запустите: node simple-create-config.js');
    console.log('');
    
    return false;
}

async function insertInitialData() {
    console.log('📝 Добавление начальных данных...');
    
    const initialConfigs = [
        {
            config_key: 'database_connections',
            config_value: {
                currentConnectionId: 'supabase-main',
                debugMode: false,
                lastUpdated: new Date().toISOString(),
                availableConnections: [
                    {
                        id: 'supabase-main',
                        name: 'Основная БД Supabase',
                        url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
                        type: 'supabase',
                        description: 'Основная база данных системы управления торговыми точками',
                        isActive: true,
                        isDefault: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
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
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
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
        }
    ];
    
    let inserted = 0;
    
    for (const config of initialConfigs) {
        try {
            const response = await fetch(`${API_URL}/rest/v1/system_config`, {
                method: 'POST',
                headers: {
                    'apikey': API_KEY,
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(config)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Добавлена конфигурация: ${config.config_key}`);
                inserted++;
            } else {
                const error = await response.text();
                console.error(`❌ Ошибка добавления ${config.config_key}: ${response.status} ${error}`);
            }
            
        } catch (error) {
            console.error(`❌ Исключение при добавлении ${config.config_key}:`, error.message);
        }
    }
    
    console.log(`📊 Итого добавлено: ${inserted}/${initialConfigs.length} записей`);
    return inserted > 0;
}

async function main() {
    console.log('🚀 Инициализация таблицы system_config...');
    
    // Проверяем доступ к базе
    try {
        const testResponse = await fetch(`${API_URL}/rest/v1/networks?select=id&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!testResponse.ok) {
            console.error(`❌ Нет доступа к базе данных: ${testResponse.status}`);
            return;
        }
        
        console.log('✅ Доступ к базе данных подтвержден');
        
    } catch (error) {
        console.error('❌ Ошибка подключения к базе:', error.message);
        return;
    }
    
    // Проверяем/создаем таблицу
    const tableExists = await createSystemConfigTable();
    
    if (tableExists) {
        console.log('');
        console.log('🎉 Таблица готова! Добавляем начальные данные...');
        const dataAdded = await insertInitialData();
        
        if (dataAdded) {
            console.log('');
            console.log('🎉 ГОТОВО! Система конфигурации инициализирована');
            console.log('');
            console.log('📋 Проверьте результат:');
            console.log('- Откройте test-new-architecture.html');
            console.log('- Нажмите "Проверить таблицу system_config"');
            console.log('- Запустите "Полный тест архитектуры"');
        }
    }
}

// Запуск
main().catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
});