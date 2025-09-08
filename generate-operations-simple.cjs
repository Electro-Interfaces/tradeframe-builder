/**
 * 🎯 Простой генератор операций для загрузки в Supabase
 * Генерирует SQL INSERT для 250 операций за август 2025
 */

// Конфигурация торговых точек и их резервуаров  
const TRADING_POINTS = [
  {
    id: '9baf5375-9929-4774-8366-c0609b9f2a51',
    name: 'АЗС №001 - Центральная',
    external_id: 'station_01',
    fuels: [
      { type: 'АИ-95', price: 55.50 },
      { type: 'АИ-92', price: 52.30 }
    ]
  },
  {
    id: '9be94f90-84d1-4557-b746-460e13485b65', 
    name: 'АЗС №002 - Северная',
    external_id: 'station_02',
    fuels: [
      { type: 'АИ-92', price: 52.50 },
      { type: 'АИ-95', price: 55.70 },
      { type: 'Дизель', price: 58.80 }
    ]
  },
  {
    id: 'f2566905-c748-4240-ac31-47b626ab625d',
    name: 'АЗС №003 - Южная', 
    external_id: 'station_03',
    fuels: [
      { type: 'АИ-92', price: 52.40 },
      { type: 'АИ-95', price: 55.60 },
      { type: 'АИ-98', price: 67.20 },
      { type: 'Дизель', price: 58.90 }
    ]
  },
  {
    id: 'f7963207-2732-4fae-988e-c73eef7645ca',
    name: 'АЗС №005 - Промзона',
    external_id: 'station_05', 
    fuels: [
      { type: 'АИ-95', price: 55.80 },
      { type: 'АИ-98', price: 67.40 },
      { type: 'АИ-92', price: 52.60 },
      { type: 'Дизель', price: 59.10 }
    ]
  },
  {
    id: '35f56ffd-826c-43b3-8f15-0f0e870f20cd',
    name: 'АЗС №006 - Окружная',
    external_id: 'station_06',
    fuels: [
      { type: 'АИ-95', price: 55.90 },
      { type: 'АИ-92', price: 52.70 },
      { type: 'АИ-98', price: 67.50 },
      { type: 'Дизель', price: 59.20 },
      { type: 'Дизель зимний', price: 61.10 }
    ]
  }
];

const PAYMENT_METHODS = [
  { type: 'bank_card', weight: 60 },
  { type: 'cash', weight: 25 }, 
  { type: 'fuel_card', weight: 10 },
  { type: 'online_orders', weight: 5 }
];

const OPERATION_STATUSES = [
  { status: 'completed', weight: 90 },
  { status: 'error', weight: 2.5 },
  { status: 'pending', weight: 2.5 },
  { status: 'processing', weight: 2.5 }, 
  { status: 'rejected', weight: 1.5 }
];

const OPERATORS = [
  'Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Козлов К.К.',
  'Морозов М.М.', 'Волков В.В.', 'Соколов С.С.', 'Лебедев Л.Л.',
  'Семенов С.С.', 'Егоров Е.Е.', 'Павлов П.П.', 'Кузнецов К.К.',
  'Михайлов М.М.', 'Новиков Н.Н.', 'Федоров Ф.Ф.', 'Попов Б.Б.'
];

