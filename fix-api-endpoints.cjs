/**
 * Скрипт для исправления эндпоинтов торгового API
 * Использует правильную авторизацию через системный ключ
 */

async function main() {
  console.log('🔧 Исправляем эндпоинты торгового API...');
  
  try {
    // Используем fetch напрямую с правильными заголовками
    const response = await fetch('http://localhost:3000/supabase-proxy/rest/v1/system_config?key=eq.trading_network_config', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NDkwMDAsImV4cCI6MjA1MjUyNTAwMH0.Mn0fYenKB2H0fRD8u_7aTpTw_M-iqGCrVk5M5hKZkN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NDkwMDAsImV4cCI6MjA1MjUyNTAwMH0.Mn0fYenKB2H0fRD8u_7aTpTw_M-iqGCrVk5M5hKZkN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Ошибка получения конфигурации:', response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log('📄 Получена конфигурация:', data);

    if (!data || data.length === 0) {
      console.error('❌ Конфигурация торгового API не найдена');
      return;
    }

    const config = data[0];
    const currentValue = config.value;
    
    console.log('🔍 Текущие эндпоинты:', JSON.stringify(currentValue.endpoints, null, 2));

    // Обновляем эндпоинты на правильные
    const updatedValue = {
      ...currentValue,
      endpoints: {
        tanks: '/v1/tanks',
        transactions: '/v1/transactions'
      }
    };

    console.log('✏️ Новые эндпоинты:', JSON.stringify(updatedValue.endpoints, null, 2));

    // Сохраняем обновленную конфигурацию
    const updateResponse = await fetch('http://localhost:3000/supabase-proxy/rest/v1/system_config?key=eq.trading_network_config', {
      method: 'PATCH',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NDkwMDAsImV4cCI6MjA1MjUyNTAwMH0.Mn0fYenKB2H0fRD8u_7aTpTw_M-iqGCrVk5M5hKZkN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NDkwMDAsImV4cCI6MjA1MjUyNTAwMH0.Mn0fYenKB2H0fRD8u_7aTpTw_M-iqGCrVk5M5hKZkN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        value: updatedValue,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      console.error('❌ Ошибка обновления:', updateResponse.status, await updateResponse.text());
      return;
    }

    const updatedData = await updateResponse.json();
    console.log('✅ Эндпоинты успешно обновлены!');
    console.log('🎯 Новая конфигурация:', updatedData);
    console.log('');
    console.log('🔧 Обновленные эндпоинты:');
    console.log('   - Резервуары: /v1/tanks');
    console.log('   - Транзакции: /v1/transactions');
    console.log('');
    console.log('💡 Теперь попробуйте протестировать соединение в интерфейсе!');

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

main();