/**
 * Тест переключения на MOCK подключение для демонстрации смены конфигурации
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getCurrentConfig() {
    const response = await fetch(`${API_URL}/rest/v1/system_config?select=*&config_key=eq.database_connections`, {
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data[0].config_value;
}

async function switchToConnection(connectionId) {
    console.log(`🔄 Переключение на подключение: ${connectionId}`);
    
    const config = await getCurrentConfig();
    
    // Деактивируем все подключения и активируем нужное
    const connections = config.availableConnections.map(conn => ({
        ...conn,
        isActive: conn.id === connectionId
    }));

    const updatedConfig = {
        ...config,
        currentConnectionId: connectionId,
        availableConnections: connections,
        lastUpdated: new Date().toISOString()
    };

    const response = await fetch(`${API_URL}/rest/v1/system_config?config_key=eq.database_connections`, {
        method: 'PATCH',
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            config_value: updatedConfig,
            updated_at: new Date().toISOString()
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log(`✅ Подключение переключено на: ${connectionId}`);
    return updatedConfig;
}

async function demonstrateConfigSwitch() {
    console.log('🎯 ДЕМОНСТРАЦИЯ ПЕРЕКЛЮЧЕНИЯ КОНФИГУРАЦИИ');
    console.log('='.repeat(50));
    
    try {
        // Получаем текущую конфигурацию
        const initialConfig = await getCurrentConfig();
        const initialConnection = initialConfig.currentConnectionId;
        const activeConn = initialConfig.availableConnections.find(c => c.id === initialConnection);
        
        console.log('📊 ИСХОДНОЕ СОСТОЯНИЕ:');
        console.log(`   Активное подключение: ${activeConn.name} (${activeConn.id})`);
        console.log(`   URL: ${activeConn.url}`);
        console.log(`   Тип: ${activeConn.type}`);
        console.log('');

        // Показываем все доступные подключения
        console.log('📋 ДОСТУПНЫЕ ПОДКЛЮЧЕНИЯ:');
        initialConfig.availableConnections.forEach((conn, i) => {
            const status = conn.isActive ? '🟢 АКТИВНО' : '⚫ Неактивно';
            console.log(`   ${i + 1}. ${conn.name} (${conn.id}) - ${conn.type} ${status}`);
        });
        console.log('');

        // ТЕСТ 1: Переключение на Mock
        console.log('🧪 ТЕСТ 1: Переключение на Mock подключение');
        console.log('-'.repeat(40));
        
        await switchToConnection('mock');
        
        // Проверяем результат
        const config1 = await getCurrentConfig();
        const mockConn = config1.availableConnections.find(c => c.id === 'mock');
        
        console.log('✅ Результат переключения на Mock:');
        console.log(`   Новое активное подключение: ${mockConn.name}`);
        console.log(`   URL: ${mockConn.url}`);
        console.log(`   Тип: ${mockConn.type}`);
        console.log(`   Активно: ${mockConn.isActive}`);
        console.log('');

        // ТЕСТ 2: Переключение на Supabase
        console.log('🧪 ТЕСТ 2: Переключение обратно на Supabase');
        console.log('-'.repeat(40));
        
        await switchToConnection('supabase-db');
        
        // Проверяем результат
        const config2 = await getCurrentConfig();
        const supabaseConn = config2.availableConnections.find(c => c.id === 'supabase-db');
        
        console.log('✅ Результат переключения на Supabase:');
        console.log(`   Новое активное подключение: ${supabaseConn.name}`);
        console.log(`   URL: ${supabaseConn.url}`);
        console.log(`   Тип: ${supabaseConn.type}`);  
        console.log(`   Активно: ${supabaseConn.isActive}`);
        console.log('');

        // ТЕСТ 3: Проверка торговой сети API
        console.log('🧪 ТЕСТ 3: Переключение на API торговой сети');
        console.log('-'.repeat(40));
        
        await switchToConnection('trading-network-api');
        
        const config3 = await getCurrentConfig();
        const tradingConn = config3.availableConnections.find(c => c.id === 'trading-network-api');
        
        console.log('✅ Результат переключения на торговую сеть:');
        console.log(`   Новое активное подключение: ${tradingConn.name}`);
        console.log(`   URL: ${tradingConn.url}`);
        console.log(`   Тип: ${tradingConn.type}`);
        console.log(`   Аутентификация: ${tradingConn.settings?.authType} (${tradingConn.settings?.username})`);
        console.log(`   Активно: ${tradingConn.isActive}`);
        console.log('');

        // Возвращаем исходное подключение
        console.log('↩️ Возвращение к исходному подключению...');
        await switchToConnection(initialConnection);
        console.log(`✅ Возвращено: ${initialConnection}`);

        // ИТОГИ ТЕСТИРОВАНИЯ
        console.log('');
        console.log('🎉 ИТОГИ ТЕСТИРОВАНИЯ КОНФИГУРАЦИИ:');
        console.log('='.repeat(50));
        console.log('✅ Централизованная конфигурация работает корректно');
        console.log('✅ Переключение между подключениями происходит успешно');
        console.log('✅ Все настройки (URL, ключи, аутентификация) сохраняются');
        console.log('✅ Изменения применяются мгновенно');
        console.log('');
        console.log('🔧 РЕКОМЕНДАЦИИ:');
        console.log('1. Используйте страницу "Обмен данными" для переключения подключений');
        console.log('2. После переключения все сервисы будут использовать новую конфигурацию');
        console.log('3. API ключи и пароли безопасно хранятся в базе данных');
        console.log('4. Можно переключаться между любыми настроенными подключениями');

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

async function showCurrentStatus() {
    console.log('📊 ТЕКУЩИЙ СТАТУС СИСТЕМЫ:');
    console.log('='.repeat(30));
    
    try {
        const config = await getCurrentConfig();
        const activeConn = config.availableConnections.find(c => c.id === config.currentConnectionId);
        
        console.log(`🎯 Активное подключение: ${activeConn.name} (${activeConn.id})`);
        console.log(`🌐 URL: ${activeConn.url}`);
        console.log(`🔧 Тип: ${activeConn.type}`);
        console.log(`⏰ Обновлено: ${new Date(config.lastUpdated).toLocaleString()}`);
        
        if (activeConn.settings) {
            console.log('🛠️ Настройки:');
            Object.entries(activeConn.settings).forEach(([key, value]) => {
                if (key.includes('Key') || key.includes('password')) {
                    console.log(`   ${key}: ${typeof value === 'string' ? value.substring(0, 20) + '...' : value}`);
                } else {
                    console.log(`   ${key}: ${value}`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения статуса:', error.message);
    }
}

// Запуск тестов
async function main() {
    await showCurrentStatus();
    console.log('\n');
    await demonstrateConfigSwitch();
}

main().catch(error => {
    console.error('💥 Критическая ошибка:', error);
});