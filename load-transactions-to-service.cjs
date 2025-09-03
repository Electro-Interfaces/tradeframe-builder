const fs = require('fs');

console.log('🔄 Загружаем 250 транзакций в operationsService.ts...');

// Читаем данные транзакций
const transactionsData = JSON.parse(fs.readFileSync('demo-250-transactions.json', 'utf8'));

// Конвертируем данные в строковый формат для TypeScript
const operationsString = JSON.stringify(transactionsData, null, 2)
  .replace(/"createdAt": "([^"]*)",/g, 'createdAt: new Date("$1"),')
  .replace(/"updatedAt": "([^"]*)",/g, 'updatedAt: new Date("$1"),')
  .replace(/"([^"]*)":/g, '$1:') // убираем кавычки с ключей
  .replace(/: "([^"]*)",/g, ': "$1",'); // оставляем кавычки в строковых значениях

// Читаем текущий файл operationsService.ts
let serviceContent = fs.readFileSync('./src/services/operationsService.ts', 'utf8');

// Заменяем initialOperations на новые данные
serviceContent = serviceContent.replace(
  /\/\/ Демо данные 250 операций для сети АЗС \(август 2025\)\nconst initialOperations: Operation\[\] = \[\];/,
  `// Демо данные 250 операций для сети АЗС (август 2025)\nconst initialOperations: Operation[] = ${operationsString.slice(0, -1)}];`
);

// Сохраняем обновленный файл
fs.writeFileSync('./src/services/operationsService.ts', serviceContent);

console.log('✅ Успешно загружено', transactionsData.length, 'транзакций в operationsService.ts');
console.log('📊 Статистика по статусам:');
const statusStats = {};
transactionsData.forEach(t => {
  statusStats[t.status] = (statusStats[t.status] || 0) + 1;
});
console.log(statusStats);