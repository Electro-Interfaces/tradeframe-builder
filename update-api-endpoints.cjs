/**
 * Скрипт для обновления эндпоинтов торгового API
 * Исправляет эндпоинты на правильные пути
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk0OTAwMCwiZXhwIjoyMDUyNTI1MDAwfQ.lkNzYmKgN13T28iBTxUIQ5ZVKAGkdR6eFdZs8eHdoRGv_GwPyS0ZzwAL5kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateApiEndpoints() {
  try {
    console.log('🔄 Получаем текущую конфигурацию торгового API...');
    
    // Получаем текущую конфигурацию
    const { data: configData, error: fetchError } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'trading_network_config')
      .single();
    
    if (fetchError) {
      console.error('❌ Ошибка получения конфигурации:', fetchError);
      return;
    }
    
    if (!configData) {
      console.error('❌ Конфигурация торгового API не найдена');
      return;
    }
    
    console.log('📄 Текущая конфигурация:', JSON.stringify(configData.value, null, 2));
    
    // Обновляем эндпоинты
    const updatedConfig = {
      ...configData.value,
      endpoints: {
        tanks: '/v1/tanks',         // Исправляем с /tanks на /v1/tanks
        transactions: '/v1/transactions'  // Исправляем с /transactions на /v1/transactions
      }
    };
    
    console.log('✏️ Обновленная конфигурация:', JSON.stringify(updatedConfig, null, 2));
    
    // Сохраняем обновленную конфигурацию
    const { error: updateError } = await supabase
      .from('system_config')
      .update({
        value: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'trading_network_config');
    
    if (updateError) {
      console.error('❌ Ошибка обновления конфигурации:', updateError);
      return;
    }
    
    console.log('✅ Эндпоинты торгового API успешно обновлены!');
    console.log('🔧 Новые эндпоинты:');
    console.log('   - Резервуары: /v1/tanks');
    console.log('   - Транзакции: /v1/transactions');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

updateApiEndpoints();