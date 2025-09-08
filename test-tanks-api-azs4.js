/**
 * Тестирование работы API резервуаров для АЗС 4
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_TRADING_POINT_ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'; // АЗС 4

async function testTanksAPI() {
  console.log('🧪 Тестируем работу API резервуаров для АЗС 4');
  console.log('ID торговой точки:', TARGET_TRADING_POINT_ID);
  console.log('===============================================\n');
  
  // Проверим конфигурацию торговой сети
  console.log('📋 Проверяем конфигурацию торговой сети...');
  
  const { data: configData, error: configError } = await supabase
    .from('system_config')
    .select('*')
    .eq('key', 'trading_network_config')
    .single();
    
  if (configError) {
    console.error('❌ Ошибка получения конфигурации:', configError);
    console.log('⚠️  Возможно, конфигурация не настроена в разделе "Обмен данными"');
  } else if (configData) {
    console.log('✅ Конфигурация найдена');
    const config = JSON.parse(configData.value);
    console.log('   - Включена:', config.enabled ? 'Да' : 'Нет');
    console.log('   - Base URL:', config.baseUrl || 'не настроен');
    console.log('   - Эндпоинт резервуаров:', config.endpoints?.tanks || 'не настроен');
    
    if (!config.enabled) {
      console.log('⚠️  ПРОБЛЕМА: Торговая сеть отключена в настройках');
    }
    
    if (!config.endpoints?.tanks) {
      console.log('⚠️  ПРОБЛЕМА: Эндпоинт для резервуаров не настроен');
    }
  } else {
    console.log('❌ Конфигурация не найдена');
    console.log('⚠️  Необходимо настроить в разделе "Обмен данными"');
  }
  
  console.log('\n🔍 Проверяем данные торговой точки АЗС 4...');
  
  const { data: tradingPoint, error: tpError } = await supabase
    .from('trading_points')
    .select('*')
    .eq('id', TARGET_TRADING_POINT_ID)
    .single();
    
  if (tpError) {
    console.error('❌ Ошибка получения данных торговой точки:', tpError);
  } else {
    console.log('✅ Торговая точка найдена:');
    console.log('   - Название:', tradingPoint.name);
    console.log('   - External ID:', tradingPoint.external_id || 'НЕ УКАЗАН');
    console.log('   - Code:', tradingPoint.code || 'не указан');
    
    if (!tradingPoint.external_id && !tradingPoint.code) {
      console.log('⚠️  ПРОБЛЕМА: Нет external_id или code для API запросов');
    }
  }
  
  // Попробуем импортировать и протестировать сервис
  console.log('\n🧪 Тестируем сервис tanksApiIntegrationService...');
  
  try {
    // Динамический импорт модуля
    const { tanksApiIntegrationService } = await import('./src/services/tanksApiIntegrationService.js');
    
    // Тестируем подключение к API
    const testResult = await tanksApiIntegrationService.testApiConnection();
    
    console.log('Результат тестирования API:');
    console.log('   - Успех:', testResult.success ? 'Да' : 'Нет');
    console.log('   - Сообщение:', testResult.message);
    
    if (testResult.data) {
      console.log('   - Данные от API:', JSON.stringify(testResult.data, null, 2));
    }
    
  } catch (importError) {
    console.error('❌ Ошибка импорта сервиса:', importError.message);
  }
}

testTanksAPI().catch(console.error);