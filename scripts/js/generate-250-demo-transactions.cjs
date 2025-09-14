const fs = require('fs');

// Генератор 250 демо транзакций для сети АЗС за август 2025
console.log('🏭 Создаем 250 демо транзакций для сети АЗС...');

// Виды топлива согласно номенклатуре с реалистичными ценами
const fuelTypes = [
  { type: 'АИ-92', price: 58.20, weight: 25, tankCapacity: 50000 },  // 25% продаж
  { type: 'АИ-95', price: 63.80, weight: 40, tankCapacity: 60000 },  // 40% продаж
  { type: 'АИ-98', price: 67.50, weight: 10, tankCapacity: 30000 },  // 10% продаж
  { type: 'ДТ', price: 59.50, weight: 20, tankCapacity: 50000 },     // 20% продаж
  { type: 'АИ-100', price: 68.50, weight: 5, tankCapacity: 25000 }   // 5% продаж
];

// Виды оплаты с весами
const paymentMethods = [
  { method: 'cash', name: 'Наличные', weight: 20 },
  { method: 'bank_card', name: 'Банковские карты', weight: 45 },
  { method: 'fuel_card', name: 'Топливные карты', weight: 30 },
  { method: 'online_order', name: 'Онлайн заказы', weight: 5 }
];

// Демо сеть АЗС
const stations = [
  { id: 'station_01', toNumber: '001', name: 'АЗС №1 Центральная', pumps: 8, posTerminals: 4 },
  { id: 'station_02', toNumber: '002', name: 'АЗС №2 Северная', pumps: 6, posTerminals: 3 },
  { id: 'station_03', toNumber: '003', name: 'АЗС №3 Южная', pumps: 10, posTerminals: 5 },
  { id: 'station_04', toNumber: '004', name: 'АЗС №4 Восточная', pumps: 6, posTerminals: 3 },
  { id: 'station_05', toNumber: '005', name: 'АЗС №5 Промзона', pumps: 12, posTerminals: 6 },
  { id: 'station_06', toNumber: '006', name: 'АЗС №6 Трасса М4', pumps: 10, posTerminals: 5 }
];

// Операторы смен
const operators = [
  'Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Козлов К.К.',
  'Смирнов С.М.', 'Федоров Ф.Ф.', 'Николаев Н.Н.', 'Попов Б.Б.',
  'Морозов М.М.', 'Волков В.В.', 'Соколов С.С.', 'Лебедев Л.Л.'
];

