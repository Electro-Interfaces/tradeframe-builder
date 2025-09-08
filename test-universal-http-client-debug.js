/**
 * Отладочный тест работы универсального HTTP клиента
 */

// Имитируем browser среду для ES модулей
globalThis.import = { meta: { env: { DEV: true } } };

// Имитация btoa для Node.js
if (typeof btoa === 'undefined') {
  globalThis.btoa = function(str) {
    return Buffer.from(str).toString('base64');
  };
}

// Imitation fetch для Node.js если нужен
if (typeof fetch === 'undefined') {
  const { fetch } = await import('node-fetch');
  globalThis.fetch = fetch;
}

async function testUniversalHttpClient() {
  console.log('🧪 ТЕСТ УНИВЕРСАЛЬНОГО HTTP КЛИЕНТА');
  console.log('====================================\n');

  try {
    // Динамический импорт универсального клиента
    console.log('📦 Импортируем универсальный HTTP клиент...');
    const { httpClient } = await import('./src/services/universalHttpClient.js');
    console.log('✅ Клиент импортирован успешно\n');

    // Тест 1: Проверим конфигурацию
    console.log('🔧 ТЕСТ 1: Проверка получения конфигурации');
    console.log('--------------------------------------------');
    
    try {
      const { tradingNetworkConfigService } = await import('./src/services/tradingNetworkConfigService.js');
      console.log('📋 Пытаемся получить конфигурацию торговой сети...');
      
      const config = await tradingNetworkConfigService.getConfig();
      console.log('✅ Конфигурация получена:');
      console.log('   - Включена:', config.enabled);
      console.log('   - Base URL:', config.baseUrl);
      console.log('   - Auth Type:', config.authType);
      console.log('   - Username:', config.username || 'не указан');
      console.log('   - Endpoints:', JSON.stringify(config.endpoints, null, 2));
      
    } catch (configError) {
      console.error('❌ Ошибка получения конфигурации:', configError.message);
      
      // Попробуем получить синхронную версию
      console.log('🔄 Пробуем синхронную версию конфигурации...');
      try {
        const { tradingNetworkConfigService } = await import('./src/services/tradingNetworkConfigService.js');
        const syncConfig = tradingNetworkConfigService.getConfigSync();
        console.log('✅ Синхронная конфигурация:');
        console.log('   - Включена:', syncConfig.enabled);
        console.log('   - Base URL:', syncConfig.baseUrl);
        console.log('   - Auth Type:', syncConfig.authType);
        console.log('   - Username:', syncConfig.username);
      } catch (syncError) {
        console.error('❌ И синхронная версия не работает:', syncError.message);
      }
    }
    
    console.log('\n🌐 ТЕСТ 2: Прямой запрос через универсальный клиент');
    console.log('--------------------------------------------------');
    
    // Тест прямого запроса к API резервуаров
    const testEndpoint = '/tanks';
    const testParams = {
      system: '15',  // Network external_id (Норд Лайн)
      station: '4'   // АЗС 4 external_id
    };
    
    console.log('📡 Делаем запрос:', testEndpoint);
    console.log('📋 Параметры:', testParams);
    
    const response = await httpClient.get(testEndpoint, {
      destination: 'external-api',
      queryParams: testParams,
      timeout: 10000
    });
    
    console.log('📊 Результат запроса:');
    console.log('   - Успех:', response.success);
    console.log('   - HTTP статус:', response.status);
    console.log('   - Время ответа:', response.responseTime + 'ms');
    console.log('   - Ошибка:', response.error || 'нет');
    
    if (response.success && response.data) {
      console.log('   - Данные:');
      if (Array.isArray(response.data)) {
        console.log(`     📊 Резервуаров: ${response.data.length}`);
        if (response.data.length > 0) {
          console.log('     🛢️  Первый резервуар:', JSON.stringify(response.data[0], null, 4));
        }
      } else {
        console.log('     📄 Полные данные:', JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log('   - Заголовки ответа:', response.headers);
      console.log('   - Полные данные ошибки:', response.data);
    }
    
  } catch (importError) {
    console.error('💥 Критическая ошибка импорта:', importError);
    console.error('Stack trace:', importError.stack);
  }
}

// Запуск теста
testUniversalHttpClient().catch(error => {
  console.error('💥 Неожиданная ошибка теста:', error);
  process.exit(1);
});