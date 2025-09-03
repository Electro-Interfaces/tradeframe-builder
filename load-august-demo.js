/**
 * Скрипт для загрузки августовских демо данных в operationsService
 * Преобразует данные в нужный формат и заменяет в localStorage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загрузка демо данных
function loadAugustDemoData() {
  const demoDataPath = path.join(__dirname, 'august-2025-demo-data.json');
  
  if (!fs.existsSync(demoDataPath)) {
    throw new Error(`Файл с демо данными не найден: ${demoDataPath}`);
  }

  const rawData = fs.readFileSync(demoDataPath, 'utf8');
  return JSON.parse(rawData);
}

// Преобразование операций в формат operationsService
function convertToOperationsFormat(demoData) {
  return demoData.operations.map(op => {
    // Маппинг типов операций
    const operationTypeMap = {
      'sale': 'sale',
      'maintenance': 'maintenance', 
      'inventory': 'sensor_calibration', // Инвентаризация как калибровка датчиков
      'refuel_truck': 'fuel_loading'     // Поставка топлива как загрузка топлива
    };

    return {
      id: op.id,
      operationType: operationTypeMap[op.operationType] || op.operationType,
      status: op.status,
      startTime: op.startTime,
      endTime: op.endTime,
      duration: op.duration ? Math.floor(op.duration / 60) : undefined, // Переводим секунды в минуты
      tradingPointId: op.tradingPointId,
      tradingPointName: op.tradingPointName,
      deviceId: op.deviceId,
      transactionId: op.transactionId,
      fuelType: op.fuelType,
      quantity: op.quantity,
      price: op.price,
      totalCost: op.totalCost,
      paymentMethod: op.paymentMethod,
      details: op.details,
      progress: op.progress,
      lastUpdated: op.lastUpdated,
      operatorName: op.operatorName,
      customerId: op.customerId,
      vehicleNumber: op.vehicleNumber,
      metadata: {},
      createdAt: new Date(op.createdAt || op.startTime),
      updatedAt: new Date(op.updatedAt || op.lastUpdated || op.startTime)
    };
  });
}

// Создание файла с данными для операций
function generateOperationsData() {
  console.log('🔄 Загрузка августовских демо данных...');
  
  try {
    const demoData = loadAugustDemoData();
    console.log(`✅ Загружено ${demoData.operations.length} операций`);
    
    const convertedOperations = convertToOperationsFormat(demoData);
    console.log(`✅ Конвертировано ${convertedOperations.length} операций в формат operationsService`);
    
    // Статистика по типам операций
    const typeStats = convertedOperations.reduce((acc, op) => {
      acc[op.operationType] = (acc[op.operationType] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Статистика по типам операций:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Статистика по статусам
    const statusStats = convertedOperations.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Статистика по статусам:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    // Создание файла для замены в operationsService
    const operationsServiceData = {
      operations: convertedOperations,
      metadata: demoData.metadata,
      statistics: demoData.statistics,
      lastUpdated: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, 'august-operations-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(operationsServiceData, null, 2));
    console.log(`💾 Данные сохранены в: ${outputPath}`);
    
    return operationsServiceData;
    
  } catch (error) {
    console.error('❌ Ошибка обработки данных:', error.message);
    throw error;
  }
}

// Создание кода для вставки в operationsService.ts
function generateOperationsServiceCode(operationsData) {
  const operations = operationsData.operations;
  
  const operationsCode = operations.slice(0, 50).map(op => { // Берем первые 50 для демо
    const createdAt = typeof op.createdAt === 'string' ? op.createdAt : op.createdAt.toISOString();
    const updatedAt = typeof op.updatedAt === 'string' ? op.updatedAt : op.updatedAt.toISOString();
    
    return `  {
    id: "${op.id}",
    operationType: "${op.operationType}",
    status: "${op.status}",
    startTime: "${op.startTime}",
    endTime: ${op.endTime ? `"${op.endTime}"` : 'undefined'},
    duration: ${op.duration || 'undefined'},
    tradingPointId: "${op.tradingPointId}",
    tradingPointName: "${op.tradingPointName}",
    deviceId: ${op.deviceId ? `"${op.deviceId}"` : 'undefined'},
    transactionId: ${op.transactionId ? `"${op.transactionId}"` : 'undefined'},
    fuelType: ${op.fuelType ? `"${op.fuelType}"` : 'undefined'},
    quantity: ${op.quantity || 'undefined'},
    price: ${op.price || 'undefined'},
    totalCost: ${op.totalCost || 'undefined'},
    paymentMethod: ${op.paymentMethod ? `"${op.paymentMethod}"` : 'undefined'},
    details: "${op.details.replace(/"/g, '\\"')}",
    progress: ${op.progress || 'undefined'},
    lastUpdated: "${op.lastUpdated}",
    operatorName: ${op.operatorName ? `"${op.operatorName}"` : 'undefined'},
    customerId: ${op.customerId ? `"${op.customerId}"` : 'undefined'},
    vehicleNumber: ${op.vehicleNumber ? `"${op.vehicleNumber}"` : 'undefined'},
    createdAt: new Date('${createdAt}'),
    updatedAt: new Date('${updatedAt}')
  }`;
  }).join(',\n');

  const fullCode = `// Демо данные операций для сети АЗС (август 2025)
// Автоматически сгенерировано из august-2025-demo-data.json
const initialOperations: Operation[] = [
${operationsCode}
];`;

  const codeOutputPath = path.join(__dirname, 'operations-service-data.ts');
  fs.writeFileSync(codeOutputPath, fullCode);
  console.log(`💾 Код для operationsService сохранен в: ${codeOutputPath}`);
  
  return fullCode;
}

// Основная функция
async function main() {
  try {
    console.log('🚀 Генерация данных для operationsService...');
    
    const operationsData = generateOperationsData();
    const serviceCode = generateOperationsServiceCode(operationsData);
    
    console.log('\n✅ Готово! Следующие шаги:');
    console.log('1. Скопируйте содержимое operations-service-data.ts');
    console.log('2. Замените массив initialOperations в src/services/operationsService.ts');
    console.log('3. Перезапустите приложение для применения изменений');
    console.log('\n📊 Итоговая статистика:');
    console.log(`- Всего операций: ${operationsData.operations.length}`);
    console.log(`- Период: август 2025`);
    console.log(`- Станций: ${operationsData.metadata.stations.length}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск если вызывается напрямую
if (import.meta.url.includes('load-august-demo.js')) {
  main();
}

export { loadAugustDemoData, convertToOperationsFormat, generateOperationsData };