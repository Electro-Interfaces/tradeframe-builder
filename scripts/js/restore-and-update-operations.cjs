const { execSync } = require('child_process');
const fs = require('fs');

// Восстанавливаем файл из предыдущего коммита
console.log('📥 Восстанавливаем операции из предыдущего коммита...');
const originalContent = execSync('git show 674b815:src/services/operationsService.ts', { encoding: 'utf8' });

// Извлекаем массив операций из оригинального файла
const startPattern = 'const initialOperations: Operation[] = [';
const endPattern = '];';

const startIndex = originalContent.indexOf(startPattern);
const searchStart = startIndex + startPattern.length;
let bracketCount = 1;
let endIndex = searchStart;

while (bracketCount > 0 && endIndex < originalContent.length) {
  if (originalContent[endIndex] === '[') bracketCount++;
  if (originalContent[endIndex] === ']') bracketCount--;
  endIndex++;
}

// Извлекаем JSON с операциями
const operationsJson = originalContent.substring(searchStart, endIndex - 1);
const operations = JSON.parse(operationsJson);

console.log(`✅ Восстановлено операций: ${operations.length}`);

// Применяем новое распределение статусов
// Ошибка - 2%
const errorOperations = Math.floor(operations.length * 0.02);
console.log(`🔴 Устанавливаем статус "failed" для ${errorOperations} операций (2%)`);
for (let i = 0; i < errorOperations; i++) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  operations[randomIndex].status = 'failed';
  operations[randomIndex].details += ' - Ошибка оплаты';
}

// Ожидание - 2%  
const pendingOperations = Math.floor(operations.length * 0.02);
console.log(`🟡 Устанавливаем статус "pending" для ${pendingOperations} операций (2%)`);
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
console.log(`🔵 Устанавливаем статус "in_progress" для ${inProgressOperations} операций (3%)`);
for (let i = 0; i < inProgressOperations; i++) {
  const randomIndex = Math.floor(Math.random() * operations.length);
  if (operations[randomIndex].status === 'completed') { // Избегаем перезаписи failed/pending
    operations[randomIndex].status = 'in_progress';
    operations[randomIndex].progress = 50 + Math.floor(Math.random() * 40);
  }
}

// Считаем итоговую статистику
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

// Восстанавливаем файл operationsService.ts с обновленными операциями
console.log('💾 Обновляем operationsService.ts...');

// Читаем текущий файл
let serviceContent = fs.readFileSync('./src/services/operationsService.ts', 'utf8');

// Находим и заменяем массив операций
const currentStartIndex = serviceContent.indexOf(startPattern);
const currentSearchStart = currentStartIndex + startPattern.length;
let currentBracketCount = 1;
let currentEndIndex = currentSearchStart;

while (currentBracketCount > 0 && currentEndIndex < serviceContent.length) {
  if (serviceContent[currentEndIndex] === '[') currentBracketCount++;
  if (serviceContent[currentEndIndex] === ']') currentBracketCount--;
  currentEndIndex++;
}

const beforeArray = serviceContent.substring(0, currentStartIndex + startPattern.length);
const afterArray = serviceContent.substring(currentEndIndex);
const operationsString = JSON.stringify(operations, null, 2);

const newContent = beforeArray + '\n' + operationsString + '\n' + afterArray.substring(1);

fs.writeFileSync('./src/services/operationsService.ts', newContent);

console.log('✅ Операции успешно восстановлены и обновлены!');
console.log(`📋 Всего операций: ${operations.length}`);
console.log('🔄 Для применения изменений нажмите "Загрузить данные" в интерфейсе');