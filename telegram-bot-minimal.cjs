#!/usr/bin/env node

/**
 * Минимальная версия Telegram бота для тестирования
 */

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Конфигурация
const BOT_TOKEN = '8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs';
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

console.log('🤖 Запуск минимального Telegram бота...');

// Создание клиентов
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Проверка подключения
supabase
  .from('users')
  .select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Ошибка Supabase:', error.message);
    } else {
      console.log(`✅ Supabase работает. Пользователей: ${count}`);
    }
  });

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🤖 TradeFrame Bot готов к работе!

📋 Отправьте код верификации из веб-интерфейса
🔑 Формат: TF****

Chat ID: ${chatId}
  `);
});

// Обработка кодов верификации
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const text = msg.text.trim().toUpperCase();
    
    console.log(`💬 Получен текст: ${text} от ${chatId}`);
    
    if (/^TF[A-Z0-9]{4,6}$/.test(text)) {
      try {
        bot.sendMessage(chatId, '🔍 Проверяю код...');
        
        const { data: result, error } = await supabase
          .rpc('verify_telegram_code', {
            p_verification_code: text,
            p_chat_id: chatId.toString()
          });
        
        if (error) {
          bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
          return;
        }
        
        if (result?.success) {
          bot.sendMessage(chatId, `✅ Успех! Привязан к ${result.user.name} (${result.user.email})`);
        } else {
          bot.sendMessage(chatId, `❌ ${result?.error || 'Неизвестная ошибка'}`);
        }
        
      } catch (err) {
        bot.sendMessage(chatId, `❌ Критическая ошибка: ${err.message}`);
      }
    } else {
      bot.sendMessage(chatId, `❓ Неверный формат. Ожидаю TF****`);
    }
  }
});

// Информация о боте
bot.getMe().then((info) => {
  console.log(`✅ Бот запущен: @${info.username} (ID: ${info.id})`);
}).catch((err) => {
  console.error('❌ Ошибка бота:', err.message);
});

console.log('🎯 Ожидаю сообщения...');