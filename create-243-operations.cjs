const fs = require('fs');

// Виды топлива согласно номенклатуре
const fuelTypes = [
  { type: 'АИ-92', price: 58.2, weight: 30 },
  { type: 'АИ-95', price: 63.8, weight: 35 },
  { type: 'АИ-98', price: 67.5, weight: 10 },
  { type: 'ДТ', price: 59.5, weight: 20 },
  { type: 'АИ-100', price: 68.5, weight: 5 }
];

// Виды оплаты (только разрешенные)
const paymentMethods = [
  { method: 'cash', weight: 25 },
  { method: 'bank_card', weight: 50 },
  { method: 'fuel_card', weight: 20 },
  { method: 'online_order', weight: 5 }
];

// АЗС в сети
const stations = [
  { id: 'station_01', name: 'АЗС №1 Центральная', pumps: 8 },
  { id: 'station_02', name: 'АЗС №2 Северная', pumps: 6 },
  { id: 'station_03', name: 'АЗС №3 Южная', pumps: 10 },
  { id: 'station_04', name: 'АЗС №4 Восточная', pumps: 6 },
  { id: 'station_05', name: 'АЗС №5 Промзона', pumps: 12 },
  { id: 'station_06', name: 'АЗС №6 Трасса М4', pumps: 10 }
];

// Операторы
const operators = [
  'Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Козлов К.К.',
  'Смирнов С.М.', 'Федоров Ф.Ф.', 'Николаев Н.Н.', 'Попов Б.Б.',
  'Морозов М.М.', 'Волков В.В.', 'Соколов С.С.', 'Лебедев Л.Л.'
];

// Генерация случайного выбора с учетом весов
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  return items[0];
}

// Генерация номера автомобиля
function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const regions = ['77', '99', '197', '177', '199', '777', '797', '123', '178'];
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 900) + 100;
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const letter3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${letter1}${numbers}${letter2}${letter3}${region}`;
}

// Генерация операции
function generateOperation(index) {
  const fuel = weightedRandom(fuelTypes);
  const payment = weightedRandom(paymentMethods);
  const station = stations[index % stations.length];
  
  // Случайный объем от 15 до 80 литров
  const quantity = Math.round((15 + Math.random() * 65) * 100) / 100;
  const totalCost = Math.round(quantity * fuel.price * 100) / 100;
  
  // Дата в августе 2025
  const day = Math.floor(Math.random() * 31) + 1;
  const hour = 6 + Math.floor(Math.random() * 17);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  const startTime = new Date(2025, 7, day, hour, minute, second); // 7 = август
  
  // Длительность 2-5 минут
  const duration = 2 + Math.floor(Math.random() * 3);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  const pumpId = Math.floor(Math.random() * station.pumps) + 1;
  const operatorIndex = Math.floor(Math.random() * operators.length);
  
  return {
    id: `TXN-2025-08-${String(day).padStart(2, '0')}-${station.id.split('_')[1]}-${String(index).padStart(3, '0')}`,
    operationType: 'sale',
    status: 'completed', // Установим позже
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    tradingPointId: station.id,
    tradingPointName: station.name,
    deviceId: `PUMP-${String(pumpId).padStart(3, '0')}`,
    transactionId: `TXN-${startTime.getTime()}-${index}`,
    fuelType: fuel.type,
    quantity: quantity,
    price: fuel.price,
    totalCost: totalCost,
    paymentMethod: payment.method,
    details: `Продажа топлива ${fuel.type}`,
    progress: 100,
    lastUpdated: endTime.toISOString(),
    operatorName: operators[operatorIndex],
    customerId: `CUST-${Math.floor(Math.random() * 100000)}`,
    vehicleNumber: generateVehicleNumber(),
    metadata: {},
    createdAt: startTime.toISOString(),
    updatedAt: endTime.toISOString()
  };
}

// Создаем 243 операции
console.log('🏭 Создаем 243 операции для августа 2025...');
const operations = [];

for (let i = 0; i < 243; i++) {
  operations.push(generateOperation(i));
}

// Применяем распределение статусов
console.log('🔄 Применяем распределение статусов...');

// Ошибка - 2% (≈5 операций)
const errorCount = Math.max(1, Math.floor(operations.length * 0.02));
console.log(`🔴 Ошибка: ${errorCount} операций (${((errorCount/operations.length)*100).toFixed(1)}%)`);
for (let i = 0; i < errorCount; i++) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  operations[randomIndex].status = 'failed';
  operations[randomIndex].details += ' - Ошибка оплаты';
}

// Ожидание - 2% (≈5 операций)
const pendingCount = Math.max(1, Math.floor(operations.length * 0.02));
console.log(`🟡 Ожидание: ${pendingCount} операций (${((pendingCount/operations.length)*100).toFixed(1)}%)`);
let pendingAdded = 0;
while (pendingAdded < pendingCount) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (operations[randomIndex].status === 'completed') {
    operations[randomIndex].status = 'pending';
    operations[randomIndex].details += ' - Ожидает подтверждения';
    operations[randomIndex].progress = 10 + Math.floor(Math.random() * 20);
    pendingAdded++;
  }
}

// Выполняется - 3% (≈7 операций)
const inProgressCount = Math.max(1, Math.floor(operations.length * 0.03));
console.log(`🔵 Выполняется: ${inProgressCount} операций (${((inProgressCount/operations.length)*100).toFixed(1)}%)`);
let inProgressAdded = 0;
while (inProgressAdded < inProgressCount) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (operations[randomIndex].status === 'completed') {
    operations[randomIndex].status = 'in_progress';
    operations[randomIndex].progress = 50 + Math.floor(Math.random() * 40);
    inProgressAdded++;
  }
}

// Статистика
const stats = { byStatus: {}, byFuelType: {}, byPaymentMethod: {} };
operations.forEach(op => {
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
  stats.byFuelType[op.fuelType] = (stats.byFuelType[op.fuelType] || 0) + 1;
  stats.byPaymentMethod[op.paymentMethod] = (stats.byPaymentMethod[op.paymentMethod] || 0) + 1;
});

console.log('📊 Итоговая статистика:');
console.log('По статусам:', stats.byStatus);
console.log('По топливу:', stats.byFuelType);
console.log('По оплате:', stats.byPaymentMethod);

// Сортируем по времени (новые первыми)
operations.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

// Обновляем operationsService.ts
console.log('💾 Обновляем operationsService.ts...');

let serviceContent = fs.readFileSync('./src/services/operationsService.ts', 'utf8');

// Находим где вставить операции
const startPattern = 'const initialOperations: Operation[] = [';
const startIndex = serviceContent.indexOf(startPattern);

if (startIndex === -1) {
  console.error('❌ Не найден массив initialOperations');
  process.exit(1);
}

// Ищем конец массива
const searchStart = startIndex + startPattern.length;
let bracketCount = 1;
let endIndex = searchStart;

while (bracketCount > 0 && endIndex < serviceContent.length) {
  if (serviceContent[endIndex] === '[') bracketCount++;
  if (serviceContent[endIndex] === ']') bracketCount--;
  endIndex++;
}

const beforeArray = serviceContent.substring(0, startIndex + startPattern.length);
const afterArray = serviceContent.substring(endIndex);
const operationsString = JSON.stringify(operations, null, 2);

const newContent = beforeArray + '\n' + operationsString + '\n' + afterArray.substring(1);

fs.writeFileSync('./src/services/operationsService.ts', newContent);

console.log('✅ Создано и обновлено операций:', operations.length);
console.log('🔄 Для применения изменений нажмите "Загрузить данные" в интерфейсе');