function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const regions = ['77', '199', '178', '99', '197', '777', '123', '750'];
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = String(Math.floor(Math.random() * 900) + 100);
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const letter3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${letter1}${numbers}${letter2}${letter3}${region}`;
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const randomWeight = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (const item of items) {
    currentWeight += item.weight;
    if (randomWeight <= currentWeight) {
      return item;
    }
  }
  return items[items.length - 1];
}

function generateTimestamp(date) {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  
  let activityMultiplier = 1.0;
  if (dayOfWeek === 5) activityMultiplier = 1.4; // Пятница
  if (dayOfWeek === 6 || dayOfWeek === 0) activityMultiplier = 0.7; // Выходные
  if (dayOfMonth >= 25) activityMultiplier *= 1.2; // Конец месяца
  
  let hour;
  if (Math.random() < 0.05) {
    hour = Math.floor(Math.random() * 5); // 0-4 (ночь)
  } else if (Math.random() < 0.15) {
    hour = Math.random() < 0.5 ? 
      Math.floor(Math.random() * 3) + 5 : // 5-7 (утро)
      Math.floor(Math.random() * 3) + 21; // 21-23 (вечер)
  } else {
    hour = Math.floor(Math.random() * 12) + 8; // 8-19 (день)
  }
  
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  return new Date(2025, 7, date.getDate(), hour, minute, second);
}

function generateOperations(targetCount = 250) {
  const operations = [];
  
  for (let i = 0; i < targetCount; i++) {
    // Случайный день августа 2025
    const day = Math.floor(Math.random() * 31) + 1;
    const date = new Date(2025, 7, day);
    const operationTime = generateTimestamp(date);
    
    // Выбираем торговую точку и топливо
    const tradingPoint = TRADING_POINTS[Math.floor(Math.random() * TRADING_POINTS.length)];
    const fuel = tradingPoint.fuels[Math.floor(Math.random() * tradingPoint.fuels.length)];
    
    // Генерируем параметры операции
    const quantity = +(Math.random() * 70 + 10).toFixed(2);
    const priceVariation = 1 + (Math.random() - 0.5) * 0.06;
    const price = +(fuel.price * priceVariation).toFixed(1);
    const totalCost = +(quantity * price).toFixed(2);
    
    const paymentMethod = weightedRandom(PAYMENT_METHODS);
    const status = weightedRandom(OPERATION_STATUSES);
    
    const duration = Math.floor(Math.random() * 4) + 2;
    const endTime = new Date(operationTime.getTime() + duration * 60 * 1000);
    
    const operationId = `TXN-2025-08-${String(day).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`;
    
    const operation = {
      id: operationId,
      operation_type: 'sale',
      status: status.status,
      start_time: operationTime.toISOString(),
      end_time: status.status === 'completed' ? endTime.toISOString() : null,
      duration: status.status === 'completed' ? duration : null,
      trading_point_id: tradingPoint.external_id,
      trading_point_name: tradingPoint.name,
      device_id: `PUMP-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
      transaction_id: `TXN-${Date.now()}-${i}`,
      fuel_type: fuel.type,
      quantity: quantity,
      price: price,
      total_cost: totalCost,
      payment_method: paymentMethod.type,
      details: `Продажа топлива ${fuel.type}`,
      progress: status.status === 'completed' ? 100 : 
               status.status === 'processing' ? Math.floor(Math.random() * 80) + 20 :
               status.status === 'pending' ? 0 : 
               Math.floor(Math.random() * 50),
      operator_name: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
      customer_id: `CUST-${Math.floor(Math.random() * 99999)}`,
      vehicle_number: generateVehicleNumber(),
      metadata: '{}',
      created_at: operationTime.toISOString(),
      updated_at: (status.status === 'completed' ? endTime : operationTime).toISOString()
    };
    
    operations.push(operation);
  }
  
  // Сортируем по времени
  operations.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  
  return operations;
}

function generateReport(operations) {
  const report = {
    total: operations.length,
    byStatus: {},
    byPayment: {},
    byFuelType: {},
    byTradingPoint: {},
    totalRevenue: 0
  };
  
  operations.forEach(op => {
    report.byStatus[op.status] = (report.byStatus[op.status] || 0) + 1;
    report.byPayment[op.payment_method] = (report.byPayment[op.payment_method] || 0) + 1;
    report.byFuelType[op.fuel_type] = (report.byFuelType[op.fuel_type] || 0) + 1;
    report.byTradingPoint[op.trading_point_name] = (report.byTradingPoint[op.trading_point_name] || 0) + 1;
    
    if (op.status === 'completed') {
      report.totalRevenue += op.total_cost;
    }
  });
  
  report.totalRevenue = +report.totalRevenue.toFixed(2);
  
  return report;
}

