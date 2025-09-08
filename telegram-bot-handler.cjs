#!/usr/bin/env node

/**
 * Telegram Bot обработчик для системы TradeFrame
 * Обрабатывает команды верификации пользователей
 * 
 * Требования:
 * - Node.js 16+
 * - npm install node-telegram-bot-api pg
 * - Переменные окружения: BOT_TOKEN, DATABASE_URL
 */

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// Конфигурация бота - используем ваш токен
const BOT_TOKEN = process.env.BOT_TOKEN || '8162072057:AAGGbs9LH9kGSwauKh4B0LsbJY3xvX-tNOs';
const BOT_USERNAME = process.env.BOT_USERNAME || 'tradeframe_integration_bot';

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

console.log('🤖 Telegram Bot TradeFrame запускается...');
console.log('🔑 Bot Token:', BOT_TOKEN.substring(0, 20) + '***');
console.log('👤 Bot Username:', BOT_USERNAME);
console.log('📡 Supabase URL:', supabaseUrl);

// Создание Supabase клиента
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ БОТА И БД
// ============================================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Проверка подключения к Supabase
async function connectDatabase() {
  try {
    console.log('🔍 Проверка подключения к Supabase...');
    
    // Проверяем подключение и наличие таблиц
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (usersError) {
      throw usersError;
    }
    
    const { data: codes, error: codesError } = await supabase
      .from('telegram_verification_codes')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (codesError) {
      throw codesError;
    }
    
    console.log('✅ Подключение к Supabase установлено');
    console.log(`📊 Пользователей в базе: ${users}`);
    console.log(`🔑 Кодов верификации в базе: ${codes}`);
    
  } catch (error) {
    console.error('❌ Ошибка подключения к Supabase:', error);
    process.exit(1);
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Верификация кода и привязка пользователя через Supabase RPC
 */
async function verifyCodeAndLinkUser(verificationCode, chatId, username, firstName, lastName) {
  try {
    console.log(`🔍 Проверка кода: ${verificationCode} для chat_id: ${chatId}`);

    // Используем RPC функцию из Supabase
    const { data: result, error } = await supabase
      .rpc('verify_telegram_code', {
        p_verification_code: verificationCode,
        p_chat_id: chatId.toString()
      });
    
    if (error) {
      console.error('❌ Ошибка RPC верификации:', error);
      return {
        success: false,
        error: `Ошибка базы данных: ${error.message}`,
        errorCode: 'DATABASE_ERROR'
      };
    }
    
    console.log('📊 Результат RPC верификации:', result);
    
    if (result?.success) {
      return {
        success: true,
        user: result.user,
        message: result.message
      };
    } else {
      return {
        success: false,
        error: result?.error || 'Неизвестная ошибка',
        errorCode: result?.error_code || 'UNKNOWN'
      };
    }
    
  } catch (error) {
    console.error('❌ Ошибка верификации кода:', error);
    return {
      success: false,
      error: `Ошибка обработки: ${error.message}`,
      errorCode: 'PROCESSING_ERROR'
    };
  }

/**
 * Логирование события в консоль с временной меткой
 */
function logEvent(type, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type}:`, JSON.stringify(data, null, 2));
}

/**
 * Отправка приветственного сообщения
 */
function sendWelcomeMessage(chatId, username) {
  const welcomeText = 
    `👋 Добро пожаловать в TradeFrame Bot!\n\n` +
    `🤖 Я помогу вам подключить Telegram уведомления к вашему аккаунту.\n\n` +
    `📋 <b>Как подключиться:</b>\n` +
    `1. Войдите в веб-интерфейс TradeFrame\n` +
    `2. Перейдите в Профиль → Интеграции\n` +
    `3. Нажмите "Подключить Telegram"\n` +
    `4. Скопируйте код и отправьте мне: /start ВАШ_КОД\n\n` +
    `💡 <b>Пример:</b> /start TF7K2M\n\n` +
    `❓ Нужна помощь? Обратитесь к администратору системы.`;

  return bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });
}

// ============================================
// ОБРАБОТЧИКИ КОМАНД БОТА
// ============================================

/**
 * Обработка команды /start с кодом верификации
 */
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const username = msg.from.username || '';
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const verificationCode = match[1].trim().toUpperCase();
  
  logEvent('VERIFICATION_ATTEMPT', {
    chatId,
    username,
    firstName,
    lastName,
    verificationCode,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Проверяем формат кода
    if (!/^TF[A-Z0-9]{4,8}$/.test(verificationCode)) {
      await bot.sendMessage(chatId, 
        `❌ <b>Неверный формат кода</b>\n\n` +
        `Код должен быть вида: <code>TF7K2M</code>\n\n` +
        `Получите правильный код в веб-интерфейсе:\n` +
        `👤 Профиль → ⚙️ Интеграции → 🔗 Подключить Telegram`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Верифицируем код
    const result = await verifyCodeAndLinkUser(
      verificationCode, 
      chatId, 
      username, 
      firstName, 
      lastName
    );
    
    if (result.success) {
      // Успешная привязка
      await bot.sendMessage(chatId,
        `✅ <b>Аккаунт успешно привязан!</b>\n\n` +
        `👤 <b>Пользователь:</b> ${result.user.name}\n` +
        `📧 <b>Email:</b> ${result.user.email}\n` +
        `🕐 <b>Время подключения:</b> ${new Date().toLocaleString('ru-RU')}\n\n` +
        `🔔 Теперь вы будете получать уведомления TradeFrame в этом чате.\n\n` +
        `⚙️ Настроить типы уведомлений можно в веб-интерфейсе: Профиль → Предпочтения`,
        { parse_mode: 'HTML' }
      );
      
      logEvent('VERIFICATION_SUCCESS', {
        chatId,
        userId: result.user.id,
        userEmail: result.user.email,
        verificationCode
      });
      
    } else {
      // Ошибка верификации
      let errorMessage = `❌ <b>Ошибка подключения</b>\n\n`;
      
      switch (result.errorCode) {
        case 'INVALID_CODE':
          errorMessage += 
            `Код <code>${verificationCode}</code> неверен или истек.\n\n` +
            `💡 Получите новый код в веб-интерфейсе:\n` +
            `👤 Профиль → ⚙️ Интеграции → 🔗 Подключить Telegram\n\n` +
            `⏱️ Коды действуют 15 минут с момента создания.`;
          break;
          
        case 'CHAT_ID_TAKEN':
          errorMessage += 
            `${result.error}\n\n` +
            `💡 <b>Что делать:</b>\n` +
            `• Если это ваш старый аккаунт - войдите в него и отвяжите Telegram\n` +
            `• Используйте другой Telegram аккаунт\n` +
            `• Обратитесь к администратору системы`;
          break;
          
        default:
          errorMessage += 
            `${result.error || 'Неизвестная ошибка'}\n\n` +
            `🔧 Попробуйте еще раз через несколько минут.\n` +
            `Если проблема повторяется, обратитесь к администратору.`;
      }
      
      await bot.sendMessage(chatId, errorMessage, { parse_mode: 'HTML' });
      
      logEvent('VERIFICATION_FAILED', {
        chatId,
        verificationCode,
        error: result.error,
        errorCode: result.errorCode
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка при обработке /start:', error);
    
    await bot.sendMessage(chatId,
      `❌ <b>Техническая ошибка</b>\n\n` +
      `Произошла непредвиденная ошибка. Обратитесь к администратору системы.\n\n` +
      `🆔 ID ошибки: ${Date.now()}`,
      { parse_mode: 'HTML' }
    );
    
    logEvent('CRITICAL_ERROR', {
      chatId,
      verificationCode,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Обработка команды /start без параметров
 */
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name || 'Пользователь';
  
  logEvent('WELCOME_MESSAGE', {
    chatId,
    username,
    timestamp: new Date().toISOString()
  });
  
  await sendWelcomeMessage(chatId, username);
});

/**
 * Обработка команды /help
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpText = 
    `📖 <b>Справка по TradeFrame Bot</b>\n\n` +
    `🔗 <b>Подключение аккаунта:</b>\n` +
    `1. Войдите в веб-интерфейс TradeFrame\n` +
    `2. Перейдите: Профиль → Интеграции\n` +
    `3. Нажмите "Подключить Telegram"\n` +
    `4. Скопируйте код и отправьте: /start ВАШ_КОД\n\n` +
    `💡 <b>Пример кода:</b> TF7K2M\n\n` +
    `⚙️ <b>Команды бота:</b>\n` +
    `/start КОД - подключить аккаунт\n` +
    `/help - показать эту справку\n` +
    `/status - проверить статус подключения\n\n` +
    `🆘 <b>Поддержка:</b>\n` +
    `Если возникли проблемы, обратитесь к администратору TradeFrame.`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
});

/**
 * Обработка команды /status
 */
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id.toString();
  
  try {
    // Проверяем, привязан ли этот chat_id к какому-либо пользователю
    const userQuery = `
      SELECT id, name, email, telegram_verified_at, telegram_notifications_enabled
      FROM users 
      WHERE telegram_chat_id = $1
    `;
    
    const result = await dbClient.query(userQuery, [chatId]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      await bot.sendMessage(chatId,
        `✅ <b>Аккаунт подключен</b>\n\n` +
        `👤 <b>Пользователь:</b> ${user.name}\n` +
        `📧 <b>Email:</b> ${user.email}\n` +
        `🕐 <b>Подключен:</b> ${new Date(user.telegram_verified_at).toLocaleString('ru-RU')}\n` +
        `🔔 <b>Уведомления:</b> ${user.telegram_notifications_enabled ? 'Включены' : 'Отключены'}\n\n` +
        `⚙️ Управление настройками: Профиль → Интеграции`,
        { parse_mode: 'HTML' }
      );
      
    } else {
      await bot.sendMessage(chatId,
        `❌ <b>Аккаунт не подключен</b>\n\n` +
        `Для подключения:\n` +
        `1. Войдите в веб-интерфейс TradeFrame\n` +
        `2. Перейдите: Профиль → Интеграции\n` +
        `3. Получите код подключения\n` +
        `4. Отправьте мне: /start ВАШ_КОД`,
        { parse_mode: 'HTML' }
      );
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error);
    await bot.sendMessage(chatId,
      `❌ Не удалось проверить статус подключения. Попробуйте позже.`
    );
  }
});

/**
 * Обработка неизвестных команд
 */
bot.on('message', async (msg) => {
  // Игнорируем обработанные команды и не-текстовые сообщения
  if (!msg.text || msg.text.startsWith('/')) {
    return;
  }
  
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId,
    `🤖 Я понимаю только команды.\n\n` +
    `Используйте:\n` +
    `/start КОД - для подключения аккаунта\n` +
    `/help - для получения справки\n` +
    `/status - для проверки статуса`,
    { parse_mode: 'HTML' }
  );
});

// ============================================
// ОБРАБОТКА ОШИБОК И ЗАВЕРШЕНИЕ
// ============================================

/**
 * Обработка ошибок бота
 */
bot.on('error', (error) => {
  console.error('❌ Ошибка Telegram Bot API:', error);
  
  logEvent('BOT_ERROR', {
    error: error.message,
    code: error.code,
    stack: error.stack
  });
});

/**
 * Обработка polling ошибок
 */
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error);
  
  logEvent('POLLING_ERROR', {
    error: error.message,
    code: error.code
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал SIGINT. Завершение работы...');
  
  try {
    await bot.stopPolling();
    await dbClient.end();
    console.log('✅ Бот и соединение с БД корректно закрыты');
  } catch (error) {
    console.error('❌ Ошибка при закрытии соединений:', error);
  } finally {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал SIGTERM. Завершение работы...');
  
  try {
    await bot.stopPolling();
    await dbClient.end();
    console.log('✅ Бот и соединение с БД корректно закрыты');
  } catch (error) {
    console.error('❌ Ошибка при закрытии соединений:', error);
  } finally {
    process.exit(0);
  }
});

// ============================================
// ЗАПУСК БОТА
// ============================================

async function startBot() {
  try {
    console.log('🚀 Запуск TradeFrame Telegram Bot...');
    
    // Подключаемся к базе данных
    await connectDatabase();
    
    // Получаем информацию о боте
    const botInfo = await bot.getMe();
    console.log('🤖 Информация о боте:', {
      id: botInfo.id,
      username: botInfo.username,
      first_name: botInfo.first_name
    });
    
    // Устанавливаем команды для меню
    await bot.setMyCommands([
      { command: 'start', description: 'Подключить аккаунт TradeFrame' },
      { command: 'help', description: 'Показать справку' },
      { command: 'status', description: 'Проверить статус подключения' }
    ]);
    
    console.log('✅ TradeFrame Telegram Bot успешно запущен!');
    console.log(`📱 Бот доступен: @${botInfo.username}`);
    console.log('👂 Ожидание команд пользователей...');
    
    // Периодическая очистка просроченных кодов (каждые 15 минут)
    setInterval(async () => {
      try {
        const result = await dbClient.query(
          'DELETE FROM telegram_verification_codes WHERE expires_at < NOW() AND is_used = false'
        );
        
        if (result.rowCount > 0) {
          console.log(`🧹 Очищено просроченных кодов: ${result.rowCount}`);
        }
      } catch (error) {
        console.error('❌ Ошибка очистки просроченных кодов:', error);
      }
    }, 15 * 60 * 1000); // 15 минут
    
  } catch (error) {
    console.error('❌ Критическая ошибка запуска бота:', error);
    process.exit(1);
  }
}

// Запускаем бота
startBot();

console.log('📋 Конфигурация:');
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует'}`);
console.log(`   BOT_USERNAME: ${BOT_USERNAME}`);
console.log(`   SUPABASE_URL: ${supabaseUrl}`);
console.log('');

// Экспорт для тестирования
module.exports = { bot, supabase, verifyCodeAndLinkUser };