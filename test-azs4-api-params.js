/**
 * Тест правильности API параметров для АЗС 4
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_TRADING_POINT_ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'; // АЗС 4

async function testApiParams() {
  console.log('🧪 ТЕСТ API ПАРАМЕТРОВ ДЛЯ АЗС 4');
  console.log('ID торговой точки:', TARGET_TRADING_POINT_ID);
  console.log('=====================================\n');
  
  // Получаем данные торговой точки
  const { data: tradingPoint, error: tpError } = await supabase
    .from('trading_points')
    .select('*')
    .eq('id', TARGET_TRADING_POINT_ID)
    .single();
    
  if (tpError) {
    console.error('❌ Ошибка получения торговой точки:', tpError);
    return;
  }
  
  console.log('🏪 ТОРГОВАЯ ТОЧКА:');
  console.log(`   Название: ${tradingPoint.name}`);
  console.log(`   External ID: ${tradingPoint.external_id || 'НЕ УКАЗАН'}`);
  console.log(`   Code: ${tradingPoint.code || 'не указан'}`);
  console.log(`   Network ID: ${tradingPoint.network_id}`);
  
  // Station ID = external_id торговой точки
  const stationId = tradingPoint.external_id || tradingPoint.code || '';
  console.log(`   📋 Station ID (для API): "${stationId}"`);
  
  // Получаем данные сети
  let systemId = '';
  
  if (tradingPoint.network_id) {
    console.log('\n🌐 СЕТЬ:');
    
    const { data: network, error: networkError } = await supabase
      .from('networks')
      .select('*')
      .eq('id', tradingPoint.network_id)
      .single();
      
    if (networkError) {
      console.error('❌ Ошибка получения сети:', networkError);
    } else {
      console.log(`   Название: ${network.name}`);
      console.log(`   External ID: ${network.external_id || 'НЕ УКАЗАН'}`);
      
      systemId = network.external_id || network.name || '';
      console.log(`   📋 System ID (для API): "${systemId}"`);
    }
  }
  
  console.log('\n📊 ИТОГОВЫЕ API ПАРАМЕТРЫ:');
  console.log('============================');
  console.log(`System (сеть): "${systemId}"`);
  console.log(`Station (торговая точка): "${stationId}"`);
  
  // Формируем URL для тестирования
  const baseUrl = 'https://pos.autooplata.ru/tms';
  const endpoint = '/tanks';
  const fullUrl = `${baseUrl}${endpoint}?system=${systemId}&station=${stationId}`;
  
  console.log('\n🌐 URL ДЛЯ ТЕСТИРОВАНИЯ:');
  console.log(fullUrl);
  
  // Проверяем, есть ли все необходимые параметры
  if (!systemId || !stationId) {
    console.log('\n❌ ПРОБЛЕМА: Отсутствуют обязательные параметры!');
    if (!systemId) {
      console.log('   - System ID (external_id сети) не найден');
    }
    if (!stationId) {
      console.log('   - Station ID (external_id торговой точки) не найден');
    }
    console.log('\n💡 РЕШЕНИЕ: Нужно добавить external_id в соответствующие записи в базе данных');
  } else {
    console.log('\n✅ ВСЕ ПАРАМЕТРЫ НАЙДЕНЫ - API запрос может быть выполнен');
    
    // Попробуем сделать тестовый запрос
    console.log('\n🧪 ТЕСТОВЫЙ ЗАПРОС К API:');
    console.log('---------------------------');
    
    try {
      const authString = Buffer.from('UserApi:PasswordApi').toString('base64');
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
          'User-Agent': 'tradeframe-builder/1.0'
        },
        timeout: 10000
      });
      
      console.log(`📊 HTTP статус: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Успешный ответ от API!');
        console.log(`📊 Тип данных: ${Array.isArray(data) ? 'массив' : typeof data}`);
        if (Array.isArray(data)) {
          console.log(`🛢️  Количество резервуаров: ${data.length}`);
          if (data.length > 0) {
            console.log('🛢️  Первый резервуар:', JSON.stringify(data[0], null, 2));
          }
        } else {
          console.log('📄 Данные:', JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Ошибка API: ${response.status} - ${errorText}`);
      }
      
    } catch (fetchError) {
      console.log(`💥 Ошибка запроса: ${fetchError.message}`);
    }
  }
}

testApiParams().catch(console.error);