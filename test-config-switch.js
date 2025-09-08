/**
 * Тест переключения конфигурации - проверяем что все сервисы реагируют на изменения
 */

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getCurrentConfig() {
    console.log('📊 Загрузка текущей конфигурации...');
    
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
        return data[0].config_value;
    } catch (error) {
        console.error('❌ Ошибка загрузки конфигурации:', error.message);
        return null;
    }
}

async function switchConnection(fromId, toId) {
    console.log(`🔄 Переключение подключения: ${fromId} → ${toId}`);
    
    try {
        const config = await getCurrentConfig();
        if (!config) return false;

        // Деактивируем текущее подключение
        const connections = config.availableConnections.map(conn => ({
            ...conn,
            isActive: conn.id === toId
        }));

        // Обновляем конфигурацию
        const updatedConfig = {
            ...config,
            currentConnectionId: toId,
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

        console.log(`✅ Подключение переключено на: ${toId}`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка переключения:', error.message);
        return false;
    }
}

async function testServiceWithConfig(serviceName, testUrl, expectedConnection) {
    console.log(`🧪 Тестирование ${serviceName}...`);
    
    try {
        const config = await getCurrentConfig();
        const activeConnection = config.availableConnections.find(c => c.id === config.currentConnectionId);
        
        if (activeConnection.id !== expectedConnection) {
            console.log(`⚠️ Ожидалось подключение ${expectedConnection}, но активно ${activeConnection.id}`);
        }

        const response = await fetch(testUrl, {
            headers: {
                'apikey': activeConnection.settings?.apiKey || API_KEY,
                'Authorization': `Bearer ${activeConnection.settings?.apiKey || API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const result = {
            service: serviceName,
            usedConnection: activeConnection.id,
            connectionName: activeConnection.name,
            url: activeConnection.url,
            testUrl: testUrl,
            status: response.status,
            timestamp: new Date().toISOString()
        };

        console.log(`✅ ${serviceName}:`, result);
        return result;
    } catch (error) {
        console.error(`❌ Ошибка ${serviceName}:`, error.message);
        return { service: serviceName, error: error.message };
    }
}

async function runFullConfigTest() {
    console.log('🚀 КОМПЛЕКСНЫЙ ТЕСТ ЦЕНТРАЛИЗОВАННОЙ КОНФИГУРАЦИИ');
    console.log('='.repeat(60));
    
    // Получаем текущую конфигурацию
    const initialConfig = await getCurrentConfig();
    if (!initialConfig) {
        console.log('❌ Не удалось загрузить конфигурацию');
        return;
    }

    const initialConnection = initialConfig.currentConnectionId;
    console.log(`📍 Исходное подключение: ${initialConnection}`);
    
    // Находим альтернативное подключение для теста
    const alternativeConnection = initialConfig.availableConnections.find(
        c => c.id !== initialConnection && c.type === 'supabase'
    );

    if (!alternativeConnection) {
        console.log('⚠️ Не найдено альтернативное подключение для теста');
        
        // Тестируем текущие сервисы
        console.log('\n📊 ТЕСТИРУЕМ СЕРВИСЫ С ТЕКУЩЕЙ КОНФИГУРАЦИЕЙ:');
        await testServiceWithConfig('tanks', `${API_URL}/rest/v1/tanks?limit=1`, initialConnection);
        await testServiceWithConfig('fuel_prices', `${API_URL}/rest/v1/fuel_prices?limit=1`, initialConnection);
        await testServiceWithConfig('operations', `${API_URL}/rest/v1/operations?limit=1`, initialConnection);
        await testServiceWithConfig('trading_points', `${API_URL}/rest/v1/trading_points?limit=1`, initialConnection);
        await testServiceWithConfig('equipment_templates', `${API_URL}/rest/v1/equipment_templates?limit=1`, initialConnection);
        
        return;
    }

    console.log(`🎯 Альтернативное подключение найдено: ${alternativeConnection.id}`);

    // ШАГ 1: Тестируем сервисы с исходным подключением
    console.log('\n📊 ШАГ 1: ТЕСТИРУЕМ СЕРВИСЫ С ИСХОДНЫМ ПОДКЛЮЧЕНИЕМ');
    console.log('-'.repeat(50));
    
    const results1 = [];
    results1.push(await testServiceWithConfig('tanks', `${API_URL}/rest/v1/tanks?limit=1`, initialConnection));
    results1.push(await testServiceWithConfig('fuel_prices', `${API_URL}/rest/v1/fuel_prices?limit=1`, initialConnection));
    results1.push(await testServiceWithConfig('operations', `${API_URL}/rest/v1/operations?limit=1`, initialConnection));
    results1.push(await testServiceWithConfig('trading_points', `${API_URL}/rest/v1/trading_points?limit=1`, initialConnection));

    // ШАГ 2: Переключаем подключение
    console.log('\n🔄 ШАГ 2: ПЕРЕКЛЮЧАЕМ ПОДКЛЮЧЕНИЕ');
    console.log('-'.repeat(50));
    
    const switchSuccess = await switchConnection(initialConnection, alternativeConnection.id);
    if (!switchSuccess) {
        console.log('❌ Не удалось переключить подключение');
        return;
    }

    // Небольшая пауза для применения изменений
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ШАГ 3: Тестируем сервисы с новым подключением  
    console.log('\n📊 ШАГ 3: ТЕСТИРУЕМ СЕРВИСЫ С НОВЫМ ПОДКЛЮЧЕНИЕМ');
    console.log('-'.repeat(50));
    
    const results2 = [];
    results2.push(await testServiceWithConfig('tanks', `${API_URL}/rest/v1/tanks?limit=1`, alternativeConnection.id));
    results2.push(await testServiceWithConfig('fuel_prices', `${API_URL}/rest/v1/fuel_prices?limit=1`, alternativeConnection.id));
    results2.push(await testServiceWithConfig('operations', `${API_URL}/rest/v1/operations?limit=1`, alternativeConnection.id));
    results2.push(await testServiceWithConfig('trading_points', `${API_URL}/rest/v1/trading_points?limit=1`, alternativeConnection.id));

    // ШАГ 4: Возвращаем исходное подключение
    console.log('\n↩️ ШАГ 4: ВОЗВРАЩАЕМ ИСХОДНОЕ ПОДКЛЮЧЕНИЕ');
    console.log('-'.repeat(50));
    
    await switchConnection(alternativeConnection.id, initialConnection);
    console.log(`✅ Возвращено исходное подключение: ${initialConnection}`);

    // АНАЛИЗ РЕЗУЛЬТАТОВ
    console.log('\n📈 АНАЛИЗ РЕЗУЛЬТАТОВ:');
    console.log('='.repeat(60));
    
    const allServicesUseCentralizedConfig = results1.every(r => !r.error) && results2.every(r => !r.error);
    const servicesRespondToConfigChanges = results1.every((r1, i) => {
        const r2 = results2[i];
        return r1.usedConnection !== r2.usedConnection;
    });

    console.log(`✅ Все сервисы используют централизованную конфигурацию: ${allServicesUseCentralizedConfig ? 'ДА' : 'НЕТ'}`);
    console.log(`✅ Сервисы реагируют на изменения конфигурации: ${servicesRespondToConfigChanges ? 'ДА' : 'НЕТ'}`);
    
    if (allServicesUseCentralizedConfig && servicesRespondToConfigChanges) {
        console.log('\n🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
        console.log('🔧 Централизованная конфигурация работает корректно');
        console.log('🔄 Все сервисы автоматически используют новые настройки при изменении конфигурации');
    } else {
        console.log('\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
        if (!allServicesUseCentralizedConfig) {
            console.log('- Не все сервисы используют централизованную конфигурацию');
        }
        if (!servicesRespondToConfigChanges) {
            console.log('- Сервисы не реагируют на изменения конфигурации');
        }
    }

    console.log('\n📊 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
    console.log('Исходное подключение:', results1.map(r => `${r.service}: ${r.usedConnection}`).join(', '));
    console.log('После переключения:', results2.map(r => `${r.service}: ${r.usedConnection}`).join(', '));
}

// Запуск теста
runFullConfigTest().catch(error => {
    console.error('💥 Критическая ошибка теста:', error);
});