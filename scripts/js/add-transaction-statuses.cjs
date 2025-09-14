/**
 * Скрипт для добавления транзакций с различными статусами для всех АЗС
 * 2% ошибочных (failed), 2% ожидание (pending), 3% выполняется (in_progress), 2% отменено (cancelled)
 */

const fs = require('fs');
const path = require('path');

// Читаем операции из файла
const operationsFilePath = path.join(__dirname, 'src/services/operationsService.ts');
let operationsContent = fs.readFileSync(operationsFilePath, 'utf8');

// Статусы и их проценты
const statusDistribution = [
  { status: 'failed', percent: 2, details: 'Ошибка при выполнении операции' },
  { status: 'pending', percent: 2, details: 'Операция в очереди на выполнение' },
  { status: 'in_progress', percent: 3, details: 'Операция выполняется' },
  { status: 'cancelled', percent: 2, details: 'Операция отменена пользователем' }
];

// Список АЗС
const stations = [
  { id: 'station_01', name: 'АЗС №1 Центральная' },
  { id: 'station_02', name: 'АЗС №2 Северная' },
  { id: 'station_03', name: 'АЗС №3 Южная' },
  { id: 'station_04', name: 'АЗС №4 Московское шоссе' },
  { id: 'station_05', name: 'АЗС №5 Промзона' }
];

// Типы топлива и цены
const fuelTypes = [
  { type: 'АИ-92', price: 58.2 },
  { type: 'АИ-95', price: 62.8 },
  { type: 'АИ-98', price: 71.5 },
  { type: 'АИ-100', price: 68.5 },
  { type: 'ДТ', price: 64.3 }
];

// Способы оплаты
const paymentMethods = ['bank_card', 'cash', 'corporate_card', 'fuel_card'];

// Операторы
const operators = [
  'Иванов И.И.',
  'Петров П.П.',
  'Сидоров С.С.',
  'Козлов К.К.',
  'Попов Б.Б.'
];

// Функция для генерации случайного числа в диапазоне
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Функция для генерации случайного элемента из массива
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Функция для генерации номера автомобиля
function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const numbers = '0123456789';
  const regions = ['77', '97', '99', '177', '197', '199', '777'];
  
  return `${randomChoice(letters)}${randomChoice(numbers)}${randomChoice(numbers)}${randomChoice(numbers)}${randomChoice(letters)}${randomChoice(letters)}${randomChoice(regions)}`;
}

// Функция для генерации ID
function generateId(prefix, counter) {
  return `${prefix}-STATUS-${String(counter).padStart(4, '0')}`;
}

// Функция для создания операции
function createOperation(status, statusDetails, stationId, stationName, counter) {
  const fuel = randomChoice(fuelTypes);
  const quantity = Math.round(randomBetween(15, 80) * 10) / 10;
  const totalCost = Math.round(quantity * fuel.price * 100) / 100;
  
  // Время создания (последние 7 дней)
  const now = new Date();
  const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  
  let endTime = null;
  let duration = null;
  let progress = 0;
  
  // Настройки в зависимости от статуса
  switch (status) {
    case 'completed':
      endTime = new Date(createdAt.getTime() + randomBetween(1, 5) * 60 * 1000);
      duration = Math.round((endTime - createdAt) / (60 * 1000));
      progress = 100;
      break;
    case 'in_progress':
      progress = Math.round(randomBetween(10, 85));
      break;
    case 'pending':
      progress = 0;
      break;
    case 'failed':
      progress = Math.round(randomBetween(5, 60));
      endTime = new Date(createdAt.getTime() + randomBetween(0.5, 3) * 60 * 1000);
      duration = Math.round((endTime - createdAt) / (60 * 1000));
      break;
    case 'cancelled':
      progress = Math.round(randomBetween(0, 30));
      endTime = new Date(createdAt.getTime() + randomBetween(0.2, 2) * 60 * 1000);
      duration = Math.round((endTime - createdAt) / (60 * 1000));
      break;
  }
  
  const operation = {
    id: generateId('TXN', counter),
    operationType: 'sale',
    status: status,
    startTime: createdAt.toISOString(),
    tradingPointId: stationId,
    tradingPointName: stationName,
    deviceId: `PUMP-${String(Math.floor(randomBetween(1, 15))).padStart(3, '0')}`,
    transactionId: generateId('TXN', counter),
    fuelType: fuel.type,
    quantity: quantity,
    price: fuel.price,
    totalCost: totalCost,
    paymentMethod: randomChoice(paymentMethods),
    details: statusDetails,
    lastUpdated: (endTime || createdAt).toISOString(),
    operatorName: randomChoice(operators),
    customerId: `CUST-${Math.floor(randomBetween(10000, 99999))}`,
    vehicleNumber: generateVehicleNumber(),
    metadata: status === 'failed' ? { errorCode: `ERR_${Math.floor(randomBetween(1001, 9999))}` } : {},
    createdAt: `new Date('${createdAt.toISOString()}')`,
    updatedAt: `new Date('${(endTime || createdAt).toISOString()}')`
  };
  
  if (endTime) {
    operation.endTime = endTime.toISOString();
  }
  if (duration !== null) {
    operation.duration = duration;
  }
  if (progress !== undefined) {
    operation.progress = progress;
  }
  
  return operation;
}

