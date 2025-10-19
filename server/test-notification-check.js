/**
 * Тестовый скрипт для ручной проверки правил уведомлений
 * Запуск: node server/test-notification-check.js
 */

require('dotenv').config();
const notificationEngine = require('./services/notificationEngine');

async function testNotificationCheck() {
  console.log('🧪 Тестирование проверки правил уведомлений...\n');

  try {
    const result = await notificationEngine.processAllRules();

    console.log('\n✅ Результат:');
    console.log(`   Обработано правил: ${result.processedRules}`);
    console.log(`   Успешно: ${result.success ? 'Да' : 'Нет'}`);

    if (result.error) {
      console.log(`   Ошибка: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ Ошибка при проверке:', error);
  }
}

testNotificationCheck().catch(console.error);
