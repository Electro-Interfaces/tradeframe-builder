/**
 * Генератор реалистичных транзакций для демо сети АЗС за август 2025
 */

// Конфигурация станций
const stations = [
  { id: "station_01", name: "АЗС №1 Центральная", multiplier: 1.2 }, // Центральная - больше трафика
  { id: "station_02", name: "АЗС №2 Северная", multiplier: 0.9 },   // Северная - средний трафик
  { id: "station_03", name: "АЗС №3 Южная", multiplier: 1.0 }       // Южная - стандартный трафик
];

// Типы топлива с ценами и распределением
const fuelTypes = [
  { type: "АИ-95", price: 62.50, distribution: 0.45 },
  { type: "АИ-92", price: 59.80, distribution: 0.35 },
  { type: "ДТ", price: 58.20, distribution: 0.20 }
];

// Способы оплаты с распределением
const paymentMethods = [
  { method: "bank_card", name: "Банковская карта", distribution: 0.55 },
  { method: "cash", name: "Наличные", distribution: 0.25 },
  { method: "fuel_card", name: "Топливная карта", distribution: 0.15 },
  { method: "corporate_card", name: "Корпоративная карта", distribution: 0.05 }
];

// Операторы
const operators = [
  "Иванов И.П.", "Петров П.С.", "Сидоров С.А.", "Козлова А.В.",
  "Морозова Е.Н.", "Николаев Н.В.", "Федорова Ф.И.", "Романов Р.Р."
];

