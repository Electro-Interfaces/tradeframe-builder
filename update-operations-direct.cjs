const fs = require('fs');

// Загружаем новые данные операций
const operations = require('./realistic-operations-august-2025.json');

// Читаем текущий файл operationsService.ts
let serviceContent = fs.readFileSync('./src/services/operationsService.ts', 'utf8');

// Находим начало и конец массива initialOperations
const startPattern = 'const initialOperations: Operation[] = [';
const endPattern = '];';

const startIndex = serviceContent.indexOf(startPattern);
if (startIndex === -1) {
  console.error('Не найден массив initialOperations');
  process.exit(1);
}

// Ищем закрывающую скобку после startIndex
const searchStart = startIndex + startPattern.length;
let bracketCount = 1;
let endIndex = searchStart;

while (bracketCount > 0 && endIndex < serviceContent.length) {
  if (serviceContent[endIndex] === '[') bracketCount++;
  if (serviceContent[endIndex] === ']') bracketCount--;
  endIndex++;
}

if (bracketCount > 0) {
  console.error('Не найден конец массива initialOperations');
  process.exit(1);
}

console.log(`📊 Замена данных операций...`);
console.log(`🔄 Загружено операций: ${operations.length}`);

// Создаем строку с новыми операциями
const operationsString = JSON.stringify(operations, null, 2);

// Заменяем содержимое между скобками
const beforeArray = serviceContent.substring(0, startIndex + startPattern.length);
const afterArray = serviceContent.substring(endIndex);

const newContent = beforeArray + '\n' + operationsString + '\n' + afterArray.substring(1); // убираем первую ']'

// Записываем обновленный файл
fs.writeFileSync('./src/services/operationsService.ts', newContent);

console.log(`✅ Файл operationsService.ts успешно обновлен!`);
console.log(`📊 Статистика операций:`);

// Считаем статистику
const stats = {
  byStatus: {},
  byFuelType: {},
  byPaymentMethod: {}
};

operations.forEach(op => {
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
  if (op.fuelType) stats.byFuelType[op.fuelType] = (stats.byFuelType[op.fuelType] || 0) + 1;
  if (op.paymentMethod) stats.byPaymentMethod[op.paymentMethod] = (stats.byPaymentMethod[op.paymentMethod] || 0) + 1;
});

console.log('По статусам:', stats.byStatus);
console.log('По топливу:', stats.byFuelType);
console.log('По оплате:', stats.byPaymentMethod);

// Проверяем процентное соотношение статусов
const total = operations.length;
Object.entries(stats.byStatus).forEach(([status, count]) => {
  const percentage = ((count / total) * 100).toFixed(1);
  console.log(`${status}: ${count} (${percentage}%)`);
});