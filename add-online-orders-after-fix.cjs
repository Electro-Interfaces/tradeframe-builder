/**
 * ЗАПУСКАТЬ ПОСЛЕ ИСПРАВЛЕНИЯ CONSTRAINT В БАЗЕ ДАННЫХ!
 * Добавляет 25 операций с payment_method = 'online_order' (10% от 250)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

// Данные для генерации реалистичных операций
const tradingPoints = [
  { id: 'station_01', name: 'АЗС №1 Центральная' },
  { id: 'station_02', name: 'АЗС №2 Северная' },
  { id: 'station_03', name: 'АЗС №3 Южная' },
  { id: 'station_04', name: 'АЗС №4 Восточная' },
  { id: 'station_05', name: 'АЗС №5 Промзона' }
];

const fuelTypes = ['АИ-92', 'АИ-95', 'АИ-98', 'АИ-100', 'ДТ'];
const operators = ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Морозов М.М.', 'Лебедев Л.Л.'];
const devices = ['PUMP-001', 'PUMP-002', 'PUMP-003', 'PUMP-004', 'PUMP-005', 'PUMP-006'];

const fuelPrices = {
  'АИ-92': { min: 52, max: 54 },
  'АИ-95': { min: 55, max: 57 },
  'АИ-98': { min: 62, max: 65 },
  'АИ-100': { min: 68, max: 72 },
  'ДТ': { min: 58, max: 61 }
};

// Утилиты для генерации данных
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomAugust2025Date() {
  const start = new Date('2025-08-01T00:00:00Z');
  const end = new Date('2025-08-31T23:59:59Z');
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const regions = ['77', '78', '99', '177', '197', '199', '777'];
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const letter3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${letter1}${num1}${letter2}${letter3}${region}`;
}

function generateCustomerId() {
  return `CUST-${Math.floor(Math.random() * 100000)}`;
}

// Генерация одной операции с online_order
function generateOnlineOrderOperation(index) {
  const tradingPoint = tradingPoints[Math.floor(Math.random() * tradingPoints.length)];
  const fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const device = devices[Math.floor(Math.random() * devices.length)];
  
  const startTime = randomAugust2025Date();
  const endTime = new Date(startTime.getTime() + Math.floor(randomInRange(3, 10)) * 60000); // 3-10 минут
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
  
  const quantity = randomInRange(20, 75); // 20-75 литров для онлайн заказов
  const priceRange = fuelPrices[fuelType];
  const price = randomInRange(priceRange.min, priceRange.max);
  const totalCost = quantity * price;
  
  const operationId = `ONL-${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}-${String(index).padStart(3, '0')}`;
  const transactionId = `TXN-${startTime.getTime()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    id: operationId,
    operation_type: 'sale',
    status: Math.random() > 0.1 ? 'completed' : 'pending', // 90% completed, 10% pending
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration: duration,
    trading_point_id: tradingPoint.id,
    trading_point_name: tradingPoint.name,
    device_id: device,
    transaction_id: transactionId,
    fuel_type: fuelType,
    quantity: Math.round(quantity * 100) / 100,
    price: Math.round(price * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    payment_method: 'online_order', // 🎯 Главная цель!
    details: `Онлайн заказ топлива ${fuelType} через мобильное приложение`,
    progress: Math.random() > 0.1 ? 100 : Math.floor(randomInRange(0, 90)),
    operator_name: operator,
    customer_id: generateCustomerId(),
    vehicle_number: generateVehicleNumber(),
    metadata: {
      order_source: 'mobile_app',
      payment_confirmed: true,
      pre_authorization: true
    },
    created_at: startTime.toISOString(),
    updated_at: endTime.toISOString()
  };
}

async function addOnlineOrderOperations() {
  try {
    console.log('🚀 Начинаем добавление операций с online_order...');
    console.log('⚠️  УБЕДИТЕСЬ, что вы запустили SQL скрипт fix-payment-constraint.sql!');
    
    // Сначала проверим, что constraint исправлен
    console.log('🔍 Тестируем возможность добавления online_order...');
    
    const testOperation = {
      id: `TEST-CONSTRAINT-${Date.now()}`,
      operation_type: 'sale',
      status: 'completed',
      start_time: new Date().toISOString(),
      payment_method: 'online_order',
      details: 'Тест ограничения',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: testData, error: testError } = await supabase
      .from('operations')
      .insert(testOperation)
      .select();
    
    if (testError) {
      console.error('❌ ОШИБКА: Constraint все еще блокирует online_order!');
      console.error('💡 Решение: Запустите SQL скрипт fix-payment-constraint.sql в Supabase Dashboard');
      console.error('📋 Детали ошибки:', testError.message);
      return false;
    }
    
    // Удаляем тестовую запись
    await supabase.from('operations').delete().eq('id', testOperation.id);
    console.log('✅ Constraint исправлен! Можно добавлять online_order операции');
    
    // Генерируем 25 операций (10% от 250)
    const operations = [];
    for (let i = 1; i <= 25; i++) {
      operations.push(generateOnlineOrderOperation(i));
    }
    
    console.log(`📝 Сгенерировано ${operations.length} операций с online_order`);
    
    // Добавляем операции в базу данных пачками по 10
    const batchSize = 10;
    let totalAdded = 0;
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('operations')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Ошибка добавления пачки ${Math.floor(i/batchSize) + 1}:`, error.message);
        continue;
      }
      
      totalAdded += data.length;
      console.log(`✅ Добавлено ${data.length} операций (пачка ${Math.floor(i/batchSize) + 1})`);
    }
    
    console.log(`🎉 УСПЕХ! Добавлено ${totalAdded} операций с payment_method = 'online_order'`);
    
    // Показываем финальную статистику
    const { count: totalOperations } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });
      
    const { count: onlineOrderCount } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'online_order');
    
    console.log('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:');
    console.log(`💳 Операций с online_order: ${onlineOrderCount}`);
    console.log(`📊 Всего операций: ${totalOperations}`);
    console.log(`📈 Процент online_order: ${((onlineOrderCount / totalOperations) * 100).toFixed(1)}%`);
    
    // Показываем все способы оплаты
    const paymentMethods = ['cash', 'bank_card', 'fuel_card', 'online_order'];
    console.log('\n💰 Распределение по способам оплаты:');
    
    for (const method of paymentMethods) {
      const { count } = await supabase
        .from('operations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', method);
        
      const percentage = ((count / totalOperations) * 100).toFixed(1);
      console.log(`   ${method}: ${count} (${percentage}%)`);
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    return false;
  }
}

// Запуск
addOnlineOrderOperations().then((success) => {
  if (success) {
    console.log('\n🎯 Миссия выполнена! Теперь в разделе операций будут видны примеры с online_order');
    console.log('🔗 Перейдите в интерфейс: http://localhost:3006/network/operations-transactions');
  } else {
    console.log('\n💔 Не удалось добавить операции. Проверьте constraint в базе данных.');
  }
  
  process.exit(success ? 0 : 1);
});