/**
 * Сравнение подключений: что было в apiConfigService VS что попало в БД
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Исходные подключения из apiConfigService.ts
const originalConnections = [
    {
        id: 'mock',
        name: 'Mock Data (Демо)',
        url: 'localStorage',
        type: 'mock',
        description: 'Локальные демо-данные в localStorage',
        isActive: false,
        isDefault: false,
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
        settings: {
            timeout: 8000,
            retryAttempts: 3,
            ssl: true,
            apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
            serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
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
        settings: {
            timeout: 10000,
            retryAttempts: 3,
            ssl: true,
            authType: 'basic',
            username: 'UserApi',
            password: 'lHQfLZHzB3tn'
        }
    }
];

async function getConnectionsFromDB() {
    console.log('🗄️ Загрузка подключений из базы данных...');
    
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
        
        if (data.length === 0) {
            console.log('❌ Конфигурация database_connections не найдена в БД');
            return null;
        }
        
        console.log(`✅ Найдена конфигурация database_connections в БД`);
        return data[0].config_value.availableConnections || [];
        
    } catch (error) {
        console.error('❌ Ошибка загрузки из БД:', error.message);
        return null;
    }
}

function compareConnections(original, db) {
    console.log('\n📋 СРАВНЕНИЕ ПОДКЛЮЧЕНИЙ:\n');
    
    // Создаем карты для удобства поиска
    const originalMap = new Map(original.map(conn => [conn.id, conn]));
    const dbMap = new Map(db.map(conn => [conn.id, conn]));
    
    // Проверяем какие подключения есть в исходном коде
    console.log('📌 ИСХОДНЫЕ ПОДКЛЮЧЕНИЯ (из apiConfigService.ts):');
    original.forEach((conn, i) => {
        console.log(`${i + 1}. ${conn.id} - "${conn.name}" (${conn.type})`);
        console.log(`   URL: ${conn.url}`);
        console.log(`   Описание: ${conn.description}`);
        console.log(`   Активно: ${conn.isActive}, По умолчанию: ${conn.isDefault}`);
        
        // Показываем ключевые настройки
        if (conn.settings) {
            console.log(`   Настройки:`);
            Object.entries(conn.settings).forEach(([key, value]) => {
                if (key.includes('password') || key.includes('Key')) {
                    console.log(`     ${key}: ${typeof value === 'string' ? value.substring(0, 20) + '...' : value}`);
                } else {
                    console.log(`     ${key}: ${value}`);
                }
            });
        }
        console.log('');
    });
    
    console.log('\n🗄️ ПОДКЛЮЧЕНИЯ В БАЗЕ ДАННЫХ:');
    db.forEach((conn, i) => {
        console.log(`${i + 1}. ${conn.id} - "${conn.name}" (${conn.type})`);
        console.log(`   URL: ${conn.url}`);
        console.log(`   Описание: ${conn.description}`);
        console.log(`   Активно: ${conn.isActive}, По умолчанию: ${conn.isDefault}`);
        
        // Показываем ключевые настройки
        if (conn.settings) {
            console.log(`   Настройки:`);
            Object.entries(conn.settings).forEach(([key, value]) => {
                if (key.includes('password') || key.includes('Key')) {
                    console.log(`     ${key}: ${typeof value === 'string' ? value.substring(0, 20) + '...' : value}`);
                } else {
                    console.log(`     ${key}: ${value}`);
                }
            });
        }
        console.log('');
    });
    
    // Анализ различий
    console.log('\n🔍 АНАЛИЗ РАЗЛИЧИЙ:\n');
    
    // Подключения отсутствующие в БД
    const missingInDB = original.filter(conn => !dbMap.has(conn.id));
    if (missingInDB.length > 0) {
        console.log('❌ ОТСУТСТВУЮТ В БД:');
        missingInDB.forEach(conn => {
            console.log(`   - ${conn.id}: ${conn.name} (${conn.type})`);
        });
        console.log('');
    }
    
    // Новые подключения в БД
    const newInDB = db.filter(conn => !originalMap.has(conn.id));
    if (newInDB.length > 0) {
        console.log('✨ НОВЫЕ В БД:');
        newInDB.forEach(conn => {
            console.log(`   + ${conn.id}: ${conn.name} (${conn.type})`);
        });
        console.log('');
    }
    
    // Подключения с отличиями
    console.log('🔄 РАЗЛИЧИЯ В НАСТРОЙКАХ:');
    let hasDifferences = false;
    
    original.forEach(origConn => {
        const dbConn = dbMap.get(origConn.id);
        if (dbConn) {
            // Сравниваем основные поля
            const fieldsToCompare = ['name', 'url', 'type', 'description', 'isActive', 'isDefault'];
            
            fieldsToCompare.forEach(field => {
                if (origConn[field] !== dbConn[field]) {
                    console.log(`   ${origConn.id}.${field}: "${origConn[field]}" → "${dbConn[field]}"`);
                    hasDifferences = true;
                }
            });
            
            // Сравниваем настройки
            if (origConn.settings && dbConn.settings) {
                const origSettings = origConn.settings;
                const dbSettings = dbConn.settings;
                
                // Все ключи из обоих объектов
                const allSettingsKeys = new Set([
                    ...Object.keys(origSettings),
                    ...Object.keys(dbSettings)
                ]);
                
                allSettingsKeys.forEach(key => {
                    if (origSettings[key] !== dbSettings[key]) {
                        const origValue = key.includes('password') || key.includes('Key') 
                            ? (origSettings[key] ? `${origSettings[key].toString().substring(0, 20)}...` : 'undefined')
                            : origSettings[key];
                        const dbValue = key.includes('password') || key.includes('Key') 
                            ? (dbSettings[key] ? `${dbSettings[key].toString().substring(0, 20)}...` : 'undefined')
                            : dbSettings[key];
                        console.log(`   ${origConn.id}.settings.${key}: "${origValue}" → "${dbValue}"`);
                        hasDifferences = true;
                    }
                });
            }
        }
    });
    
    if (!hasDifferences && missingInDB.length === 0) {
        console.log('   ✅ Все подключения идентичны');
    }
    
    return {
        totalOriginal: original.length,
        totalDB: db.length,
        missing: missingInDB.length,
        new: newInDB.length,
        identical: !hasDifferences && missingInDB.length === 0
    };
}

async function main() {
    console.log('🔍 АНАЛИЗ МИГРАЦИИ ПОДКЛЮЧЕНИЙ');
    console.log('Сравнение: apiConfigService.ts → system_config (БД)');
    console.log('=====================================');
    
    const dbConnections = await getConnectionsFromDB();
    
    if (!dbConnections) {
        console.log('\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Не удалось загрузить подключения из БД');
        console.log('📋 Возможные причины:');
        console.log('1. Таблица system_config не создана');
        console.log('2. Запись database_connections отсутствует');
        console.log('3. Проблемы с доступом к БД');
        return;
    }
    
    const analysis = compareConnections(originalConnections, dbConnections);
    
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`Исходных подключений: ${analysis.totalOriginal}`);
    console.log(`В базе данных: ${analysis.totalDB}`);
    console.log(`Отсутствуют в БД: ${analysis.missing}`);
    console.log(`Новых в БД: ${analysis.new}`);
    console.log(`Полностью идентичны: ${analysis.identical ? 'ДА' : 'НЕТ'}`);
    
    if (analysis.missing > 0) {
        console.log('\n⚠️ ТРЕБУЕТСЯ ДЕЙСТВИЕ:');
        console.log('Некоторые подключения не были мигрированы в БД.');
        console.log('Необходимо обновить данные в system_config.');
    } else if (analysis.identical) {
        console.log('\n✅ МИГРАЦИЯ УСПЕШНА:');
        console.log('Все подключения корректно перенесены в базу данных.');
    } else {
        console.log('\n🔄 МИГРАЦИЯ ЧАСТИЧНО УСПЕШНА:');
        console.log('Основные подключения перенесены, но есть различия в настройках.');
    }
}

main().catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
});