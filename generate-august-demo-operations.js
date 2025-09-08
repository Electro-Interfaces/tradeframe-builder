/**
 * Генератор демо-операций для сети АЗС за август 2025
 * Согласно промпту: 250 транзакций с реалистичным распределением
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Конфигурация сети АЗС
const stations = [
  { id: 'station_01', name: 'АЗС №1 Центральная', pumps: 8 },
  { id: 'station_02', name: 'АЗС №2 Северная', pumps: 6 },
  { id: 'station_03', name: 'АЗС №3 Южная', pumps: 10 },
  { id: 'station_04', name: 'АЗС №4 Восточная', pumps: 4 },
  { id: 'station_05', name: 'АЗС №5 Промзона', pumps: 12 }
];

// Виды топлива с ценами (5 видов согласно номенклатуре компании)
const fuelTypes = [
  { type: 'АИ-92', minPrice: 52, maxPrice: 54 },
  { type: 'АИ-95', minPrice: 55, maxPrice: 57 },
  { type: 'АИ-98', minPrice: 62, maxPrice: 64 },
  { type: 'АИ-100', minPrice: 68, maxPrice: 70 },
  { type: 'ДТ', minPrice: 58, maxPrice: 60 }
];

// Способы оплаты (только разрешенные в БД согласно constraint)
const paymentMethods = ['cash', 'bank_card', 'fuel_card'];
const paymentMethodNames = {
  'cash': 'Наличные',
  'bank_card': 'Банковские карты', 
  'fuel_card': 'Топливные карты'
};

// Распределение способов оплаты (реалистичное для АЗС)
const paymentWeights = {
  'fuel_card': 0.40,  // 40% - корпоративные клиенты
  'bank_card': 0.35,  // 35% - банковские карты
  'cash': 0.25        // 25% - наличные (уменьшается)
};

// Статусы операций с вероятностями
const operationStatuses = [
  { status: 'completed', probability: 0.90 },
  { status: 'failed', probability: 0.03 },
  { status: 'pending', probability: 0.03 },
  { status: 'in_progress', probability: 0.03 },
  { status: 'cancelled', probability: 0.01 }
];

// Операторы
const operators = [
  'Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Козлов К.К.', 
  'Морозов М.М.', 'Волков В.В.', 'Соколов С.С.', 'Лебедев Л.Л.',
  'Новikov Н.Н.', 'Федоров Ф.Ф.', 'Михайлов М.М.', 'Попов Б.Б.'
];

/**
 * Генерирует случайную дату в августе 2025 с учетом сезонности
 */
function generateRandomDate() {
  const year = 2025;
  const month = 7; // август (0-based)
  const daysInMonth = 31;
  
  // Вес дней: больше операций в будни, меньше в выходные
  const dayWeights = {
    0: 0.6, // воскресенье
    1: 1.0, // понедельник
    2: 1.0, // вторник
    3: 1.0, // среда
    4: 1.0, // четверг
    5: 1.3, // пятница - больше активности
    6: 0.7  // суббота
  };
  
  // Генерируем день с учетом весов + конец месяца активнее
  let day;
  if (Math.random() < 0.3) { // 30% шанс на конец месяца
    day = 25 + Math.floor(Math.random() * 7); // 25-31 августа
  } else {
    day = 1 + Math.floor(Math.random() * 24); // 1-24 августа
  }
  
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  
  // Пересоздаем дату если вес дня не подходит
  if (Math.random() > dayWeights[dayOfWeek]) {
    return generateRandomDate(); // рекурсивно попробуем снова
  }
  
  // Генерируем час с учетом дневной активности
  let hour;
  const rand = Math.random();
  if (rand < 0.1) { // 10% - ночь (00:00-05:59)
    hour = Math.floor(Math.random() * 6);
  } else if (rand < 0.2) { // 10% - утро (06:00-09:59)
    hour = 6 + Math.floor(Math.random() * 4);
  } else if (rand < 0.7) { // 50% - день (10:00-18:59)
    hour = 10 + Math.floor(Math.random() * 9);
  } else { // 30% - вечер (19:00-23:59)
    hour = 19 + Math.floor(Math.random() * 5);
  }
  
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Выбирает случайный статус с учетом вероятностей
 */
function getRandomStatus() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const item of operationStatuses) {
    cumulative += item.probability;
    if (rand <= cumulative) {
      return item.status;
    }
  }
  return 'completed'; // fallback
}

/**
 * Выбирает способ оплаты с учетом реалистичных весов
 */
function getRandomPaymentMethod() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [method, weight] of Object.entries(paymentWeights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return method;
    }
  }
  return 'fuel_card'; // fallback на самый популярный
}

/**
 * Генерирует случайный номер автомобиля
 */
