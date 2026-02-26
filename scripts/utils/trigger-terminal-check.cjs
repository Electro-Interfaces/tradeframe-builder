/**
 * Ручной запуск проверки работы терминала
 */

require('dotenv').config({ path: './server/.env' });

// Используем динамический import для ES модулей
async function runCheck() {
  try {
    console.log('🔍 Запуск проверки работы терминала...\n');

    // Импортируем notificationEngine
    const notificationEngine = require('./server/services/notificationEngine.js');

    // Запускаем проверку всех правил (включая terminal_offline)
    const result = await notificationEngine.processAllRules();

    console.log('\n✅ Проверка завершена');
    console.log('Результат:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

runCheck()
  .then(() => {
    console.log('\n✅ Готово');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