// Генерация номеров авто
function generateVehicleNumber() {
  const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ";
  const digits = "0123456789";
  const regions = ["77", "97", "99", "177", "197", "199", "777", "799"];
  
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const d1 = digits[Math.floor(Math.random() * 10)];
  const d2 = digits[Math.floor(Math.random() * 10)];
  const d3 = digits[Math.floor(Math.random() * 10)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const l3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${l1}${d1}${d2}${d3}${l2}${l3}${region}`;
}

// Получение коэффициента трафика по дню недели
function getDayMultiplier(dayOfWeek) {
  const multipliers = {
    0: 0.7,  // Воскресенье
    1: 1.0,  // Понедельник
    2: 1.0,  // Вторник
    3: 1.0,  // Среда
    4: 1.1,  // Четверг
    5: 1.3,  // Пятница
    6: 0.8   // Суббота
  };
  return multipliers[dayOfWeek];
}

// Получение коэффициента трафика по времени
function getHourMultiplier(hour) {
  const multipliers = {
    0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.05, 5: 0.1,
    6: 0.3, 7: 0.8, 8: 1.2, 9: 1.0, 10: 0.9, 11: 0.9,
    12: 1.1, 13: 1.0, 14: 0.9, 15: 0.9, 16: 1.0, 17: 1.2,
    18: 1.4, 19: 1.3, 20: 1.0, 21: 0.8, 22: 0.6, 23: 0.3
  };
  return multipliers[hour];
}

// Выбор элемента по распределению
function selectByDistribution(items, distributionKey = 'distribution') {
  const random = Math.random();
  let cumulative = 0;
  
  for (const item of items) {
    cumulative += item[distributionKey];
    if (random <= cumulative) {
      return item;
    }
  }
  return items[items.length - 1];
}

// Генерация количества топлива (реалистичное)
function generateFuelQuantity(fuelType) {
  let baseRange;
  if (fuelType === "ДТ") {
    // Дизель - обычно больше заправляют
    baseRange = { min: 20, max: 80 };
  } else {
    // Бензин
    baseRange = { min: 15, max: 60 };
  }
  
  const quantity = Math.random() * (baseRange.max - baseRange.min) + baseRange.min;
  return Math.round(quantity * 10) / 10; // Округляем до 1 знака
}

// Генерация одной транзакции
function generateTransaction(station, date, hour, minute, txnId) {
  const fuel = selectByDistribution(fuelTypes);
  const payment = selectByDistribution(paymentMethods);
  const quantity = generateFuelQuantity(fuel.type);
  const totalCost = Math.round(quantity * fuel.price * 100) / 100;
  
  const startTime = new Date(2025, 7, date, hour, minute, Math.floor(Math.random() * 60));
  const endTime = new Date(startTime.getTime() + (20 + Math.random() * 40) * 1000); // 20-60 сек
  
  return {
    id: `TXN-${String(txnId).padStart(6, '0')}`,
    operationType: "sale",
    status: Math.random() > 0.02 ? "completed" : "failed", // 2% неудачных транзакций
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: Math.floor((endTime - startTime) / 1000),
    tradingPointId: station.id,
    tradingPointName: station.name,
    deviceId: `PUMP-${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`,
    transactionId: `TXN-${String(txnId).padStart(6, '0')}`,
    fuelType: fuel.type,
    quantity: quantity,
    price: fuel.price,
    totalCost: totalCost,
    paymentMethod: payment.method,
    details: `Продажа топлива ${fuel.type}`,
    progress: 100,
    lastUpdated: endTime.toISOString(),
    operatorName: operators[Math.floor(Math.random() * operators.length)],
    customerId: `CUST-${Math.floor(Math.random() * 90000) + 10000}`,
    vehicleNumber: generateVehicleNumber(),
    createdAt: startTime,
    updatedAt: endTime
  };
}

// Генерация дополнительных операций (инкассация, диагностика и т.д.)
function generateServiceOperation(station, date, operationType, opId) {
  const startHour = operationType === 'cash_collection' ? 9 + Math.floor(Math.random() * 8) : 
                    operationType === 'diagnostics' ? 8 + Math.floor(Math.random() * 10) :
                    6 + Math.floor(Math.random() * 12);
  
  const startTime = new Date(2025, 7, date, startHour, Math.floor(Math.random() * 60));
  const duration = operationType === 'cash_collection' ? 600 + Math.random() * 1200 : // 10-30 мин
                   operationType === 'diagnostics' ? 1800 + Math.random() * 3600 : // 30-90 мин
                   300 + Math.random() * 900; // 5-20 мин
  
  const endTime = new Date(startTime.getTime() + duration * 1000);
  
  const details = {
    'cash_collection': 'Инкассация наличных средств',
    'diagnostics': 'Диагностика оборудования ТРК',
    'maintenance': 'Плановое техническое обслуживание',
    'sensor_calibration': 'Калибровка датчиков уровня топлива'
  };
  
  return {
    id: `OP-${String(opId).padStart(6, '0')}`,
    operationType: operationType,
    status: Math.random() > 0.1 ? "completed" : "failed", // 10% неудачных
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: Math.floor(duration),
    tradingPointId: station.id,
    tradingPointName: station.name,
    deviceId: operationType === 'cash_collection' ? 'POS-001' : `PUMP-${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`,
    details: details[operationType],
    progress: 100,
    lastUpdated: endTime.toISOString(),
    operatorName: operators[Math.floor(Math.random() * operators.length)],
    createdAt: startTime,
    updatedAt: endTime
  };
}

// Основная функция генерации
function generateAugust2025Data() {
  const operations = [];
  let txnId = 10000;
  let opId = 5000;
  
  // Проходим по всем дням августа 2025
  for (let date = 1; date <= 31; date++) {
    const dayOfWeek = new Date(2025, 7, date).getDay(); // 0 = воскресенье
    const dayMultiplier = getDayMultiplier(dayOfWeek);
    
    // Генерируем транзакции для каждой станции
    stations.forEach(station => {
      const baseTxnPerDay = 120; // Базовое количество транзакций в день
      const expectedTxns = Math.floor(baseTxnPerDay * station.multiplier * dayMultiplier);
      
      // Распределяем транзакции по часам
      for (let hour = 6; hour < 24; hour++) {
        const hourMultiplier = getHourMultiplier(hour);
        const txnsThisHour = Math.floor(expectedTxns * hourMultiplier / 18); // 18 рабочих часов
        
        // Генерируем транзакции для этого часа
        for (let i = 0; i < txnsThisHour; i++) {
          const minute = Math.floor(Math.random() * 60);
          operations.push(generateTransaction(station, date, hour, minute, ++txnId));
        }
      }
      
      // Добавляем служебные операции (раз в несколько дней)
      if (date % 3 === 1) { // Инкассация каждые 3 дня
        operations.push(generateServiceOperation(station, date, 'cash_collection', ++opId));
      }
      
      if (date % 7 === 0) { // Диагностика раз в неделю
        operations.push(generateServiceOperation(station, date, 'diagnostics', ++opId));
      }
      
      if (date % 5 === 0) { // ТО раз в 5 дней
        operations.push(generateServiceOperation(station, date, 'maintenance', ++opId));
      }
    });
  }
  
  // Сортируем по времени
  operations.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  return operations;
}

// Генерируем данные
const operations = generateAugust2025Data();

console.log(`Сгенерировано ${operations.length} операций для августа 2025`);
console.log('Статистика по типам:');
const stats = operations.reduce((acc, op) => {
  acc[op.operationType] = (acc[op.operationType] || 0) + 1;
  return acc;
}, {});
console.log(stats);

console.log('\nСтатистика по станциям:');
const stationStats = operations.reduce((acc, op) => {
  acc[op.tradingPointName] = (acc[op.tradingPointName] || 0) + 1;
  return acc;
}, {});
console.log(stationStats);

// Подсчет общей выручки
const totalRevenue = operations
  .filter(op => op.totalCost && op.status === 'completed')
  .reduce((sum, op) => sum + op.totalCost, 0);
console.log(`\nОбщая выручка: ${totalRevenue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}`);

// Выводим код для замены в operationsService.ts
console.log('\n=== КОД ДЛЯ ЗАМЕНЫ В operationsService.ts ===\n');
console.log(`const initialOperations: Operation[] = ${JSON.stringify(operations, null, 2)};`);