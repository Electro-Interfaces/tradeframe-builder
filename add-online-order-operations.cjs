/**
 * Скрипт для добавления операций с payment_method = 'online_order'
 * Добавляет 25 операций (10% от 250) с разнообразными параметрами
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

// Базы данных для генерации реалистичных данных
const tradingPoints = [
  { id: 'station_01', name: 'АЗС №1 Центральная' },
  { id: 'station_02', name: 'АЗС №2 Северная' },
  { id: 'station_03', name: 'АЗС №3 Южная' },
  { id: 'station_04', name: 'АЗС №4 Восточная' },
  { id: 'station_05', name: 'АЗС №5 Промзона' }
];

const fuelTypes = ['АИ-92', 'АИ-95', 'АИ-98', 'АИ-100', 'ДТ'];

const operators = [
  'Иванов И.И.',
  'Петров П.П.',
  'Сидоров С.С.',
  'Морозов М.М.',
  'Лебедев Л.Л.',
  'Волков В.В.',
  'Попов Б.Б.'
];

const devices = [
  'PUMP-001', 'PUMP-002', 'PUMP-003', 'PUMP-004', 'PUMP-005',
  'PUMP-006', 'PUMP-007', 'PUMP-008', 'PUMP-009', 'PUMP-010',
  'PUMP-011', 'PUMP-012'
];

// Цены за литр по видам топлива (в рублях)
const fuelPrices = {
  'АИ-92': { min: 52, max: 54 },
  'АИ-95': { min: 55, max: 57 },
  'АИ-98': { min: 62, max: 65 },
  'АИ-100': { min: 68, max: 72 },
  'ДТ': { min: 58, max: 61 }
};

// Генерация случайного значения в диапазоне
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Генерация случайной даты в августе 2025
function randomAugust2025Date() {
  const start = new Date('2025-08-01T00:00:00Z');
  const end = new Date('2025-08-31T23:59:59Z');
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Генерация номера машины
function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const numbers = '0123456789';
  const regions = ['77', '78', '99', '177', '197', '199', '777'];
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const letter3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${letter1}${num1}${letter2}${letter3}${region}`;
}

// Генерация ID клиента
function generateCustomerId() {
  return `CUST-${Math.floor(Math.random() * 100000)}`;
}

// Создание одной операции
function generateOnlineOrderOperation(index) {
  const tradingPoint = tradingPoints[Math.floor(Math.random() * tradingPoints.length)];
  const fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const device = devices[Math.floor(Math.random() * devices.length)];
  
  const startTime = randomAugust2025Date();
  const endTime = new Date(startTime.getTime() + Math.floor(randomInRange(2, 8)) * 60000); // 2-8 минут
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // в минутах
  
  const quantity = randomInRange(15, 80); // 15-80 литров
  const priceRange = fuelPrices[fuelType];
  const price = randomInRange(priceRange.min, priceRange.max);
  const totalCost = quantity * price;
  
  const operationId = `ONL-${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}-${String(index).padStart(3, '0')}`;
  const transactionId = `TXN-${startTime.getTime()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    id: operationId,
    operation_type: 'sale',
    status: 'completed',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration: duration,
    trading_point_id: tradingPoint.id,
    trading_point_name: tradingPoint.name,
    device_id: device,
    transaction_id: transactionId,
    fuel_type: fuelType,
    quantity: Math.round(quantity * 100) / 100, // округление до 2 знаков
    price: Math.round(price * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    payment_method: 'online_order',
    details: `Онлайн заказ топлива ${fuelType}`,
    progress: 100,
    operator_name: operator,
    customer_id: generateCustomerId(),
    vehicle_number: generateVehicleNumber(),
    metadata: {},
    created_at: startTime.toISOString(),
    updated_at: endTime.toISOString()
  };
}

async function addOnlineOrderOperations() {
  console.log('🚀 Начинаем добавление операций с online_order...');
  
  try {
    // Генерируем 25 операций
    const operations = [];
    for (let i = 1; i <= 25; i++) {
      operations.push(generateOnlineOrderOperation(i));
    }
    
    console.log(`📝 Сгенерировано ${operations.length} операций с online_order`);
    
    // Добавляем операции в базу данных
    const { data, error } = await supabase
      .from('operations')
      .insert(operations)
      .select();
    
    if (error) {
      console.error('❌ Ошибка при добавлении операций:', error);
      return false;
    }
    
    console.log(`✅ Успешно добавлено ${data.length} операций с payment_method = 'online_order'`);
    
    // Проверяем общее количество операций
    const { count } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });
      
    console.log(`📊 Общее количество операций в БД: ${count}`);
    
    // Проверяем количество операций с online_order
    const { count: onlineOrderCount } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'online_order');
      
    console.log(`💳 Операций с online_order: ${onlineOrderCount}`);
    console.log(`📈 Процент от общего числа: ${((onlineOrderCount / count) * 100).toFixed(1)}%`);
    
    return true;
    
  } catch (err) {
    console.error('💥 Критическая ошибка:', err);
    return false;
  }
}

// Запуск скрипта
addOnlineOrderOperations().then((success) => {
  if (success) {
    console.log('🎉 Скрипт выполнен успешно!');
    process.exit(0);
  } else {
    console.log('💔 Скрипт завершился с ошибками');
    process.exit(1);
  }
});