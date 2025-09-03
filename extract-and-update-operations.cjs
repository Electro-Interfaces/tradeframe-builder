const fs = require('fs');

// Читаем оригинальный файл
console.log('📥 Читаем оригинальный operationsService.ts...');
const originalContent = fs.readFileSync('original-operations-service.ts', 'utf8');

// Ищем и извлекаем массив операций
const startPattern = 'const initialOperations: Operation[] = [';
const startIndex = originalContent.indexOf(startPattern);

if (startIndex === -1) {
  console.error('❌ Не найден массив initialOperations в оригинальном файле');
  process.exit(1);
}

// Найти конец массива
const searchStart = startIndex + startPattern.length;
let bracketCount = 1;
let endIndex = searchStart;

while (bracketCount > 0 && endIndex < originalContent.length) {
  if (originalContent[endIndex] === '[') bracketCount++;
  if (originalContent[endIndex] === ']') bracketCount--;
  endIndex++;
}

// Извлекаем операции
const operationsJsonText = originalContent.substring(searchStart, endIndex - 1).trim();
console.log('🔍 Извлекли JSON операций, размер:', operationsJsonText.length, 'символов');

// Парсим операции
let operations;
try {
  operations = JSON.parse(operationsJsonText);
  console.log('✅ Успешно парсили операции:', operations.length);
} catch (error) {
  console.error('❌ Ошибка парсинга операций:', error.message);
  // Попробуем сохранить в файл для отладки
  fs.writeFileSync('debug-operations.json', operationsJsonText);
  console.log('💾 Сохранили JSON для отладки в debug-operations.json');
  process.exit(1);
}

// Применяем распределение статусов
console.log('🔄 Применяем распределение статусов...');

// Сначала убеждаемся что все операции имеют статус completed
operations.forEach(op => {
  if (!op.status) op.status = 'completed';
});

// Ошибка - 2%
const errorCount = Math.max(1, Math.floor(operations.length * 0.02));
console.log(`🔴 Устанавливаем статус "failed" для ${errorCount} операций`);
const errorIndexes = [];
while (errorIndexes.length < errorCount) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (!errorIndexes.includes(randomIndex)) {
    errorIndexes.push(randomIndex);
    operations[randomIndex].status = 'failed';
    if (!operations[randomIndex].details.includes('Ошибка')) {
      operations[randomIndex].details += ' - Ошибка оплаты';
    }
  }
}

// Ожидание - 2%
const pendingCount = Math.max(1, Math.floor(operations.length * 0.02));
console.log(`🟡 Устанавливаем статус "pending" для ${pendingCount} операций`);
const pendingIndexes = [];
while (pendingIndexes.length < pendingCount) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (!errorIndexes.includes(randomIndex) && !pendingIndexes.includes(randomIndex)) {
    pendingIndexes.push(randomIndex);
    operations[randomIndex].status = 'pending';
    if (!operations[randomIndex].details.includes('Ожидает')) {
      operations[randomIndex].details += ' - Ожидает подтверждения';
    }
    operations[randomIndex].progress = 10 + Math.floor(Math.random() * 20);
  }
}

// Выполняется - 3%
const inProgressCount = Math.max(1, Math.floor(operations.length * 0.03));
console.log(`🔵 Устанавливаем статус "in_progress" для ${inProgressCount} операций`);
const inProgressIndexes = [];
while (inProgressIndexes.length < inProgressCount) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (!errorIndexes.includes(randomIndex) && 
      !pendingIndexes.includes(randomIndex) && 
      !inProgressIndexes.includes(randomIndex)) {
    inProgressIndexes.push(randomIndex);
    operations[randomIndex].status = 'in_progress';
    operations[randomIndex].progress = 50 + Math.floor(Math.random() * 40);
  }
}

// Статистика
const stats = { byStatus: {} };
operations.forEach(op => {
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
});

console.log('📊 Итоговое распределение статусов:');
const total = operations.length;
Object.entries(stats.byStatus).forEach(([status, count]) => {
  const percentage = ((count / total) * 100).toFixed(1);
  console.log(`   ${status}: ${count} (${percentage}%)`);
});

// Обновляем текущий operationsService.ts
console.log('💾 Обновляем operationsService.ts...');
let currentContent = fs.readFileSync('./src/services/operationsService.ts', 'utf8');

const currentStartIndex = currentContent.indexOf(startPattern);
if (currentStartIndex === -1) {
  console.error('❌ Не найден массив initialOperations в текущем файле');
  process.exit(1);
}

const currentSearchStart = currentStartIndex + startPattern.length;
let currentBracketCount = 1;
let currentEndIndex = currentSearchStart;

while (currentBracketCount > 0 && currentEndIndex < currentContent.length) {
  if (currentContent[currentEndIndex] === '[') currentBracketCount++;
  if (currentContent[currentEndIndex] === ']') currentBracketCount--;
  currentEndIndex++;
}

const beforeArray = currentContent.substring(0, currentStartIndex + startPattern.length);
const afterArray = currentContent.substring(currentEndIndex);
const operationsString = JSON.stringify(operations, null, 2);

const newContent = beforeArray + '\n' + operationsString + '\n' + afterArray.substring(1);

fs.writeFileSync('./src/services/operationsService.ts', newContent);

console.log('✅ Операции успешно восстановлены и обновлены!');
console.log(`📊 Восстановлено операций: ${operations.length}`);
console.log('🔄 Для применения изменений нажмите "Загрузить данные" в интерфейсе');

// Удаляем временный файл
fs.unlinkSync('original-operations-service.ts');