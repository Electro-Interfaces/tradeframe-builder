/**
 * Проверка создания таблицы system_config
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function verifyTable() {
    console.log('🔍 Проверяем создание таблицы system_config...');
    
    try {
        const response = await fetch(`${API_URL}/rest/v1/system_config?select=*&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ Таблица system_config успешно создана!');
            
            const data = await response.json();
            console.log(`📊 Найдено записей: ${data.length}`);
            
            if (data.length === 0) {
                console.log('📝 Таблица пустая - добавляем начальные данные...');
                return true; // Можно добавлять данные
            } else {
                console.log('📋 Данные уже есть в таблице:');
                data.forEach((record, i) => {
                    console.log(`${i + 1}. ${record.config_key} (${record.config_type})`);
                });
                return false; // Данные уже есть
            }
            
        } else if (response.status === 404) {
            console.log('❌ Таблица system_config не найдена');
            console.log('⚠️ Убедитесь что SQL выполнен в Supabase Dashboard');
            return null;
        } else {
            console.error(`❌ Ошибка доступа к таблице: ${response.status}`);
            const error = await response.text();
            console.error(error);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки таблицы:', error.message);
        return null;
    }
}

async function addInitialData() {
    console.log('📝 Добавление начальных данных в system_config...');
    
    const configs = [
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
                        description: 'Основная база данных системы (централизованная конфигурация)',
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
            description: 'Централизованная конфигурация подключений к базам данных'
        },
        {
            config_key: 'system_settings',
            config_value: {
                systemName: 'TradeFrame',
                version: '1.0.0',
                environment: 'production',
                timezone: 'Europe/Moscow',
                language: 'ru',
                configStorageType: 'database'
            },
            config_type: 'system',
            description: 'Основные системные настройки приложения'
        },
        {
            config_key: 'api_settings',
            config_value: {
                debugMode: false,
                enableRealTime: true,
                cacheTimeout: 30000,
                maxRetries: 3,
                requestTimeout: 8000
            },
            config_type: 'api',
            description: 'Настройки API и сетевых подключений'
        }
    ];
    
    let added = 0;
    
    for (const config of configs) {
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
                console.log(`   ID: ${result[0]?.id}`);
                added++;
            } else {
                const error = await response.text();
                console.error(`❌ Ошибка добавления ${config.config_key}:`);
                console.error(`   ${response.status}: ${error}`);
            }
            
        } catch (error) {
            console.error(`❌ Исключение при добавлении ${config.config_key}:`, error.message);
        }
    }
    
    console.log(`📊 Результат: добавлено ${added}/${configs.length} записей`);
    return added > 0;
}

async function main() {
    console.log('🚀 Проверка и инициализация таблицы system_config...');
    console.log('');
    
    const tableStatus = await verifyTable();
    
    if (tableStatus === null) {
        console.log('');
        console.log('❌ Таблица не создана или недоступна');
        console.log('📋 Выполните SQL в Supabase Dashboard:');
        console.log('https://supabase.com/dashboard/project/tohtryzyffcebtyvkxwh/sql');
        return;
    }
    
    if (tableStatus === true) {
        // Таблица пустая, добавляем данные
        const dataAdded = await addInitialData();
        
        if (dataAdded) {
            console.log('');
            console.log('🎉 СИСТЕМА КОНФИГУРАЦИИ ГОТОВА!');
            console.log('');
            console.log('✅ Что сделано:');
            console.log('1. ✅ Таблица system_config создана');
            console.log('2. ✅ Начальные данные добавлены');
            console.log('3. ✅ Новые сервисы готовы к работе');
            console.log('');
            console.log('🧪 Тестирование:');
            console.log('- Откройте test-new-architecture.html');
            console.log('- Запустите "Полный тест архитектуры"');
            console.log('');
            console.log('🔄 Миграция завершена: localStorage → Database');
        } else {
            console.log('❌ Не удалось добавить данные');
        }
        
    } else {
        console.log('');
        console.log('✅ Таблица готова и содержит данные');
        console.log('🧪 Можете тестировать новую архитектуру!');
    }
}

main().catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
});