function generateVehicleNumber() {
  const letters1 = 'АВЕКМНОРСТУХ';
  const letters2 = 'АВЕКМНОРСТУХ';
  const regions = ['77', '99', '197', '199', '178', '777'];
  
  const l1 = letters1[Math.floor(Math.random() * letters1.length)];
  const nums = String(Math.floor(Math.random() * 900) + 100);
  const l2 = letters2[Math.floor(Math.random() * letters2.length)];
  const l3 = letters2[Math.floor(Math.random() * letters2.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${l1}${nums}${l2}${l3}${region}`;
}

/**
 * Генерирует одну операцию
 */
function generateOperation(index) {
  const station = stations[Math.floor(Math.random() * stations.length)];
  const fuel = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
  const paymentMethod = getRandomPaymentMethod();
  const status = getRandomStatus();
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  const quantity = 10 + Math.random() * 70; // 10-80 литров
  const price = fuel.minPrice + Math.random() * (fuel.maxPrice - fuel.minPrice);
  const totalCost = quantity * price;
  
  const startTime = generateRandomDate();
  const duration = 2 + Math.random() * 6; // 2-8 минут
  const endTime = status === 'completed' || status === 'failed' ? 
    new Date(startTime.getTime() + duration * 60000) : null;
  
  const pumpNumber = String(Math.floor(Math.random() * station.pumps) + 1).padStart(3, '0');
  const deviceId = `PUMP-${pumpNumber}`;
  const transactionId = `TXN-${startTime.getTime()}-${index}`;
  const customerId = `CUST-${Math.floor(Math.random() * 99999)}`;
  
  return {
    id: `TXN-2025-08-${String(startTime.getDate()).padStart(2, '0')}-${station.id.slice(-2)}-${String(index).padStart(3, '0')}`,
    operation_type: 'sale',
    status: status,
    start_time: startTime.toISOString(),
    end_time: endTime ? endTime.toISOString() : null,
    duration: status === 'completed' || status === 'failed' ? Math.round(duration) : null,
    trading_point_id: station.id,
    trading_point_name: station.name,
    device_id: deviceId,
    transaction_id: transactionId,
    fuel_type: fuel.type,
    quantity: Math.round(quantity * 100) / 100,
    price: Math.round(price * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    payment_method: paymentMethod,
    details: `Продажа топлива ${fuel.type}`,
    progress: status === 'completed' ? 100 : 
             status === 'failed' ? 0 :
             status === 'in_progress' ? Math.floor(Math.random() * 80) + 10 :
             0,
    operator_name: operator,
    customer_id: customerId,
    vehicle_number: generateVehicleNumber(),
    metadata: {},
    created_at: startTime.toISOString(),
    updated_at: (endTime || startTime).toISOString()
  };
}

/**
 * Главная функция генерации
 */
async function generateDemoOperations() {
  console.log('🚀 Генерируем 250 демо-операций за август 2025...');
  
  try {
    // 1. Очищаем существующие операции
    console.log('🧹 Очищаем существующие операции...');
    const { error: deleteError } = await supabase
      .from('operations')
      .delete()
      .neq('id', 'impossible-id'); // удаляем все записи

    if (deleteError) {
      console.error('❌ Ошибка очистки:', deleteError);
      return;
    }
    
    console.log('✅ Старые операции удалены');

    // 2. Генерируем новые операции
    console.log('🔄 Генерируем новые операции...');
    const operations = [];
    
    for (let i = 1; i <= 250; i++) {
      operations.push(generateOperation(i));
      if (i % 50 === 0) {
        console.log(`   Сгенерировано ${i}/250 операций...`);
      }
    }

    // Сортируем по времени
    operations.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    console.log('📊 Статистика операций:');
    const statusCount = {};
    const fuelCount = {};
    const paymentCount = {};
    
    operations.forEach(op => {
      statusCount[op.status] = (statusCount[op.status] || 0) + 1;
      fuelCount[op.fuel_type] = (fuelCount[op.fuel_type] || 0) + 1;
      paymentCount[op.payment_method] = (paymentCount[op.payment_method] || 0) + 1;
    });
    
    console.log('   Статусы:', statusCount);
    console.log('   Топливо:', fuelCount);
    console.log('   Оплата:', paymentCount);

    // 3. Загружаем в базу данными порциями
    console.log('💾 Загружаем операции в базу данных...');
    const batchSize = 50;
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('operations')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Ошибка загрузки батча ${i}-${i + batch.length}:`, insertError);
        return;
      }
      
      console.log(`   Загружено ${Math.min(i + batchSize, operations.length)}/250 операций...`);
    }

    // 4. Проверяем результат
    const { count, error: countError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Ошибка подсчета:', countError);
      return;
    }

    console.log(`✅ Успешно создано ${count} операций в базе данных`);
    console.log('📅 Период: август 2025');
    console.log('🏪 Станции: 5 АЗС');
    console.log('⛽ Виды топлива: АИ-92, АИ-95, АИ-98, АИ-100, ДТ');
    console.log('💳 Способы оплаты: наличные, банковские карты, топливные карты (только разрешенные в БД)');
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем генерацию
generateDemoOperations().then(() => {
  console.log('🎉 Генерация демо-данных завершена!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});