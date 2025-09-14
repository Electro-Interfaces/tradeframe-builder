// Генератор реалистичных операций для сети АЗС
// Создает транзакции за август 2025 с равномерным распределением

const fs = require('fs');

// Виды топлива согласно номенклатуре
const fuelTypes = [
  { type: 'АИ-92', price: 58.2, weight: 30 },  // 30% продаж
  { type: 'АИ-95', price: 63.8, weight: 35 },  // 35% продаж
  { type: 'АИ-98', price: 67.5, weight: 10 },  // 10% продаж
  { type: 'ДТ', price: 59.5, weight: 20 },     // 20% продаж
  { type: 'АИ-100', price: 68.5, weight: 5 }   // 5% продаж
];

// Виды оплаты (только разрешенные)
const paymentMethods = [
  { method: 'cash', weight: 25 },           // 25% - наличные
  { method: 'bank_card', weight: 50 },      // 50% - банковские карты
  { method: 'fuel_card', weight: 20 },      // 20% - топливные карты
  { method: 'online_order', weight: 5 }     // 5% - онлайн заказы
];

// АЗС в сети
const stations = [
  { id: 'station_01', name: 'АЗС №1 Центральная', pumps: 8, avgDailyTransactions: 150 },
  { id: 'station_02', name: 'АЗС №2 Северная', pumps: 6, avgDailyTransactions: 120 },
  { id: 'station_03', name: 'АЗС №3 Южная', pumps: 10, avgDailyTransactions: 200 },
  { id: 'station_04', name: 'АЗС №4 Восточная', pumps: 6, avgDailyTransactions: 100 },
  { id: 'station_05', name: 'АЗС №5 Промзона', pumps: 12, avgDailyTransactions: 250 },
  { id: 'station_06', name: 'АЗС №6 Трасса М4', pumps: 10, avgDailyTransactions: 180 }
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

// Генерация случайного номера автомобиля
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

// Генерация транзакции
function generateTransaction(date, station, transactionNum) {
  const fuel = weightedRandom(fuelTypes);
  const payment = weightedRandom(paymentMethods);
  
  // Случайный объем от 15 до 80 литров
  const quantity = Math.round((15 + Math.random() * 65) * 100) / 100;
  const totalCost = Math.round(quantity * fuel.price * 100) / 100;
  
  // Случайное время в течение дня (6:00 - 23:00)
  const hour = 6 + Math.floor(Math.random() * 17);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  const startTime = new Date(date);
  startTime.setHours(hour, minute, second);
  
  // Длительность заправки 2-5 минут
  const duration = 2 + Math.floor(Math.random() * 3);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  const pumpId = Math.floor(Math.random() * station.pumps) + 1;
  const operatorIndex = Math.floor(Math.random() * operators.length);
  
  return {
    id: `TXN-${date.toISOString().split('T')[0]}-${station.id.split('_')[1]}-${String(transactionNum).padStart(3, '0')}`,
    operationType: 'sale',
    status: 'completed',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    tradingPointId: station.id,
    tradingPointName: station.name,
    deviceId: `PUMP-${String(pumpId).padStart(3, '0')}`,
    transactionId: `TXN-${date.getTime()}-${transactionNum}`,
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

// Генерация операций за август 2025
function generateAugustOperations() {
  const operations = [];
  
  // Генерируем операции для каждого дня августа
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 7, day); // 7 = август (месяцы с 0)
    
    // Для каждой АЗС
    for (const station of stations) {
      // Случайная вариация количества транзакций (±20%)
      const variation = 0.8 + Math.random() * 0.4;
      const dailyTransactions = Math.floor(station.avgDailyTransactions * variation);
      
      // Генерируем транзакции для этой АЗС в этот день
      for (let i = 0; i < dailyTransactions; i++) {
        operations.push(generateTransaction(date, station, i + 1));
      }
    }
  }
  
  // Добавляем операции с различными статусами для реализма
  // Ошибка - 2%
  const errorOperations = Math.floor(operations.length * 0.02);
  for (let i = 0; i < errorOperations; i++) {
    const randomIndex = Math.floor(Math.random() * operations.length);
    operations[randomIndex].status = 'failed';
    operations[randomIndex].details += ' - Ошибка оплаты';
  }
  
  // Ожидание - 2%
  const pendingOperations = Math.floor(operations.length * 0.02);
  for (let i = 0; i < pendingOperations; i++) {
    const randomIndex = Math.floor(Math.random() * operations.length);
    if (operations[randomIndex].status === 'completed') { // Избегаем перезаписи failed
      operations[randomIndex].status = 'pending';
      operations[randomIndex].details += ' - Ожидает подтверждения';
      operations[randomIndex].progress = 10 + Math.floor(Math.random() * 20);
    }
  }
  
  // Выполняется - 3%
  const inProgressOperations = Math.floor(operations.length * 0.03);
  for (let i = 0; i < inProgressOperations; i++) {
    const randomIndex = Math.floor(Math.random() * operations.length);
    if (operations[randomIndex].status === 'completed') { // Избегаем перезаписи failed/pending
      operations[randomIndex].status = 'in_progress';
      operations[randomIndex].progress = 50 + Math.floor(Math.random() * 40);
    }
  }
  
  // Добавляем инкассации (2 раза в неделю для каждой АЗС)
  for (const station of stations) {
    for (let week = 0; week < 4; week++) {
      const day1 = week * 7 + 2; // Вторник
      const day2 = week * 7 + 5; // Пятница
      
      [day1, day2].forEach(day => {
        if (day <= 31) {
          const date = new Date(2025, 7, day, 23, 0, 0);
          const cashAmount = 80000 + Math.floor(Math.random() * 100000);
          
          operations.push({
            id: `CASH-${date.toISOString().split('T')[0]}-${station.id.split('_')[1]}`,
            operationType: 'cash_collection',
            status: 'completed',
            startTime: date.toISOString(),
            endTime: new Date(date.getTime() + 15 * 60000).toISOString(),
            duration: 15,
            tradingPointId: station.id,
            tradingPointName: station.name,
            deviceId: 'CASH-001',
            transactionId: `CASH-${date.getTime()}`,
            fuelType: undefined,
            quantity: undefined,
            price: undefined,
            totalCost: cashAmount,
            paymentMethod: 'cash',
            details: 'Инкассация наличных средств',
            progress: 100,
            lastUpdated: new Date(date.getTime() + 15 * 60000).toISOString(),
            operatorName: 'Смирнов С.М.',
            customerId: undefined,
            vehicleNumber: undefined,
            metadata: { cashAmount: cashAmount, bags: Math.ceil(cashAmount / 50000) },
            createdAt: date.toISOString(),
            updatedAt: new Date(date.getTime() + 15 * 60000).toISOString()
          });
        }
      });
    }
  }
  
  // Добавляем загрузки топлива (1 раз в 3 дня для каждой АЗС)
  for (const station of stations) {
    for (let day = 1; day <= 31; day += 3) {
      const date = new Date(2025, 7, day, 4, 30, 0); // Рано утром
      const fuel = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
      const volume = 5000 + Math.floor(Math.random() * 10000); // 5000-15000 литров
      
      operations.push({
        id: `LOAD-${date.toISOString().split('T')[0]}-${station.id.split('_')[1]}`,
        operationType: 'tank_loading',
        status: 'completed',
        startTime: date.toISOString(),
        endTime: new Date(date.getTime() + 45 * 60000).toISOString(),
        duration: 45,
        tradingPointId: station.id,
        tradingPointName: station.name,
        deviceId: 'TANK-001',
        transactionId: `LOAD-${date.getTime()}`,
        fuelType: fuel.type,
        quantity: volume,
        price: fuel.price - 5, // Оптовая цена ниже
        totalCost: volume * (fuel.price - 5),
        paymentMethod: 'bank_transfer',
        details: `Загрузка резервуара ${fuel.type}`,
        progress: 100,
        lastUpdated: new Date(date.getTime() + 45 * 60000).toISOString(),
        operatorName: 'Грузовой В.В.',
        customerId: 'SUPPLIER-001',
        vehicleNumber: `Т${Math.floor(100 + Math.random() * 900)}АА50`,
        metadata: { tankNumber: Math.floor(Math.random() * 4) + 1, supplier: 'НефтеПродукт' },
        createdAt: date.toISOString(),
        updatedAt: new Date(date.getTime() + 45 * 60000).toISOString()
      });
    }
  }
  
  // Сортируем по времени (новые первыми)
  operations.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return operations;
}

// Генерация и сохранение
const operations = generateAugustOperations();

console.log(`Сгенерировано операций: ${operations.length}`);

// Статистика
const stats = {
  total: operations.length,
  byFuelType: {},
  byPaymentMethod: {},
  byStation: {},
  byStatus: {}
};

operations.forEach(op => {
  // По типу топлива
  if (op.fuelType) {
    stats.byFuelType[op.fuelType] = (stats.byFuelType[op.fuelType] || 0) + 1;
  }
  
  // По способу оплаты
  if (op.paymentMethod) {
    stats.byPaymentMethod[op.paymentMethod] = (stats.byPaymentMethod[op.paymentMethod] || 0) + 1;
  }
  
  // По АЗС
  stats.byStation[op.tradingPointName] = (stats.byStation[op.tradingPointName] || 0) + 1;
  
  // По статусу
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
});

console.log('\nСтатистика:');
console.log('По видам топлива:', stats.byFuelType);
console.log('По способам оплаты:', stats.byPaymentMethod);
console.log('По АЗС:', stats.byStation);
console.log('По статусам:', stats.byStatus);

// Сохраняем в файл
fs.writeFileSync('realistic-operations-august-2025.json', JSON.stringify(operations, null, 2));
console.log('\nДанные сохранены в realistic-operations-august-2025.json');

// Экспорт для использования в operationsService.ts
module.exports = operations;