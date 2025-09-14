/**
 * Скрипт для обновления operationsService.ts с полными августовскими демо данными
 * Заменяет initialOperations массив в файле сервиса
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем конвертированные данные
function loadConvertedOperations() {
  const dataPath = path.join(__dirname, 'august-operations-data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
}

// Создаем JavaScript код для массива операций
function generateOperationsArray(operations) {
  const operationStrings = operations.map(op => {
    const fields = [
      `id: "${op.id}"`,
      `operationType: "${op.operationType}"`,
      `status: "${op.status}"`,
      `startTime: "${op.startTime}"`,
      op.endTime ? `endTime: "${op.endTime}"` : 'endTime: undefined',
      op.duration ? `duration: ${op.duration}` : 'duration: undefined',
      op.tradingPointId ? `tradingPointId: "${op.tradingPointId}"` : 'tradingPointId: undefined',
      op.tradingPointName ? `tradingPointName: "${op.tradingPointName}"` : 'tradingPointName: undefined',
      op.deviceId ? `deviceId: "${op.deviceId}"` : 'deviceId: undefined',
      op.transactionId ? `transactionId: "${op.transactionId}"` : 'transactionId: undefined',
      op.fuelType ? `fuelType: "${op.fuelType}"` : 'fuelType: undefined',
      op.quantity ? `quantity: ${op.quantity}` : 'quantity: undefined',
      op.price ? `price: ${op.price}` : 'price: undefined',
      op.totalCost ? `totalCost: ${op.totalCost}` : 'totalCost: undefined',
      op.paymentMethod ? `paymentMethod: "${op.paymentMethod}"` : 'paymentMethod: undefined',
      `details: "${op.details.replace(/"/g, '\\"')}"`,
      op.progress ? `progress: ${op.progress}` : 'progress: undefined',
      `lastUpdated: "${op.lastUpdated}"`,
      op.operatorName ? `operatorName: "${op.operatorName}"` : 'operatorName: undefined',
      op.customerId ? `customerId: "${op.customerId}"` : 'customerId: undefined',
      op.vehicleNumber ? `vehicleNumber: "${op.vehicleNumber}"` : 'vehicleNumber: undefined',
      'metadata: {}',
      `createdAt: new Date('${typeof op.createdAt === 'string' ? op.createdAt : op.createdAt.toISOString()}')`,
      `updatedAt: new Date('${typeof op.updatedAt === 'string' ? op.updatedAt : op.updatedAt.toISOString()}')`
    ];

    return `  {\n    ${fields.join(',\n    ')}\n  }`;
  });

  return `// Демо данные операций для сети АЗС (август 2025)
// Автоматически сгенерировано из august-2025-demo-data.json
const initialOperations: Operation[] = [
${operationStrings.join(',\n')}
];`;
}

// Обновляем файл операций
function updateOperationsService() {
  console.log('🔄 Загрузка конвертированных операций...');
  
  const operationsData = loadConvertedOperations();
  console.log(`✅ Загружено ${operationsData.operations.length} операций`);
  
  console.log('📝 Генерация кода для operationsService...');
  const newOperationsArray = generateOperationsArray(operationsData.operations);
  
  // Читаем существующий файл сервиса
  const servicePath = path.join(__dirname, 'src', 'services', 'operationsService.ts');
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Ищем начало и конец массива initialOperations
  const startPattern = /\/\/ .*начальные данные.*\nconst initialOperations: Operation\[\] = \[/i;
  const endPattern = /\];\s*\n\n\/\/ Загружаем данные из localStorage/;
  
  const startMatch = serviceContent.search(startPattern);
  const endMatch = serviceContent.search(endPattern);
  
  if (startMatch === -1 || endMatch === -1) {
    // Альтернативный поиск
    const altStartPattern = /const initialOperations: Operation\[\] = \[/;
    const altEndPattern = /\];\s*\n.*\/\/ Загружаем данные из localStorage|\/\/ Загружаем данные из localStorage/;
    
    const altStartMatch = serviceContent.search(altStartPattern);
    const altEndMatch = serviceContent.search(altEndPattern);
    
    if (altStartMatch !== -1 && altEndMatch !== -1) {
      const beforeArray = serviceContent.substring(0, altStartMatch);
      const afterArray = serviceContent.substring(altEndMatch);
      
      const updatedContent = beforeArray + newOperationsArray + '\n\n// Загружаем данные из localStorage' + afterArray.substring(afterArray.indexOf('\nlet operationsData'));
      
      fs.writeFileSync(servicePath, updatedContent);
      console.log('✅ Файл operationsService.ts успешно обновлен!');
      console.log(`📊 Добавлено ${operationsData.operations.length} операций из августа 2025`);
      
    } else {
      console.error('❌ Не удалось найти массив initialOperations в файле');
      console.log('Попробуем создать резервную копию и заменить весь массив');
      
      // Создаем резервную копию
      const backupPath = servicePath + '.backup';
      fs.copyFileSync(servicePath, backupPath);
      console.log(`💾 Создана резервная копия: ${backupPath}`);
      
      // Сохраняем новый массив в отдельный файл для ручной замены
      const newArrayPath = path.join(__dirname, 'new-initial-operations.ts');
      fs.writeFileSync(newArrayPath, newOperationsArray);
      console.log(`📄 Новый массив сохранен в: ${newArrayPath}`);
      console.log('Скопируйте содержимое файла и замените массив initialOperations вручную');
    }
  } else {
    const beforeArray = serviceContent.substring(0, startMatch);
    const afterArray = serviceContent.substring(endMatch);
    
    const updatedContent = beforeArray + newOperationsArray + '\n\n// Загружаем данные из localStorage' + afterArray;
    
    fs.writeFileSync(servicePath, updatedContent);
    console.log('✅ Файл operationsService.ts успешно обновлен!');
    console.log(`📊 Добавлено ${operationsData.operations.length} операций из августа 2025`);
  }
  
  return operationsData;
}

// Очистка localStorage для операций
function clearOperationsCache() {
  const clearScript = `
// Скрипт для очистки кэша операций в localStorage
// Выполните в консоли браузера:
localStorage.removeItem('operations');
console.log('Кэш операций очищен. Перезагрузите страницу.');
`;

  const clearScriptPath = path.join(__dirname, 'clear-operations-cache.js');
  fs.writeFileSync(clearScriptPath, clearScript);
  
  console.log(`🧹 Скрипт очистки кэша сохранен: ${clearScriptPath}`);
  console.log('Выполните его в консоли браузера для очистки старых данных');
}

// Основная функция
async function main() {
  try {
    console.log('🚀 Обновление operationsService с августовскими демо данными...');
    
    const operationsData = updateOperationsService();
    clearOperationsCache();
    
    console.log('\n✅ Обновление завершено!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Откройте консоль браузера в приложении');
    console.log('2. Выполните: localStorage.removeItem("operations")');
    console.log('3. Перезагрузите страницу');
    console.log('4. Перейдите в раздел "Операции" для просмотра новых данных');
    
    console.log('\n📊 Статистика новых данных:');
    console.log(`- Всего операций: ${operationsData.operations.length}`);
    console.log(`- Период: август 2025`);
    
    const typeStats = operationsData.operations.reduce((acc, op) => {
      acc[op.operationType] = (acc[op.operationType] || 0) + 1;
      return acc;
    }, {});
    
    console.log('- По типам операций:');
    Object.entries(typeStats).forEach(([type, count]) => {
      const typeNames = {
        'sale': 'Продажи',
        'maintenance': 'Обслуживание', 
        'sensor_calibration': 'Калибровка датчиков',
        'fuel_loading': 'Загрузка топлива'
      };
      console.log(`  • ${typeNames[type] || type}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления:', error);
    process.exit(1);
  }
}

// Запуск
if (import.meta.url.includes('update-operations-service.js')) {
  main();
}

export { updateOperationsService };