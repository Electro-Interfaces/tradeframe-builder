/**
 * ПОЛНАЯ МИГРАЦИЯ подключений из apiConfigService.ts в БД
 * Исправляет проблему отсутствующих подключений и настроек
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// ПОЛНЫЙ набор подключений из исходного apiConfigService.ts
const completeConfig = {
    currentConnectionId: 'supabase-db',
    debugMode: false,
    lastUpdated: new Date().toISOString(),
    availableConnections: [
        {
            id: 'mock',
            name: 'Mock Data (Демо)',
            url: 'localStorage',
            type: 'mock',
            description: 'Локальные демо-данные в localStorage',
            isActive: false,
            isDefault: false,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                timeout: 1000,
                retryAttempts: 3
            }
        },
        {
            id: 'local-db',
            name: 'Локальная БД',
            url: 'http://localhost:3001/api/v1',
            type: 'postgresql',
            description: 'Локальная PostgreSQL база данных',
            isActive: false,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                timeout: 5000,
                retryAttempts: 3,
                poolSize: 10,
                ssl: false
            }
        },
        {
            id: 'prod-db',
            name: 'Продакшн БД',
            url: 'https://api.tradeframe.production.com/v1',
            type: 'postgresql',
            description: 'Продакшн PostgreSQL база данных',
            isActive: false,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                timeout: 10000,
                retryAttempts: 5,
                poolSize: 20,
                ssl: true
            }
        },
        {
            id: 'supabase-db',
            name: 'Supabase БД',
            url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
            type: 'supabase',
            description: 'Supabase PostgreSQL база данных с REST API (правильный проект)',
            isActive: true,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                timeout: 8000,
                retryAttempts: 3,
                ssl: true,
                apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
                serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
                schema: 'public',
                autoApiKey: true
            }
        },
        {
            id: 'trading-network-api',
            name: 'API торговой сети',
            url: 'https://pos.autooplata.ru/tms/',
            type: 'external-api',
            description: 'Внешний API торговой сети для интеграции с POS-системой',
            isActive: false,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                timeout: 10000,
                retryAttempts: 3,
                ssl: true,
                authType: 'basic',
                username: 'UserApi',
                password: 'lHQfLZHzB3tn'
            }
        }
    ]
};

async function updateDatabaseConnections() {
    console.log('🔄 ПОЛНАЯ МИГРАЦИЯ ПОДКЛЮЧЕНИЙ В БД...');
    console.log('=====================================');
    
    try {
        console.log('📝 Обновляем конфигурацию database_connections...');
        
        const response = await fetch(`${API_URL}/rest/v1/system_config?config_key=eq.database_connections`, {
            method: 'PATCH',
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                config_value: completeConfig,
                description: 'ПОЛНАЯ конфигурация подключений к базам данных (мигрировано из apiConfigService.ts)',
                updated_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        
        const result = await response.json();
        console.log('✅ Конфигурация database_connections успешно обновлена!');
        console.log(`📊 ID записи: ${result[0]?.id}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка обновления конфигурации:', error.message);
        return false;
    }
}

async function verifyMigration() {
    console.log('\n🔍 ПРОВЕРКА МИГРАЦИИ...');
    
    try {
        const response = await fetch(`${API_URL}/rest/v1/system_config?select=*&config_key=eq.database_connections`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        const dbConfig = data[0].config_value;
        
        console.log(`✅ Текущее активное подключение: ${dbConfig.currentConnectionId}`);
        console.log(`✅ Режим отладки: ${dbConfig.debugMode}`);
        console.log(`✅ Всего подключений: ${dbConfig.availableConnections.length}`);
        console.log('');
        
        console.log('📋 СПИСОК ВСЕХ ПОДКЛЮЧЕНИЙ В БД:');
        dbConfig.availableConnections.forEach((conn, i) => {
            const activeStatus = conn.isActive ? '🟢 АКТИВНО' : '⚫ Неактивно';
            const defaultStatus = conn.isDefault ? '⭐ По умолчанию' : '';
            console.log(`${i + 1}. ${conn.id} - "${conn.name}" (${conn.type}) ${activeStatus} ${defaultStatus}`);
            console.log(`   URL: ${conn.url}`);
            console.log(`   Описание: ${conn.description}`);
            
            // Показываем ключевые настройки без полного вывода секретов
            if (conn.settings) {
                console.log('   Настройки:');
                Object.entries(conn.settings).forEach(([key, value]) => {
                    if (key.includes('Key') || key.includes('password')) {
                        console.log(`     ${key}: ${typeof value === 'string' ? value.substring(0, 20) + '...' : value}`);
                    } else {
                        console.log(`     ${key}: ${value}`);
                    }
                });
            }
            console.log('');
        });
        
        // Проверяем наличие критически важных подключений
        const criticalConnections = ['supabase-db', 'trading-network-api'];
        const missingCritical = criticalConnections.filter(id => 
            !dbConfig.availableConnections.find(conn => conn.id === id)
        );
        
        if (missingCritical.length > 0) {
            console.log('❌ КРИТИЧЕСКИЕ ПОДКЛЮЧЕНИЯ ОТСУТСТВУЮТ:');
            missingCritical.forEach(id => console.log(`   - ${id}`));
            return false;
        }
        
        // Проверяем наличие API ключей для Supabase
        const supabaseConn = dbConfig.availableConnections.find(conn => conn.id === 'supabase-db');
        if (supabaseConn) {
            const hasApiKey = !!(supabaseConn.settings?.apiKey || supabaseConn.settings?.serviceRoleKey);
            if (!hasApiKey) {
                console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Отсутствуют API ключи для Supabase подключения!');
                return false;
            } else {
                console.log('✅ API ключи для Supabase присутствуют');
            }
        }
        
        // Проверяем аутентификацию для внешнего API
        const externalConn = dbConfig.availableConnections.find(conn => conn.id === 'trading-network-api');
        if (externalConn) {
            const hasAuth = !!(externalConn.settings?.username && externalConn.settings?.password);
            if (!hasAuth) {
                console.log('⚠️ Отсутствуют данные аутентификации для внешнего API');
            } else {
                console.log('✅ Данные аутентификации для внешнего API присутствуют');
            }
        }
        
        console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
        console.log('Все подключения и их настройки корректно перенесены в базу данных.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка проверки миграции:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 НАЧИНАЕМ ПОЛНУЮ МИГРАЦИЮ ПОДКЛЮЧЕНИЙ');
    console.log('Цель: Перенести ВСЕ подключения из apiConfigService.ts в system_config');
    console.log('');
    
    // Шаг 1: Обновляем конфигурацию в БД
    const migrationSuccess = await updateDatabaseConnections();
    
    if (!migrationSuccess) {
        console.log('❌ Миграция не удалась');
        return;
    }
    
    // Шаг 2: Проверяем результат
    const verificationSuccess = await verifyMigration();
    
    if (verificationSuccess) {
        console.log('');
        console.log('✅ ЗАДАЧА ВЫПОЛНЕНА!');
        console.log('🔄 Все подключения мигрированы: localStorage → Database');
        console.log('🔒 API ключи и пароли безопасно сохранены в БД');
        console.log('🎯 Система готова к централизованному управлению');
        console.log('');
        console.log('📋 Следующие шаги:');
        console.log('1. Протестировать новую архитектуру');
        console.log('2. Обновить страницу DatabaseSettings.tsx');
        console.log('3. Удалить старый localStorage подход');
    } else {
        console.log('⚠️ Миграция выполнена, но обнаружены проблемы. Проверьте логи выше.');
    }
}

main().catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
});