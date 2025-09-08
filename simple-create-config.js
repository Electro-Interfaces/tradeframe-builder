/**
 * Простое создание конфигурации в БД
 * Пошаговый подход без сложного SQL парсинга
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Конфигурационные данные
const initialConfigs = [
    {
        config_key: 'database_connections',
        config_value: {
            currentConnectionId: 'supabase-main',
            availableConnections: [
                {
                    id: 'supabase-main',
                    name: 'Основная БД Supabase',
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
    }
];

async function checkTableExists() {
    console.log('🔍 Проверка существования таблицы system_config...');
    
    try {
        const response = await fetch(`${API_URL}/rest/v1/system_config?select=id&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ Таблица system_config существует');
            return true;
        } else if (response.status === 404) {
            console.log('❌ Таблица system_config не найдена');
            return false;
        } else {
            const error = await response.text();
            console.error(`⚠️ Неожиданный ответ: ${response.status} ${error}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки таблицы:', error.message);
        return false;
    }
}

async function insertConfig(config) {
    console.log(`📝 Добавление конфигурации: ${config.config_key}`);
    
    try {
        // Сначала проверим, есть ли уже такая запись
        const checkResponse = await fetch(`${API_URL}/rest/v1/system_config?select=id&config_key=eq.${config.config_key}`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            if (existing.length > 0) {
                console.log(`⚠️ Конфигурация ${config.config_key} уже существует, обновляем...`);
                
                // Обновляем существующую запись
                const updateResponse = await fetch(`${API_URL}/rest/v1/system_config?config_key=eq.${config.config_key}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': API_KEY,
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        config_value: config.config_value,
                        description: config.description,
                        updated_at: new Date().toISOString()
                    })
                });
                
                if (!updateResponse.ok) {
                    const error = await updateResponse.text();
                    throw new Error(`Ошибка обновления: ${updateResponse.status} ${error}`);
                }
                
                console.log(`✅ Конфигурация ${config.config_key} обновлена`);
                return 'updated';
            }
        }
        
        // Создаем новую запись
        const insertResponse = await fetch(`${API_URL}/rest/v1/system_config`, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(config)
        });
        
        if (!insertResponse.ok) {
            const error = await insertResponse.text();
            throw new Error(`Ошибка вставки: ${insertResponse.status} ${error}`);
        }
        
        const result = await insertResponse.json();
        console.log(`✅ Конфигурация ${config.config_key} создана с ID: ${result[0]?.id}`);
        return 'created';
        
    } catch (error) {
        console.error(`❌ Ошибка при работе с ${config.config_key}:`, error.message);
        throw error;
    }
}

async function readAllConfigs() {
    console.log('📖 Чтение всех конфигураций...');
    
    try {
        const response = await fetch(`${API_URL}/rest/v1/system_config?select=*&order=config_type,config_key`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        
        const configs = await response.json();
        console.log(`📊 Найдено конфигураций: ${configs.length}`);
        
        configs.forEach((config, i) => {
            console.log(`${i + 1}. ${config.config_key} (${config.config_type})`);
            console.log(`   ${config.description}`);
            console.log(`   Создано: ${new Date(config.created_at).toLocaleString()}`);
            
            // Показываем краткое содержимое
            const valueStr = JSON.stringify(config.config_value);
            const preview = valueStr.length > 100 ? valueStr.substring(0, 100) + '...' : valueStr;
            console.log(`   Данные: ${preview}`);
            console.log('');
        });
        
        return configs;
        
    } catch (error) {
        console.error('❌ Ошибка чтения конфигурации:', error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Инициализация системы конфигурации...');
    
    try {
        // Проверяем доступ к базе
        console.log('🔍 Проверка доступа к базе данных...');
        const testResponse = await fetch(`${API_URL}/rest/v1/networks?select=id&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!testResponse.ok) {
            throw new Error(`Нет доступа к базе данных: ${testResponse.status}`);
        }
        
        console.log('✅ Доступ к базе данных подтвержден');
        
        // Проверяем существование таблицы
        const tableExists = await checkTableExists();
        
        if (!tableExists) {
            console.log('');
            console.log('🛠️ ТРЕБУЕТСЯ СОЗДАНИЕ ТАБЛИЦЫ');
            console.log('Выполните следующий SQL в Supabase Dashboard:');
            console.log('');
            console.log('CREATE TABLE system_config (');
            console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
            console.log('    config_key VARCHAR(255) UNIQUE NOT NULL,');
            console.log('    config_value JSONB NOT NULL,');
            console.log('    config_type VARCHAR(50) DEFAULT \'general\',');
            console.log('    description TEXT,');
            console.log('    is_encrypted BOOLEAN DEFAULT false,');
            console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
            console.log(');');
            console.log('');
            console.log('-- Индексы');
            console.log('CREATE INDEX idx_system_config_key ON system_config(config_key);');
            console.log('CREATE INDEX idx_system_config_type ON system_config(config_type);');
            console.log('');
            console.log('-- RLS');
            console.log('ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;');
            console.log('CREATE POLICY "Allow service role full access" ON system_config FOR ALL USING (auth.role() = \'service_role\');');
            console.log('CREATE POLICY "Allow authenticated users to read" ON system_config FOR SELECT USING (auth.role() = \'authenticated\');');
            console.log('');
            console.log('📋 После создания таблицы запустите скрипт повторно');
            return;
        }
        
        // Добавляем конфигурационные данные
        console.log('\n📝 Добавление конфигурационных данных...');
        let createdCount = 0;
        let updatedCount = 0;
        
        for (const config of initialConfigs) {
            try {
                const result = await insertConfig(config);
                if (result === 'created') {
                    createdCount++;
                } else if (result === 'updated') {
                    updatedCount++;
                }
            } catch (error) {
                console.error(`❌ Пропускаем ${config.config_key} из-за ошибки`);
            }
        }
        
        console.log(`\n📊 Итого: создано ${createdCount}, обновлено ${updatedCount}`);
        
        // Читаем и показываем результат
        console.log('\n📖 Проверка созданных данных...');
        await readAllConfigs();
        
        console.log('\n🎉 Инициализация системы конфигурации завершена!');
        console.log('');
        console.log('📋 Следующие шаги:');
        console.log('1. Обновить apiConfigService.ts для работы с БД');
        console.log('2. Создать миграцию из localStorage');
        console.log('3. Обновить интерфейс настроек');
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск с обработкой ошибок
main().catch(error => {
    console.error('💥 Необработанная ошибка:', error);
    process.exit(1);
});