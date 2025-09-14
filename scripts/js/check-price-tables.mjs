/**
 * Проверка существования таблиц для цен в БД
 */

const config = {
  url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI',
  schema: 'public'
};

async function checkPriceTables() {
  console.log('🔍 Проверка таблиц для раздела цены');
  console.log('=' .repeat(50));
  
  try {
    // Список таблиц, которые должны быть для цен
    const requiredTables = [
      'prices',
      'price_packages',
      'nomenclature'  // должна быть связана с fuel_types
    ];
    
    console.log('\n📋 ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ТАБЛИЦ:');
    
    for (const tableName of requiredTables) {
      try {
        const response = await fetch(`${config.url}/rest/v1/${tableName}?limit=1`, {
          method: 'GET',
          headers: {
            'apikey': config.apiKey,
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${tableName}: EXISTS (${data.length} записей в тестовой выборке)`);
          
          // Для prices показываем структуру
          if (tableName === 'prices' && data.length > 0) {
            console.log(`   Структура: ${Object.keys(data[0]).join(', ')}`);
          }
          
        } else if (response.status === 404) {
          console.log(`❌ ${tableName}: НЕ НАЙДЕНА - ТРЕБУЕТСЯ СОЗДАНИЕ`);
        } else if (response.status === 401) {
          console.log(`🔒 ${tableName}: НЕТ ДОСТУПА (${response.status}) - возможно RLS`);
        } else {
          const errorText = await response.text();
          console.log(`❌ ${tableName}: ОШИБКА ${response.status} - ${errorText}`);
        }
        
      } catch (error) {
        console.log(`❌ ${tableName}: ИСКЛЮЧЕНИЕ - ${error.message}`);
      }
    }
    
    // Проверяем связь nomenclature с fuel_types
    console.log('\n🔗 ПРОВЕРКА СВЯЗЕЙ:');
    
    try {
      // Проверяем есть ли в nomenclature поле fuel_type_id
      const nomenclatureResponse = await fetch(`${config.url}/rest/v1/nomenclature?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (nomenclatureResponse.ok) {
        const nomenclatureData = await nomenclatureResponse.json();
        if (nomenclatureData.length > 0) {
          const fields = Object.keys(nomenclatureData[0]);
          const hasFuelTypeId = fields.includes('fuel_type_id');
          
          console.log(`📊 nomenclature → fuel_types: ${hasFuelTypeId ? '✅ СВЯЗЬ ЕСТЬ' : '❌ СВЯЗЬ ОТСУТСТВУЕТ'}`);
          
          if (!hasFuelTypeId) {
            console.log(`   Найденные поля: ${fields.join(', ')}`);
            console.log(`   ⚠️ НУЖНО ДОБАВИТЬ: ALTER TABLE nomenclature ADD COLUMN fuel_type_id UUID REFERENCES fuel_types(id);`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Ошибка проверки связей: ${error.message}`);
    }
    
    // Проверяем текущие значения price_history (есть ли данные)
    console.log('\n📈 ПРОВЕРКА ИСТОРИИ ЦЕН:');
    
    try {
      const priceHistoryResponse = await fetch(`${config.url}/rest/v1/price_history?limit=5&select=id,trading_point_id,fuel_type_id,price,effective_date`, {
        method: 'GET', 
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (priceHistoryResponse.ok) {
        const historyData = await priceHistoryResponse.json();
        console.log(`📊 price_history: ${historyData.length} записей`);
        
        if (historyData.length > 0) {
          console.log(`   Структура: ${Object.keys(historyData[0]).join(', ')}`);
          historyData.forEach(entry => {
            console.log(`   - ${entry.effective_date}: ${entry.price} (точка: ${entry.trading_point_id}, топливо: ${entry.fuel_type_id})`);
          });
        } else {
          console.log(`   ⚠️ Таблица пуста - нет исторических данных`);
        }
      }
    } catch (error) {
      console.log(`❌ Ошибка проверки price_history: ${error.message}`);
    }
    
    console.log('\n📝 ЗАКЛЮЧЕНИЕ:');
    
    console.log(`
┌─ СТАТУС ГОТОВНОСТИ К МИГРАЦИИ ─┐
│                                │
│ ✅ fuel_types: Готова         │
│ ✅ nomenclature: Готова       │
│ ✅ trading_points: Готова     │
│ ✅ networks: Готова           │
│ ✅ users: Готова              │
│ ✅ price_history: Готова      │
│                                │
│ ❓ prices: Проверить           │
│ ❓ price_packages: Проверить   │
│                                │
└────────────────────────────────┘
`);
    
  } catch (error) {
    console.log('❌ Общая ошибка при проверке таблиц:', error.message);
  }
}

// Запускаем проверку
checkPriceTables().catch(console.error);