/**
 * Генератор образцовых данных для замены в operationsService.ts
 */

const sampleOperations = [
  // Пятница, 1 августа - высокий трафик
  {
    id: "TXN-010001",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-01T07:15:23.000Z",
    endTime: "2025-08-01T07:15:47.000Z",
    duration: 24,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "PUMP-001",
    transactionId: "TXN-010001",
    fuelType: "АИ-95",
    quantity: 42.3,
    price: 62.50,
    totalCost: 2643.75,
    paymentMethod: "bank_card",
    details: "Продажа топлива АИ-95",
    progress: 100,
    lastUpdated: "2025-08-01T07:15:47.000Z",
    operatorName: "Иванов И.П.",
    customerId: "CUST-23456",
    vehicleNumber: "А123БВ777",
    createdAt: "new Date('2025-08-01T07:15:23.000Z')",
    updatedAt: "new Date('2025-08-01T07:15:47.000Z')"
  },
  {
    id: "TXN-010002",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-01T08:22:15.000Z",
    endTime: "2025-08-01T08:22:58.000Z",
    duration: 43,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная",
    deviceId: "PUMP-003",
    transactionId: "TXN-010002",
    fuelType: "ДТ",
    quantity: 65.8,
    price: 58.20,
    totalCost: 3829.56,
    paymentMethod: "fuel_card",
    details: "Продажа топлива ДТ",
    progress: 100,
    lastUpdated: "2025-08-01T08:22:58.000Z",
    operatorName: "Петров П.С.",
    customerId: "CUST-34567",
    vehicleNumber: "В456ГД199",
    createdAt: "new Date('2025-08-01T08:22:15.000Z')",
    updatedAt: "new Date('2025-08-01T08:22:58.000Z')"
  },
  {
    id: "TXN-010003",
    operationType: "sale", 
    status: "completed",
    startTime: "2025-08-01T12:30:44.000Z",
    endTime: "2025-08-01T12:31:15.000Z",
    duration: 31,
    tradingPointId: "station_03",
    tradingPointName: "АЗС №3 Южная",
    deviceId: "PUMP-005",
    transactionId: "TXN-010003",
    fuelType: "АИ-92",
    quantity: 38.7,
    price: 59.80,
    totalCost: 2314.26,
    paymentMethod: "cash",
    details: "Продажа топлива АИ-92",
    progress: 100,
    lastUpdated: "2025-08-01T12:31:15.000Z",
    operatorName: "Козлова А.В.",
    customerId: "CUST-45678",
    vehicleNumber: "С789ЕЖ123",
    createdAt: "new Date('2025-08-01T12:30:44.000Z')",
    updatedAt: "new Date('2025-08-01T12:31:15.000Z')"
  },
  {
    id: "TXN-010004",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-01T17:45:12.000Z",
    endTime: "2025-08-01T17:45:34.000Z", 
    duration: 22,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "PUMP-002",
    transactionId: "TXN-010004",
    fuelType: "АИ-95",
    quantity: 28.5,
    price: 62.50,
    totalCost: 1781.25,
    paymentMethod: "bank_card",
    details: "Продажа топлива АИ-95",
    progress: 100,
    lastUpdated: "2025-08-01T17:45:34.000Z",
    operatorName: "Морозова Е.Н.",
    customerId: "CUST-56789",
    vehicleNumber: "Д012ЖЗ456",
    createdAt: "new Date('2025-08-01T17:45:12.000Z')",
    updatedAt: "new Date('2025-08-01T17:45:34.000Z')"
  },
  {
    id: "TXN-010005",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-01T18:30:08.000Z",
    endTime: "2025-08-01T18:30:42.000Z",
    duration: 34,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная", 
    deviceId: "PUMP-004",
    transactionId: "TXN-010005",
    fuelType: "АИ-92",
    quantity: 45.2,
    price: 59.80,
    totalCost: 2702.96,
    paymentMethod: "corporate_card",
    details: "Продажа топлива АИ-92",
    progress: 100,
    lastUpdated: "2025-08-01T18:30:42.000Z",
    operatorName: "Николаев Н.В.",
    customerId: "CUST-67890",
    vehicleNumber: "Е345ИК789",
    createdAt: "new Date('2025-08-01T18:30:08.000Z')",
    updatedAt: "new Date('2025-08-01T18:30:42.000Z')"
  },
  {
    id: "OP-005001",
    operationType: "cash_collection",
    status: "completed",
    startTime: "2025-08-01T10:00:00.000Z",
    endTime: "2025-08-01T10:15:00.000Z",
    duration: 900,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "POS-001",
    details: "Инкассация наличных средств",
    progress: 100,
    lastUpdated: "2025-08-01T10:15:00.000Z",
    operatorName: "Сидоров С.А.",
    createdAt: "new Date('2025-08-01T10:00:00.000Z')",
    updatedAt: "new Date('2025-08-01T10:15:00.000Z')"
  },
  // Суббота, 2 августа - средний трафик
  {
    id: "TXN-010006",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-02T09:15:30.000Z",
    endTime: "2025-08-02T09:15:55.000Z",
    duration: 25,
    tradingPointId: "station_03",
    tradingPointName: "АЗС №3 Южная",
    deviceId: "PUMP-006",
    transactionId: "TXN-010006",
    fuelType: "ДТ",
    quantity: 52.4,
    price: 58.20,
    totalCost: 3049.68,
    paymentMethod: "fuel_card",
    details: "Продажа топлива ДТ",
    progress: 100,
    lastUpdated: "2025-08-02T09:15:55.000Z",
    operatorName: "Федорова Ф.И.",
    customerId: "CUST-78901",
    vehicleNumber: "Ж678ЛМ012",
    createdAt: "new Date('2025-08-02T09:15:30.000Z')",
    updatedAt: "new Date('2025-08-02T09:15:55.000Z')"
  },
  {
    id: "TXN-010007",
    operationType: "sale",
    status: "failed",
    startTime: "2025-08-02T14:22:18.000Z",
    endTime: "2025-08-02T14:23:05.000Z",
    duration: 47,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "PUMP-001",
    transactionId: "TXN-010007",
    fuelType: "АИ-95",
    quantity: 33.8,
    price: 62.50,
    totalCost: 2112.50,
    paymentMethod: "bank_card",
    details: "Ошибка при обработке платежа",
    progress: 100,
    lastUpdated: "2025-08-02T14:23:05.000Z",
    operatorName: "Романов Р.Р.",
    customerId: "CUST-89012",
    vehicleNumber: "З901НО345",
    createdAt: "new Date('2025-08-02T14:22:18.000Z')",
    updatedAt: "new Date('2025-08-02T14:23:05.000Z')"
  },
  {
    id: "OP-005002",
    operationType: "diagnostics",
    status: "completed",
    startTime: "2025-08-02T11:00:00.000Z",
    endTime: "2025-08-02T12:30:00.000Z",
    duration: 5400,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная",
    deviceId: "PUMP-003",
    details: "Диагностика ТРК №3 - калибровка системы измерения",
    progress: 100,
    lastUpdated: "2025-08-02T12:30:00.000Z",
    operatorName: "Иванов И.П.",
    createdAt: "new Date('2025-08-02T11:00:00.000Z')",
    updatedAt: "new Date('2025-08-02T12:30:00.000Z')"
  },
  // Воскресенье, 3 августа - низкий трафик
  {
    id: "TXN-010008",
    operationType: "sale",
    status: "completed",
    startTime: "2025-08-03T11:45:22.000Z",
    endTime: "2025-08-03T11:45:51.000Z",
    duration: 29,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная",
    deviceId: "PUMP-004",
    transactionId: "TXN-010008",
    fuelType: "АИ-92",
    quantity: 25.6,
    price: 59.80,
    totalCost: 1530.88,
    paymentMethod: "cash",
    details: "Продажа топлива АИ-92",
    progress: 100,
    lastUpdated: "2025-08-03T11:45:51.000Z",
    operatorName: "Козлова А.В.",
    customerId: "CUST-90123",
    vehicleNumber: "И234ПР678",
    createdAt: "new Date('2025-08-03T11:45:22.000Z')",
    updatedAt: "new Date('2025-08-03T11:45:51.000Z')"
  },
  {
    id: "TXN-010009",
    operationType: "refund",
    status: "completed",
    startTime: "2025-08-03T15:20:00.000Z",
    endTime: "2025-08-03T15:25:00.000Z", 
    duration: 300,
    tradingPointId: "station_03",
    tradingPointName: "АЗС №3 Южная",
    deviceId: "POS-001",
    transactionId: "TXN-010009",
    fuelType: "АИ-95",
    quantity: 20.0,
    price: 62.50,
    totalCost: 1250.00,
    paymentMethod: "bank_card",
    details: "Возврат средств за некачественное топливо",
    progress: 100,
    lastUpdated: "2025-08-03T15:25:00.000Z",
    operatorName: "Петров П.С.",
    customerId: "CUST-01234",
    vehicleNumber: "К567СТ901",
    createdAt: "new Date('2025-08-03T15:20:00.000Z')",
    updatedAt: "new Date('2025-08-03T15:25:00.000Z')"
  },
  {
    id: "OP-005003",
    operationType: "maintenance",
    status: "in_progress",
    startTime: "2025-08-03T14:00:00.000Z",
    tradingPointId: "station_01", 
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "PUMP-002",
    details: "Плановое техническое обслуживание ТРК №2",
    progress: 75,
    lastUpdated: "2025-08-03T16:30:00.000Z",
    operatorName: "Морозова Е.Н.",
    createdAt: "new Date('2025-08-03T14:00:00.000Z')",
    updatedAt: "new Date('2025-08-03T16:30:00.000Z')"
  }
];

