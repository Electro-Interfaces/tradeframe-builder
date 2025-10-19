/**
 * Тестовый скрипт для отправки Telegram уведомления
 * Использование: node test-telegram-notification.js <chat_id>
 */

require('dotenv').config();
const { sendNotification } = require('./telegram-bot');

// Получаем chat_id из аргументов командной строки
const chatId = process.argv[2];

if (!chatId) {
  console.error('❌ Использование: node test-telegram-notification.js <chat_id>');
  console.error('Пример: node test-telegram-notification.js 123456789');
  process.exit(1);
}

// Тестовое уведомление
const testNotification = {
  notification_type: 'bill_acceptor_threshold',
  title: 'Тестовое уведомление',
  message: 'Это тестовое уведомление для проверки интеграции Telegram Bot.\n\n' +
           '🏪 ТТ: АЗС №4 (Центральная)\n' +
           '💰 Купюроприемник заполнен на 85%\n' +
           '⚠️ Рекомендуется инкассация',
  priority: 'high',
  created_at: new Date().toISOString()
};

console.log('📤 Отправка тестового уведомления...');
console.log(`Chat ID: ${chatId}`);
console.log(`Тип: ${testNotification.notification_type}`);
console.log(`Приоритет: ${testNotification.priority}`);

// Инициализация бота
const { initTelegramBot } = require('./telegram-bot');
const bot = initTelegramBot();

if (!bot) {
  console.error('❌ Не удалось инициализировать бота');
  process.exit(1);
}

// Ждём инициализации
setTimeout(async () => {
  try {
    const success = await sendNotification(chatId, testNotification);

    if (success) {
      console.log('✅ Уведомление успешно отправлено!');
      process.exit(0);
    } else {
      console.error('❌ Не удалось отправить уведомление');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}, 2000);
