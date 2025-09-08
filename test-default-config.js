/**
 * Тестирование дефолтной конфигурации торгового API
 */

// Дефолтная конфигурация
const defaultConfig = {
  enabled: true,
  baseUrl: 'https://pos.autooplata.ru/tms',
  systemId: '',
  defaultStationId: '',
  authType: 'basic',
  username: 'UserApi',
  password: 'PasswordApi',
  apiKey: '',
  timeout: 30000,
  retryAttempts: 3,
  endpoints: {
    tanks: '/tanks',
    transactions: '/transactions'
  }
};

async function testDefaultAPI() {
  console.log('🧪 Тестируем дефолтную конфигурацию торгового API');
  console.log('====================================================');
  
  // Попробуем сделать запрос к резервуарам для АЗС 4 (external_id = 4)
  const testUrl = `${defaultConfig.baseUrl}${defaultConfig.endpoints.tanks}`;
  const system = '15'; // Network external_id из базы (Норд Лайн)
  const station = '4';  // Trading point external_id (АЗС 4)
  
  const fullUrl = `${testUrl}?system=${system}&station=${station}`;
  
  console.log('🌐 URL запроса:', fullUrl);
  console.log('🔐 Аутентификация:', defaultConfig.username + ':' + defaultConfig.password);
  
  try {
    // Создаем Basic Auth заголовок
    const authString = Buffer.from(`${defaultConfig.username}:${defaultConfig.password}`).toString('base64');
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'User-Agent': 'tradeframe-builder/1.0'
      },
      timeout: defaultConfig.timeout
    });
    
    console.log('📊 HTTP статус:', response.status, response.statusText);
    console.log('📋 Заголовки ответа:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Данные получены успешно:');
      console.log('📄 Количество резервуаров:', Array.isArray(data) ? data.length : 'не массив');
      if (Array.isArray(data) && data.length > 0) {
        console.log('🛢️  Первый резервуар:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('📄 Полный ответ:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка API:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('💥 Ошибка сетевого запроса:', error.message);
    
    // Попробуем альтернативные параметры
    console.log('\\n🔄 Пробуем альтернативные параметры...');
    
    const alternativeUrls = [
      `${testUrl}?system=1&station=1`,
      `${testUrl}?systemId=15&stationId=4`,
      `${testUrl}?networkId=15&pointId=4`,
    ];
    
    for (const altUrl of alternativeUrls) {
      console.log('🧪 Тестируем:', altUrl);
      try {
        const authString = Buffer.from(`${defaultConfig.username}:${defaultConfig.password}`).toString('base64');
        
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('   📊 Статус:', altResponse.status);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log('   ✅ Успех! Резервуаров:', Array.isArray(altData) ? altData.length : 'не массив');
          break;
        }
      } catch (altError) {
        console.log('   ❌ Ошибка:', altError.message);
      }
    }
  }
}

testDefaultAPI().catch(console.error);