console.log(`Подготовлено ${sampleOperations.length} образцовых операций для замены`);

// Статистика
const stats = sampleOperations.reduce((acc, op) => {
  acc[op.operationType] = (acc[op.operationType] || 0) + 1;
  return acc;
}, {});
console.log('Статистика по типам:', stats);

const stationStats = sampleOperations.reduce((acc, op) => {
  acc[op.tradingPointName] = (acc[op.tradingPointName] || 0) + 1;
  return acc;
}, {});
console.log('По станциям:', stationStats);

const revenue = sampleOperations
  .filter(op => op.totalCost && op.status === 'completed')
  .reduce((sum, op) => sum + op.totalCost, 0);
console.log(`Общая выручка: ${revenue.toLocaleString('ru-RU')} руб`);

console.log('\n=== Код для замены ===');
console.log('const initialOperations: Operation[] = [');
sampleOperations.forEach((op, index) => {
  console.log('  {');
  Object.entries(op).forEach(([key, value]) => {
    if (key === 'createdAt' || key === 'updatedAt') {
      console.log(`    ${key}: ${value},`);
    } else if (typeof value === 'string') {
      console.log(`    ${key}: "${value}",`);
    } else {
      console.log(`    ${key}: ${value},`);
    }
  });
  console.log(index < sampleOperations.length - 1 ? '  },' : '  }');
});
console.log('];');