// Генерируем операции
let newOperations = [];
let operationCounter = 8000; // Начинаем с 8000 чтобы не пересекаться с существующими

console.log('🚀 Генерируем транзакции с различными статусами...');

stations.forEach(station => {
  console.log(`📍 Генерируем для ${station.name}`);
  
  statusDistribution.forEach(({ status, percent, details }) => {
    // Генерируем количество операций на основе процента
    // Допустим, базовое количество операций за неделю = 100 на АЗС
    const baseOperationsPerWeek = 100;
    const operationsCount = Math.round(baseOperationsPerWeek * percent / 100);
    
    console.log(`  ✨ Добавляем ${operationsCount} операций со статусом "${status}" (${percent}%)`);
    
    for (let i = 0; i < operationsCount; i++) {
      const operation = createOperation(status, details, station.id, station.name, operationCounter++);
      newOperations.push(operation);
    }
  });
});

console.log(`📊 Всего создано операций: ${newOperations.length}`);

// Формируем строку с новыми операциями
const operationsCode = newOperations.map(op => {
  return `  {
    id: "${op.id}",
    operationType: "${op.operationType}",
    status: "${op.status}",
    startTime: "${op.startTime}",${op.endTime ? `
    endTime: "${op.endTime}",` : ''}${op.duration !== null ? `
    duration: ${op.duration},` : ''}
    tradingPointId: "${op.tradingPointId}",
    tradingPointName: "${op.tradingPointName}",
    deviceId: "${op.deviceId}",
    transactionId: "${op.transactionId}",
    fuelType: "${op.fuelType}",
    quantity: ${op.quantity},
    price: ${op.price},
    totalCost: ${op.totalCost},
    paymentMethod: "${op.paymentMethod}",
    details: "${op.details}",${op.progress !== undefined ? `
    progress: ${op.progress},` : ''}
    lastUpdated: "${op.lastUpdated}",
    operatorName: "${op.operatorName}",
    customerId: "${op.customerId}",
    vehicleNumber: "${op.vehicleNumber}",
    metadata: ${JSON.stringify(op.metadata)},
    createdAt: ${op.createdAt},
    updatedAt: ${op.updatedAt}
  }`;
}).join(',\n');

// Находим место для вставки (перед закрывающей скобкой массива)
const insertPosition = operationsContent.lastIndexOf(']; // Конец операций');
if (insertPosition === -1) {
  const altInsertPosition = operationsContent.lastIndexOf('];');
  if (altInsertPosition === -1) {
    console.error('❌ Не найдено место для вставки операций');
    process.exit(1);
  }
  
  // Вставляем новые операции
  const beforeArray = operationsContent.substring(0, altInsertPosition);
  const afterArray = operationsContent.substring(altInsertPosition);
  
  const newContent = beforeArray + ',\n' + operationsCode + '\n' + afterArray;
  
  // Записываем обновленный файл
  fs.writeFileSync(operationsFilePath, newContent, 'utf8');
} else {
  // Вставляем новые операции
  const beforeArray = operationsContent.substring(0, insertPosition);
  const afterArray = operationsContent.substring(insertPosition);
  
  const newContent = beforeArray + ',\n' + operationsCode + '\n' + afterArray;
  
  // Записываем обновленный файл
  fs.writeFileSync(operationsFilePath, newContent, 'utf8');
}

console.log('✅ Операции успешно добавлены в operationsService.ts');
console.log('\n📈 Статистика по статусам:');
statusDistribution.forEach(({ status, percent }) => {
  const count = newOperations.filter(op => op.status === status).length;
  console.log(`  ${status}: ${count} операций (${percent}%)`);
});

console.log('\n🏪 Распределение по АЗС:');
stations.forEach(station => {
  const count = newOperations.filter(op => op.tradingPointId === station.id).length;
  console.log(`  ${station.name}: ${count} операций`);
});