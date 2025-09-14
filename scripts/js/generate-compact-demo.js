/**
 * Генератор компактных реалистичных транзакций для демо (первые 10 дней августа)
 */

// Конфигурация станций
const stations = [
  { id: "station_01", name: "АЗС №1 Центральная", multiplier: 1.2 },
  { id: "station_02", name: "АЗС №2 Северная", multiplier: 0.9 },
  { id: "station_03", name: "АЗС №3 Южная", multiplier: 1.0 }
];

const fuelTypes = [
  { type: "АИ-95", price: 62.50, distribution: 0.45 },
  { type: "АИ-92", price: 59.80, distribution: 0.35 },
  { type: "ДТ", price: 58.20, distribution: 0.20 }
];

const paymentMethods = [
  { method: "bank_card", distribution: 0.55 },
  { method: "cash", distribution: 0.25 },
  { method: "fuel_card", distribution: 0.15 },
  { method: "corporate_card", distribution: 0.05 }
];

const operators = [
  "Иванов И.П.", "Петров П.С.", "Сидоров С.А.", "Козлова А.В.",
  "Морозова Е.Н.", "Николаев Н.В.", "Федорова Ф.И.", "Романов Р.Р."
];

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

function getDayMultiplier(dayOfWeek) {
  const multipliers = { 0: 0.7, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.1, 5: 1.3, 6: 0.8 };
  return multipliers[dayOfWeek];
}

function getHourMultiplier(hour) {
  const multipliers = {
    6: 0.3, 7: 0.8, 8: 1.2, 9: 1.0, 10: 0.9, 11: 0.9,
    12: 1.1, 13: 1.0, 14: 0.9, 15: 0.9, 16: 1.0, 17: 1.2,
    18: 1.4, 19: 1.3, 20: 1.0, 21: 0.8, 22: 0.6, 23: 0.3
  };
  return multipliers[hour] || 0.1;
}

function selectByDistribution(items) {
  const random = Math.random();
  let cumulative = 0;
  
  for (const item of items) {
    cumulative += item.distribution;
    if (random <= cumulative) {
      return item;
    }
  }
  return items[items.length - 1];
}

function generateFuelQuantity(fuelType) {
  const baseRange = fuelType === "ДТ" ? { min: 20, max: 80 } : { min: 15, max: 60 };
  const quantity = Math.random() * (baseRange.max - baseRange.min) + baseRange.min;
  return Math.round(quantity * 10) / 10;
}

function generateTransaction(station, date, hour, minute, txnId) {
  const fuel = selectByDistribution(fuelTypes);
  const payment = selectByDistribution(paymentMethods);
  const quantity = generateFuelQuantity(fuel.type);
  const totalCost = Math.round(quantity * fuel.price * 100) / 100;
  
  const startTime = new Date(2025, 7, date, hour, minute, Math.floor(Math.random() * 60));
  const endTime = new Date(startTime.getTime() + (20 + Math.random() * 40) * 1000);
  
  return {
    id: `TXN-${String(txnId).padStart(6, '0')}`,
    operationType: "sale",
    status: Math.random() > 0.02 ? "completed" : "failed",
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
    createdAt: `new Date('${startTime.toISOString()}')`,
    updatedAt: `new Date('${endTime.toISOString()}')`
  };
}

function generateServiceOperation(station, date, operationType, opId) {
  const startHour = operationType === 'cash_collection' ? 10 : 9;
  const startTime = new Date(2025, 7, date, startHour, Math.floor(Math.random() * 60));
  const duration = operationType === 'cash_collection' ? 900 : 1200;
  const endTime = new Date(startTime.getTime() + duration * 1000);
  
  const details = {
    'cash_collection': 'Инкассация наличных средств',
    'diagnostics': 'Диагностика оборудования ТРК',
    'maintenance': 'Плановое техническое обслуживание'
  };
  
  return {
    id: `OP-${String(opId).padStart(6, '0')}`,
    operationType: operationType,
    status: "completed",
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
    createdAt: `new Date('${startTime.toISOString()}')`,
    updatedAt: `new Date('${endTime.toISOString()}')`
  };
}

// Генерируем данные только за первые 10 дней августа для компактности
function generateCompactData() {
  const operations = [];
  let txnId = 10000;
  let opId = 5000;
  
  // Только первые 10 дней
  for (let date = 1; date <= 10; date++) {
    const dayOfWeek = new Date(2025, 7, date).getDay();
    const dayMultiplier = getDayMultiplier(dayOfWeek);
    
    stations.forEach(station => {
      const baseTxnPerDay = 80; // Меньше для компактности
      const expectedTxns = Math.floor(baseTxnPerDay * station.multiplier * dayMultiplier);
      
      // Пиковые часы
      const peakHours = [8, 12, 17, 18, 19];
      
      peakHours.forEach(hour => {
        const hourMultiplier = getHourMultiplier(hour);
        const txnsThisHour = Math.floor((expectedTxns * hourMultiplier) / 5); // 5 пиковых часов
        
        for (let i = 0; i < txnsThisHour; i++) {
          const minute = Math.floor(Math.random() * 60);
          operations.push(generateTransaction(station, date, hour, minute, ++txnId));
        }
      });
      
      // Сервисные операции
      if (date === 3 || date === 7) {
        operations.push(generateServiceOperation(station, date, 'cash_collection', ++opId));
      }
      if (date === 5) {
        operations.push(generateServiceOperation(station, date, 'diagnostics', ++opId));
      }
    });
  }
  
  operations.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  return operations;
}

const operations = generateCompactData();

console.log(`Сгенерировано ${operations.length} операций (компактная версия)`);

// Выводим код с правильным форматированием для TypeScript
const formatted = operations.map(op => {
  const { createdAt, updatedAt, ...rest } = op;
  return {
    ...rest,
    createdAt: createdAt,
    updatedAt: updatedAt
  };
});

console.log(JSON.stringify(formatted, null, 2));