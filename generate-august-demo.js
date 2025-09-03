/**
 * Генератор демо данных для сети АЗС за август 2025 года
 * Создает реалистичные операции и транзакции с учетом:
 * - Времени суток и дня недели
 * - Сезонных особенностей
 * - Различных типов операций
 * - Статистических паттернов реальной АЗС
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация генерации
const CONFIG = {
  totalOperations: 500,
  month: 8, // Август
  year: 2025,
  startDate: new Date('2025-08-01T00:00:00.000Z'),
  endDate: new Date('2025-08-31T23:59:59.999Z')
};

// Данные АЗС
const STATIONS = [
  { id: "station_01", name: "АЗС №1 Центральная", number: 77, baseActivity: 1.1 },
  { id: "station_02", name: "АЗС №2 Северная", number: 78, baseActivity: 0.9 },
  { id: "station_03", name: "АЗС №3 Южная", number: 79, baseActivity: 1.0 },
  { id: "station_04", name: "АЗС №4 Московское шоссе", number: 80, baseActivity: 1.2 },
  { id: "station_05", name: "АЗС №5 Промзона", number: 81, baseActivity: 0.8 }
];

// Топливо и цены
const FUEL_TYPES = {
  'АИ-92': { price: 56.20, popularity: 0.35, avgVolume: 35 },
  'АИ-95': { price: 59.80, popularity: 0.40, avgVolume: 42 },
  'АИ-98': { price: 65.40, popularity: 0.15, avgVolume: 38 },
  'ДТ': { price: 61.90, popularity: 0.08, avgVolume: 65 },
  'АИ-100': { price: 68.50, popularity: 0.02, avgVolume: 35 }
};

// Операторы
const OPERATORS = [
  "Иванов И.И.", "Петров П.П.", "Сидоров С.С.", "Козлов К.К.",
  "Волков В.В.", "Смирнов А.А.", "Попов Б.Б.", "Лебедев В.В.",
  "Новиков Г.Г.", "Морозов Д.Д."
];

// Способы оплаты
const PAYMENT_METHODS = {
  'bank_card': 0.50,
  'cash': 0.16,
  'fuel_card': 0.19,
  'corporate_card': 0.07,
  'contactless': 0.05,
  'mobile_payment': 0.03
};

// Типы операций
const OPERATION_TYPES = {
  'sale': 0.88,
  'maintenance': 0.05,
  'inventory': 0.03,
  'refuel_truck': 0.04
};

// Генерация номеров машин
function generateVehicleNumber() {
  const letters = 'АВЕКМНОРСТУХ';
  const regions = ['77', '78', '197', '199', '150', '178'];
  
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = String(Math.floor(Math.random() * 900) + 100);
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const letter3 = letters[Math.floor(Math.random() * letters.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  
  return `${letter1}${numbers}${letter2}${letter3}${region}`;
}

// Получение коэффициента активности по времени суток
function getHourlyMultiplier(hour) {
  const hourlyPattern = {
    0: 0.2, 1: 0.1, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.3,
    6: 0.8, 7: 1.5, 8: 2.2, 9: 1.8, 10: 1.2, 11: 1.1,
    12: 1.3, 13: 1.4, 14: 1.5, 15: 1.4, 16: 1.6, 17: 2.0,
    18: 2.3, 19: 2.1, 20: 1.8, 21: 1.3, 22: 0.8, 23: 0.4
  };
  return hourlyPattern[hour] || 1.0;
}

// Получение коэффициента активности по дню недели
function getDayOfWeekMultiplier(dayOfWeek) {
  const weekPattern = {
    0: 0.85, // Воскресенье
    1: 1.1,  // Понедельник
    2: 1.05, // Вторник
    3: 1.08, // Среда
    4: 1.0,  // Четверг
    5: 1.15, // Пятница
    6: 0.9   // Суббота
  };
  return weekPattern[dayOfWeek] || 1.0;
}

// Выбор элемента по весам
function weightedChoice(options) {
  const weights = Object.values(options);
  const keys = Object.keys(options);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return keys[i];
    }
  }
  
  return keys[keys.length - 1];
}

// Генерация временной метки
function generateTimestamp(baseDate, hourOffset = 0, minuteOffset = 0) {
  const timestamp = new Date(baseDate);
  timestamp.setHours(timestamp.getHours() + hourOffset);
  timestamp.setMinutes(timestamp.getMinutes() + minuteOffset);
  timestamp.setSeconds(Math.floor(Math.random() * 60));
  timestamp.setMilliseconds(Math.floor(Math.random() * 1000));
  return timestamp;
}

// Генерация одной операции
function generateOperation(id, baseTimestamp, stationId) {
  const station = STATIONS.find(s => s.id === stationId);
  const operationType = weightedChoice(OPERATION_TYPES);
  
  let operation = {
    id: `TXN-AUG-${String(id).padStart(3, '0')}`,
    operationType,
    status: Math.random() > 0.02 ? 'completed' : 'failed',
    tradingPointId: stationId,
    tradingPointName: station.name,
    operatorName: OPERATORS[Math.floor(Math.random() * OPERATORS.length)]
  };

  const startTime = generateTimestamp(baseTimestamp);
  let endTime, duration;

  switch (operationType) {
    case 'sale':
      const fuelType = weightedChoice(FUEL_TYPES);
      const fuelData = FUEL_TYPES[fuelType];
      const quantity = operation.status === 'completed' 
        ? Math.round((fuelData.avgVolume * (0.5 + Math.random())) * 10) / 10
        : 0;
      
      duration = operation.status === 'completed'
        ? Math.floor(45 + Math.random() * 120) // 45-165 секунд
        : Math.floor(10 + Math.random() * 30);  // 10-40 секунд для ошибок
      
      endTime = new Date(startTime.getTime() + duration * 1000);
      
      operation = {
        ...operation,
        deviceId: `PUMP-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
        transactionId: operation.id,
        fuelType,
        quantity,
        price: fuelData.price,
        totalCost: Math.round(quantity * fuelData.price * 100) / 100,
        paymentMethod: operation.status === 'completed' ? weightedChoice(PAYMENT_METHODS) : 'bank_card',
        details: operation.status === 'completed' 
          ? `Продажа топлива ${fuelType}`
          : 'Ошибка обработки платежа',
        customerId: `CUST-${Math.floor(Math.random() * 90000) + 10000}`,
        vehicleNumber: generateVehicleNumber()
      };
      break;

    case 'maintenance':
      duration = Math.floor(300 + Math.random() * 1800); // 5-35 минут
      endTime = new Date(startTime.getTime() + duration * 1000);
      
      operation = {
        ...operation,
        deviceId: `PUMP-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
        transactionId: `MAINT-AUG-${String(id).padStart(3, '0')}`,
        fuelType: null,
        quantity: 0,
        price: 0,
        totalCost: 0,
        paymentMethod: null,
        details: 'Плановое техническое обслуживание',
        customerId: null,
        vehicleNumber: null,
        operatorName: 'Техник ' + OPERATORS[Math.floor(Math.random() * 3)]
      };
      break;

    case 'inventory':
      duration = Math.floor(1800 + Math.random() * 3600); // 30-90 минут
      endTime = new Date(startTime.getTime() + duration * 1000);
      
      const invFuelType = weightedChoice(FUEL_TYPES);
      
      operation = {
        ...operation,
        deviceId: `TANK-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
        transactionId: `INV-AUG-${String(id).padStart(3, '0')}`,
        fuelType: invFuelType,
        quantity: 0,
        price: 0,
        totalCost: 0,
        paymentMethod: null,
        details: `Инвентаризация резервуара (${invFuelType})`,
        customerId: null,
        vehicleNumber: null,
        operatorName: 'Кладовщик ' + OPERATORS[Math.floor(Math.random() * 2)]
      };
      break;

    case 'refuel_truck':
      duration = Math.floor(3600 + Math.random() * 5400); // 1-2.5 часа
      endTime = new Date(startTime.getTime() + duration * 1000);
      
      const refuelFuelType = weightedChoice(FUEL_TYPES);
      const refuelQuantity = -(8000 + Math.random() * 12000); // Поставка 8-20 тысяч литров
      
      operation = {
        ...operation,
        deviceId: `TANK-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
        transactionId: `REFUEL-AUG-${String(id).padStart(3, '0')}`,
        fuelType: refuelFuelType,
        quantity: Math.round(refuelQuantity),
        price: FUEL_TYPES[refuelFuelType].price * 0.85, // Оптовая цена
        totalCost: Math.round(refuelQuantity * FUEL_TYPES[refuelFuelType].price * 0.85 * 100) / 100,
        paymentMethod: 'supplier_delivery',
        details: `Пополнение резервуара ${refuelFuelType} (${Math.abs(Math.round(refuelQuantity))}л от поставщика)`,
        customerId: `SUPPLIER-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
        vehicleNumber: `БЕНЗОВОЗ-${Math.floor(Math.random() * 900) + 100}АВ`,
        operatorName: 'Приемщик ' + OPERATORS[Math.floor(Math.random() * 3)]
      };
      break;
  }

  // Общие поля
  operation = {
    ...operation,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration,
    progress: operation.status === 'completed' ? 100 : (operation.status === 'failed' ? 0 : Math.floor(Math.random() * 80) + 10),
    lastUpdated: endTime.toISOString(),
    createdAt: startTime.toISOString(),
    updatedAt: endTime.toISOString()
  };

  return operation;
}

// Генерация всех операций
function generateAllOperations() {
  const operations = [];
  const daysInMonth = 31;
  const operationsPerDay = Math.ceil(CONFIG.totalOperations / daysInMonth);
  
  let operationId = 1;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const baseDate = new Date(CONFIG.year, CONFIG.month - 1, day);
    const dayOfWeek = baseDate.getDay();
    const dayMultiplier = getDayOfWeekMultiplier(dayOfWeek);
    
    // Количество операций в день с учетом дня недели
    const dailyOperations = Math.floor(operationsPerDay * dayMultiplier * (0.8 + Math.random() * 0.4));
    
    for (let op = 0; op < dailyOperations && operationId <= CONFIG.totalOperations; op++) {
      // Выбираем час с учетом популярности времени
      const hour = Math.floor(Math.random() * 24);
      const hourMultiplier = getHourlyMultiplier(hour);
      
      // Пропускаем некоторые операции в непопулярные часы
      if (Math.random() > hourMultiplier / 2.5) continue;
      
      const operationTime = new Date(baseDate);
      operationTime.setHours(hour, Math.floor(Math.random() * 60));
      
      // Выбираем станцию с учетом ее активности
      const station = STATIONS[Math.floor(Math.random() * STATIONS.length)];
      if (Math.random() > station.baseActivity) continue;
      
      const operation = generateOperation(operationId, operationTime, station.id);
      operations.push(operation);
      
      operationId++;
    }
  }
  
  return operations.slice(0, CONFIG.totalOperations);
}

// Расчет статистики
function calculateStatistics(operations) {
  const stats = {
    totalRevenue: 0,
    totalVolume: 0,
    operationsByType: {},
    operationsByStatus: {},
    fuelTypeDistribution: {},
    paymentMethodDistribution: {},
    stationActivity: {},
    hourlyDistribution: Array(24).fill(0),
    weeklyPattern: {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    }
  };

  const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  operations.forEach(op => {
    // Доходы и объемы
    if (op.operationType === 'sale' && op.status === 'completed') {
      stats.totalRevenue += op.totalCost || 0;
      stats.totalVolume += op.quantity || 0;
    }

    // Подсчет по типам
    stats.operationsByType[op.operationType] = (stats.operationsByType[op.operationType] || 0) + 1;
    stats.operationsByStatus[op.status] = (stats.operationsByStatus[op.status] || 0) + 1;
    
    if (op.fuelType) {
      stats.fuelTypeDistribution[op.fuelType] = (stats.fuelTypeDistribution[op.fuelType] || 0) + 1;
    }
    
    if (op.paymentMethod) {
      stats.paymentMethodDistribution[op.paymentMethod] = (stats.paymentMethodDistribution[op.paymentMethod] || 0) + 1;
    }

    stats.stationActivity[op.tradingPointId] = (stats.stationActivity[op.tradingPointId] || 0) + 1;

    // Временное распределение
    const startTime = new Date(op.startTime);
    const hour = startTime.getHours();
    const dayOfWeek = startTime.getDay();
    
    stats.hourlyDistribution[hour]++;
    stats.weeklyPattern[weekDays[dayOfWeek]]++;
  });

  // Округление финансовых показателей
  stats.totalRevenue = Math.round(stats.totalRevenue * 100) / 100;
  stats.totalVolume = Math.round(stats.totalVolume * 10) / 10;

  return stats;
}

// Основная функция генерации
function generateAugustDemoData() {
  console.log('🚀 Начинаем генерацию демо данных за август 2025...');
  
  const operations = generateAllOperations();
  console.log(`📊 Сгенерировано ${operations.length} операций`);
  
  // Сортировка операций по времени
  operations.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  const statistics = calculateStatistics(operations);
  console.log(`💰 Общий доход: ${statistics.totalRevenue.toLocaleString('ru-RU')} руб.`);
  console.log(`⛽ Общий объем: ${statistics.totalVolume.toLocaleString('ru-RU')} л.`);
  
  const result = {
    metadata: {
      description: "Демо данные операций и транзакций сети АЗС за август 2025 года",
      period: "2025-08",
      totalOperations: operations.length,
      dataGenerated: new Date().toISOString(),
      stations: STATIONS.map(s => ({ id: s.id, name: s.name, number: s.number })),
      fuelTypes: Object.keys(FUEL_TYPES),
      avgDailyOperations: Math.round(operations.length / 31),
      peakHours: [7, 8, 9, 17, 18, 19, 20],
      patterns: {
        weekdays: "Повышенная активность в утренние и вечерние часы",
        weekends: "Равномерное распределение с пиком в дневные часы",
        seasonal: "Август - период отпусков, увеличенное потребление ДТ для дальних поездок"
      }
    },
    operations,
    statistics,
    configuration: {
      autoUpdate: true,
      backupEnabled: true,
      compressionLevel: 5,
      retentionDays: 90,
      exportFormats: ["json", "csv", "excel"],
      databaseRestoration: {
        tables: ["operations", "transactions", "fuel_movements", "inventory"],
        constraints: true,
        triggers: true,
        indexes: true
      }
    }
  };

  return result;
}

// Сохранение в файл
function saveToFile(data, filename) {
  const outputPath = path.join(__dirname, filename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Данные сохранены в: ${outputPath}`);
  console.log(`📁 Размер файла: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

// Запуск генерации
if (import.meta.url.includes('generate-august-demo.js') && process.argv.length > 1) {
  try {
    const demoData = generateAugustDemoData();
    saveToFile(demoData, 'august-2025-demo-data.json');
    
    console.log('\n✅ Генерация завершена успешно!');
    console.log('\nСтатистика:');
    console.log(`- Всего операций: ${demoData.operations.length}`);
    console.log(`- Продажи: ${demoData.statistics.operationsByType.sale || 0}`);
    console.log(`- Обслуживание: ${demoData.statistics.operationsByType.maintenance || 0}`);
    console.log(`- Инвентаризация: ${demoData.statistics.operationsByType.inventory || 0}`);
    console.log(`- Поставки топлива: ${demoData.statistics.operationsByType.refuel_truck || 0}`);
    console.log(`- Общий доход: ${demoData.statistics.totalRevenue.toLocaleString('ru-RU')} руб.`);
    console.log(`- Общий объем топлива: ${demoData.statistics.totalVolume.toLocaleString('ru-RU')} л.`);
    
  } catch (error) {
    console.error('❌ Ошибка при генерации данных:', error);
    process.exit(1);
  }
}

export { generateAugustDemoData, saveToFile };