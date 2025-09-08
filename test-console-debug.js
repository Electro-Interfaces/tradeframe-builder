/**
 * КОНСОЛЬНЫЙ ТЕСТ для копирования в DevTools
 * Скопируйте этот код в консоль браузера на странице http://localhost:3000
 */

console.log('🧪 ЗАПУСК КОНСОЛЬНОГО ТЕСТА УНИВЕРСАЛЬНОГО HTTP КЛИЕНТА');
console.log('======================================================');

// Функция для пошагового тестирования
async function testHttpClientInConsole() {
    const TARGET_TP_ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'; // АЗС 4
    
    try {
        console.log('📦 ШАГ 1: Импорт модулей...');
        
        // Импортируем модули (они должны быть доступны в браузере)
        const { httpClient } = await import('./src/services/universalHttpClient.js');
        const { tradingNetworkConfigService } = await import('./src/services/tradingNetworkConfigService.js');
        const { tradingPointsService } = await import('./src/services/tradingPointsService.js');
        const { networksService } = await import('./src/services/networksService.js');
        
        console.log('✅ Модули импортированы');
        
        // ШАГ 2: Получение конфигурации
        console.log('🔧 ШАГ 2: Получение конфигурации...');
        
        let config;
        try {
            config = await tradingNetworkConfigService.getConfig();
            console.log('✅ Async конфигурация получена:', config);
        } catch (asyncError) {
            console.error('❌ Async конфигурация не работает:', asyncError.message);
            console.log('🔄 Пробуем sync версию...');
            
            try {
                config = tradingNetworkConfigService.getConfigSync();
                console.log('⚠️ Sync конфигурация:', config);
            } catch (syncError) {
                console.error('💥 Обе конфигурации не работают:', syncError.message);
                return;
            }
        }
        
        // ШАГ 3: API параметры
        console.log('🆔 ШАГ 3: Получение API параметров...');
        
        const tradingPoint = await tradingPointsService.getById(TARGET_TP_ID);
        console.log('📍 Торговая точка:', tradingPoint);
        
        if (!tradingPoint) {
            console.error('❌ Торговая точка не найдена');
            return;
        }
        
        const stationId = tradingPoint.external_id || tradingPoint.code || '';
        let systemId = '';
        
        if (tradingPoint.network_id) {
            const network = await networksService.getById(tradingPoint.network_id);
            console.log('🌐 Сеть:', network);
            if (network) {
                systemId = network.external_id || network.name || '';
            }
        }
        
        console.log('📋 API параметры:');
        console.log('   System ID:', systemId);
        console.log('   Station ID:', stationId);
        
        if (!systemId || !stationId) {
            console.error('❌ Отсутствуют обязательные параметры');
            return;
        }
        
        // ШАГ 4: HTTP клиент запрос
        console.log('🌐 ШАГ 4: Запрос через HTTP клиент...');
        
        const endpoint = config.endpoints?.tanks || '/tanks';
        const queryParams = { system: systemId, station: stationId };
        const fullUrl = `${config.baseUrl}${endpoint}?system=${systemId}&station=${stationId}`;
        
        console.log('📋 Параметры запроса:');
        console.log('   Endpoint:', endpoint);
        console.log('   Query Params:', queryParams);
        console.log('   Full URL:', fullUrl);
        
        const startTime = Date.now();
        
        const response = await httpClient.get(endpoint, {
            destination: 'external-api',
            queryParams: queryParams,
            timeout: 15000
        });
        
        const responseTime = Date.now() - startTime;
        
        console.log('📊 Ответ HTTP клиента:');
        console.log('   Success:', response.success);
        console.log('   Status:', response.status);
        console.log('   Error:', response.error);
        console.log('   Time:', responseTime + 'ms');
        console.log('   Data:', response.data);
        
        if (response.success && Array.isArray(response.data)) {
            console.log('✅ HTTP клиент работает! Резервуаров:', response.data.length);
            if (response.data.length > 0) {
                console.log('🛢️  Первый резервуар:', response.data[0]);
            }
        } else {
            console.error('❌ HTTP клиент не вернул данные');
            console.log('🔍 Детали ошибки:', {
                success: response.success,
                status: response.status,
                error: response.error,
                headers: response.headers,
                rawData: response.data
            });
        }
        
        // ШАГ 5: Прямой запрос для сравнения
        console.log('🔄 ШАГ 5: Прямой fetch запрос для сравнения...');
        
        try {
            const authString = btoa(`${config.username}:${config.password}`);
            
            const directResponse = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json',
                    'User-Agent': 'tradeframe-builder/console-test'
                }
            });
            
            console.log('📊 Прямой запрос:', directResponse.status, directResponse.statusText);
            
            if (directResponse.ok) {
                const directData = await directResponse.json();
                console.log('✅ Прямой запрос успешен! Резервуаров:', Array.isArray(directData) ? directData.length : 'не массив');
                console.log('🛢️  Прямые данные:', directData);
                
                // Сравнение
                const httpWorks = response.success && Array.isArray(response.data);
                const directWorks = Array.isArray(directData) && directData.length > 0;
                
                if (httpWorks && directWorks) {
                    console.log('🎉 ОБА МЕТОДА РАБОТАЮТ!');
                } else if (directWorks && !httpWorks) {
                    console.warn('⚠️ ПРОБЛЕМА: Прямой запрос работает, HTTP клиент - НЕТ');
                    console.log('🔍 Нужно проверить универсальный HTTP клиент');
                } else {
                    console.error('❌ Оба метода не работают - проблема в API или параметрах');
                }
                
            } else {
                const errorText = await directResponse.text();
                console.error('❌ Прямой запрос неудачен:', directResponse.status, errorText);
            }
            
        } catch (fetchError) {
            console.error('💥 Ошибка прямого запроса:', fetchError.message);
        }
        
        console.log('🏁 КОНСОЛЬНЫЙ ТЕСТ ЗАВЕРШЕН');
        
    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    }
}

// Автозапуск теста
testHttpClientInConsole();