function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.toString().replace(/'/g, "''")}'`;
}

function generateSQL(operations) {
  let sql = `-- 🎯 Демо-операции для Демо сети АЗС (Август 2025)
-- Всего операций: ${operations.length}

-- Очищаем существующие операции августа 2025
DELETE FROM operations 
WHERE start_time >= '2025-08-01T00:00:00Z' 
  AND start_time < '2025-09-01T00:00:00Z';

-- Вставляем новые операции
INSERT INTO operations (
  id, operation_type, status, start_time, end_time, duration,
  trading_point_id, trading_point_name, device_id, transaction_id,
  fuel_type, quantity, price, total_cost, payment_method,
  details, progress, operator_name, customer_id, vehicle_number,
  metadata, created_at, updated_at
) VALUES\n`;

  const values = operations.map(op => {
    return `  (${escapeString(op.id)}, ${escapeString(op.operation_type)}, ${escapeString(op.status)}, ` +
           `${escapeString(op.start_time)}, ${op.end_time ? escapeString(op.end_time) : 'NULL'}, ` +
           `${op.duration || 'NULL'}, ${escapeString(op.trading_point_id)}, ` +
           `${escapeString(op.trading_point_name)}, ${escapeString(op.device_id)}, ` +
           `${escapeString(op.transaction_id)}, ${escapeString(op.fuel_type)}, ` +
           `${op.quantity}, ${op.price}, ${op.total_cost}, ${escapeString(op.payment_method)}, ` +
           `${escapeString(op.details)}, ${op.progress}, ${escapeString(op.operator_name)}, ` +
           `${escapeString(op.customer_id)}, ${escapeString(op.vehicle_number)}, ` +
           `${escapeString(op.metadata)}, ${escapeString(op.created_at)}, ${escapeString(op.updated_at)})`;
  });

  sql += values.join(',\n');
  sql += ';\n\n-- ✅ Операции успешно созданы!';
  
  return sql;
}

function main() {
  console.log('🎯 Генерация демо-операций для Демо сети АЗС');
  console.log('📅 Период: Август 2025');
  console.log('🎲 Целевое количество: 250 операций\n');
  
  // Генерируем операции
  console.log('⚡ Генерируем операции...');
  const operations = generateOperations(250);
  
  // Создаем отчет
  const report = generateReport(operations);
  console.log('\n📊 СТАТИСТИКА ГЕНЕРАЦИИ:');
  console.log(`📈 Всего операций: ${report.total}`);
  console.log(`💰 Общая выручка: ${report.totalRevenue.toLocaleString('ru-RU')} ₽`);
  
  console.log('\n📋 По статусам:');
  Object.entries(report.byStatus).forEach(([status, count]) => {
    const percent = ((count / report.total) * 100).toFixed(1);
    console.log(`  ${status}: ${count} (${percent}%)`);
  });
  
  console.log('\n💳 По способам оплаты:');
  Object.entries(report.byPayment).forEach(([method, count]) => {
    const percent = ((count / report.total) * 100).toFixed(1);
    console.log(`  ${method}: ${count} (${percent}%)`);
  });
  
  console.log('\n⛽ По типам топлива:');
  Object.entries(report.byFuelType).forEach(([fuel, count]) => {
    const percent = ((count / report.total) * 100).toFixed(1);
    console.log(`  ${fuel}: ${count} (${percent}%)`);
  });
  
  console.log('\n🏪 По торговым точкам:');
  Object.entries(report.byTradingPoint).forEach(([station, count]) => {
    const percent = ((count / report.total) * 100).toFixed(1);
    console.log(`  ${station}: ${count} (${percent}%)`);
  });
  
  // Генерируем SQL
  console.log('\n📝 Создаем SQL скрипт...');
  const sql = generateSQL(operations);
  
  // Записываем в файл
  const fs = require('fs');
  const filename = 'demo-operations-august-2025.sql';
  fs.writeFileSync(filename, sql, 'utf8');
  
  console.log(`✅ SQL скрипт создан: ${filename}`);
  console.log('\n📤 Следующие шаги:');
  console.log('1. Откройте Supabase SQL Editor');
  console.log(`2. Скопируйте содержимое файла ${filename}`);
  console.log('3. Выполните SQL запрос');
  console.log('\n🎉 ГОТОВО!');
}

main();