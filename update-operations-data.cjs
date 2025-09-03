// Скрипт для замены данных в operationsService.ts
const fs = require('fs');
const path = require('path');

// Читаем новые данные
const newOperations = JSON.parse(fs.readFileSync('realistic-operations-august-2025.json', 'utf8'));

console.log(`Загружено новых операций: ${newOperations.length}`);

// Читаем текущий operationsService.ts
const operationsServicePath = path.join('src', 'services', 'operationsService.ts');
let content = fs.readFileSync(operationsServicePath, 'utf8');

// Находим начало и конец массива initialOperations
const startMarker = 'const initialOperations: Operation[] = [';
const endMarker = '];';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  throw new Error('Не найден маркер начала initialOperations');
}

// Находим соответствующую закрывающую скобку
let bracketCount = 0;
let endIndex = -1;
let foundStart = false;

for (let i = startIndex; i < content.length; i++) {
  const char = content[i];
  
  if (char === '[') {
    if (!foundStart) {
      foundStart = true;
    }
    bracketCount++;
  } else if (char === ']') {
    bracketCount--;
    if (bracketCount === 0 && foundStart) {
      endIndex = i;
      break;
    }
  }
}

if (endIndex === -1) {
  throw new Error('Не найден конец массива initialOperations');
}

// Формируем новый код массива
const newArrayCode = `const initialOperations: Operation[] = ${JSON.stringify(newOperations, null, 2)}`;

// Заменяем старый массив на новый
const beforeArray = content.substring(0, startIndex);
const afterArray = content.substring(endIndex + 2); // +2 для '];'

const newContent = beforeArray + newArrayCode + ';\n' + afterArray;

// Сохраняем обновленный файл
fs.writeFileSync(operationsServicePath, newContent, 'utf8');

console.log('✅ operationsService.ts обновлен с новыми данными!');
console.log(`📊 Статистика:`);

// Подсчитываем статистику
const stats = {
  total: newOperations.length,
  byFuelType: {},
  byPaymentMethod: {},
  byStatus: {}
};

newOperations.forEach(op => {
  // По типу топлива
  if (op.fuelType) {
    stats.byFuelType[op.fuelType] = (stats.byFuelType[op.fuelType] || 0) + 1;
  }
  
  // По способу оплаты
  if (op.paymentMethod) {
    stats.byPaymentMethod[op.paymentMethod] = (stats.byPaymentMethod[op.paymentMethod] || 0) + 1;
  }
  
  // По статусу
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
});

console.log(`Всего операций: ${stats.total}`);
console.log(`По видам топлива:`, stats.byFuelType);
console.log(`По способам оплаты:`, stats.byPaymentMethod);
console.log(`По статусам:`, stats.byStatus);