// Статусы операций
const statuses = [
  { status: 'completed', weight: 93 },
  { status: 'failed', weight: 2 },
  { status: 'in_progress', weight: 3 },
  { status: 'pending', weight: 2 }
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

// Генерация номера карты
function generateCardNumber(paymentMethod) {
  if (paymentMethod === 'cash') return null;
  
  const patterns = {
    'bank_card': ['4***', '5***', '6***'],
    'fuel_card': ['7***', '8***'],
    'online_order': ['9***']
  };
  
  const pattern = patterns[paymentMethod] || ['****'];
  const prefix = pattern[Math.floor(Math.random() * pattern.length)];
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix} ${suffix}`;
}

// Генерация одной транзакции
function generateTransaction(index) {
  const fuel = weightedRandom(fuelTypes);
  const payment = weightedRandom(paymentMethods);
  const station = stations[index % stations.length];
  const status = weightedRandom(statuses);
  
  // Случайная дата в августе 2025
  const day = Math.floor(Math.random() * 31) + 1;
  const hour = 6 + Math.floor(Math.random() * 18); // 6:00 - 23:59
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  const startTime = new Date(2025, 7, day, hour, minute, second); // 7 = август
  
  // Заказанное количество (15-80 литров)
  const orderedQuantity = Math.round((15 + Math.random() * 65) * 100) / 100;
  const orderedAmount = Math.round(orderedQuantity * fuel.price * 100) / 100;
  
  // Фактический отпуск (может отличаться от заказа)
  let actualQuantity, actualAmount;
  if (status.status === 'completed') {
    // Небольшое отклонение от заказа (±2%)
    const deviation = 0.98 + Math.random() * 0.04;
    actualQuantity = Math.round(orderedQuantity * deviation * 100) / 100;
    actualAmount = Math.round(actualQuantity * fuel.price * 100) / 100;
  } else if (status.status === 'in_progress') {
    // Частичный отпуск
    const progress = 0.3 + Math.random() * 0.4; // 30-70%
    actualQuantity = Math.round(orderedQuantity * progress * 100) / 100;
    actualAmount = Math.round(actualQuantity * fuel.price * 100) / 100;
  } else {
    // Для failed/pending - отпуск может быть нулевым или частичным
    actualQuantity = status.status === 'failed' ? 0 : Math.round(orderedQuantity * 0.1 * 100) / 100;
    actualAmount = actualQuantity * fuel.price;
  }
  
  // Длительность операции
  let duration, endTime;
  if (status.status === 'completed') {
    duration = 2 + Math.floor(Math.random() * 4); // 2-5 минут
    endTime = new Date(startTime.getTime() + duration * 60000);
  } else if (status.status === 'in_progress') {
    duration = Math.floor(Math.random() * 3); // 0-2 минуты (незавершено)
    endTime = duration > 0 ? new Date(startTime.getTime() + duration * 60000) : null;
  } else {
    duration = status.status === 'failed' ? 1 : 0;
    endTime = duration > 0 ? new Date(startTime.getTime() + duration * 60000) : null;
  }
  
  const pumpId = Math.floor(Math.random() * station.pumps) + 1;
  const posId = Math.floor(Math.random() * station.posTerminals) + 1;
  const shiftNumber = hour < 8 ? "1" : hour < 16 ? "2" : "3"; // 3 смены по 8 часов
  const operatorIndex = Math.floor(Math.random() * operators.length);
  
  return {
    id: `TXN-2025-08-${String(day).padStart(2, '0')}-${station.toNumber}-${String(index + 1).padStart(3, '0')}`,
    operationType: "sale",
    status: status.status,
    startTime: startTime.toISOString(),
    endTime: endTime ? endTime.toISOString() : undefined,
    duration: duration,
    tradingPointId: station.id,
    tradingPointName: station.name,
    deviceId: `PUMP-${String(pumpId).padStart(3, '0')}`,
    transactionId: `TXN-${startTime.getTime()}-${index}`,
    fuelType: fuel.type,
    quantity: actualQuantity, // legacy field
    price: fuel.price,
    totalCost: actualAmount, // legacy field
    paymentMethod: payment.method,
    details: `Продажа топлива ${fuel.type}${status.status !== 'completed' ? ` - ${getStatusText(status.status)}` : ''}`,
    progress: status.status === 'completed' ? 100 : 
              status.status === 'in_progress' ? Math.floor(50 + Math.random() * 40) :
              status.status === 'pending' ? Math.floor(10 + Math.random() * 20) : 0,
    lastUpdated: endTime ? endTime.toISOString() : startTime.toISOString(),
    operatorName: operators[operatorIndex],
    customerId: `CUST-${Math.floor(Math.random() * 100000)}`,
    vehicleNumber: generateVehicleNumber(),
    metadata: {
      tankLevel: Math.floor(Math.random() * 80) + 20, // 20-100%
      pumpPressure: Math.floor(Math.random() * 10) + 90 // 90-100 PSI
    },
    createdAt: startTime.toISOString(),
    updatedAt: endTime ? endTime.toISOString() : startTime.toISOString(),
    
    // Новые поля для расширенной таблицы
    shiftNumber: shiftNumber,
    toNumber: station.toNumber,
    posNumber: `POS-${String(posId).padStart(3, '0')}`,
    cardNumber: generateCardNumber(payment.method),
    orderedQuantity: orderedQuantity,
    orderedAmount: orderedAmount,
    actualQuantity: actualQuantity,
    actualAmount: actualAmount
  };
}

// Функция для получения текста статуса
function getStatusText(status) {
  const statusMap = {
    'failed': 'Ошибка оплаты',
    'in_progress': 'Выполняется',
    'pending': 'Ожидает подтверждения'
  };
  return statusMap[status] || status;
}

// Генерируем 250 транзакций
const transactions = [];
for (let i = 0; i < 250; i++) {
  transactions.push(generateTransaction(i));
}

// Сортируем по времени (новые первыми)
transactions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

// Статистика
const stats = {
  byStatus: {},
  byFuelType: {},
  byPaymentMethod: {},
  byStation: {}
};

transactions.forEach(op => {
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
  stats.byFuelType[op.fuelType] = (stats.byFuelType[op.fuelType] || 0) + 1;
  stats.byPaymentMethod[op.paymentMethod] = (stats.byPaymentMethod[op.paymentMethod] || 0) + 1;
  stats.byStation[op.tradingPointName] = (stats.byStation[op.tradingPointName] || 0) + 1;
});

console.log('✅ Создано транзакций:', transactions.length);
console.log('📊 Статистика:');
console.log('По статусам:', stats.byStatus);
console.log('По видам топлива:', stats.byFuelType);
console.log('По способам оплаты:', stats.byPaymentMethod);
console.log('По АЗС:', stats.byStation);

// Проверяем процентное распределение
const total = transactions.length;
console.log('\n📈 Процентное распределение:');
console.log('Статусы:');
Object.entries(stats.byStatus).forEach(([status, count]) => {
  console.log(`   ${status}: ${count} (${((count/total)*100).toFixed(1)}%)`);
});

console.log('Виды оплаты:');
Object.entries(stats.byPaymentMethod).forEach(([method, count]) => {
  console.log(`   ${method}: ${count} (${((count/total)*100).toFixed(1)}%)`);
});

// Сохраняем данные
fs.writeFileSync('demo-250-transactions.json', JSON.stringify(transactions, null, 2));
console.log('\n💾 Данные сохранены в demo-250-transactions.json');

module.exports = transactions;