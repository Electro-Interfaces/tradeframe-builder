/**
 * Telegram Bot для TradeFrame Builder
 * Использует polling для получения обновлений
 */

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Telegram Bot] Missing Supabase configuration');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Глобальный экземпляр бота
let bot = null;

/**
 * Инициализация Telegram бота
 */
function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const botName = process.env.TELEGRAM_BOT_NAME || 'TradeFrame Notifications';

  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('[Telegram Bot] Bot token not configured. Set TELEGRAM_BOT_TOKEN in .env');
    return null;
  }

  if (!supabase) {
    console.error('[Telegram Bot] Supabase not configured. Bot cannot function without database access.');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });

    bot.on('polling_error', (error) => {
      console.error('[Telegram Bot] Polling error:', error.message);
    });

    console.log(`[Telegram Bot] Initialized successfully: ${botName}`);
    console.log('[Telegram Bot] Polling started');

    setupBotHandlers();

    return bot;
  } catch (error) {
    console.error('[Telegram Bot] Failed to initialize:', error.message);
    return null;
  }
}

/**
 * Настройка обработчиков команд бота
 */
function setupBotHandlers() {
  if (!bot) return;

  // Обработчик команды /start
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1]?.trim();

    console.log(`[Telegram Bot] /start received from chat ${chatId}, code: ${code || 'none'}`);

    if (!code) {
      // Без кода - просто приветствие
      await bot.sendMessage(
        chatId,
        `👋 Добро пожаловать в *${process.env.TELEGRAM_BOT_NAME || 'TradeFrame Notifications'}*!\n\n` +
        `Этот бот предназначен для отправки уведомлений о событиях в системе TradeFrame Builder.\n\n` +
        `Чтобы привязать свой аккаунт:\n` +
        `1. Войдите в TradeFrame Builder\n` +
        `2. Перейдите в Настройки → Уведомления\n` +
        `3. Нажмите "Привязать Telegram"\n` +
        `4. Откройте полученную ссылку`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Есть код - обрабатываем привязку
    await handleAccountLinking(chatId, code, msg.from);
  });

  // Обработчик команды /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(
      chatId,
      `📖 *Помощь по боту*\n\n` +
      `*Доступные команды:*\n` +
      `/start - Начать работу с ботом\n` +
      `/help - Показать эту справку\n` +
      `/status - Проверить статус привязки\n` +
      `/unlink - Отвязать аккаунт\n\n` +
      `*Типы уведомлений:*\n` +
      `🔴 Критические - требуют немедленного внимания\n` +
      `🟠 Высокие - важные события\n` +
      `🟡 Средние - информационные\n` +
      `🔵 Низкие - общие уведомления`,
      { parse_mode: 'Markdown' }
    );
  });

  // Обработчик команды /status
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    await handleStatusCheck(chatId);
  });

  // Обработчик команды /unlink
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;
    await handleUnlink(chatId);
  });
}

/**
 * Обработка привязки аккаунта
 */
async function handleAccountLinking(chatId, code, fromUser) {
  if (!supabase) {
    await bot.sendMessage(chatId, '❌ Ошибка: База данных недоступна');
    return;
  }

  try {
    // Находим код в БД
    const { data: linkCode, error: findError } = await supabase
      .from('telegram_link_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();

    if (findError || !linkCode) {
      console.error('[Telegram Bot] Code not found:', code, findError?.message);
      await bot.sendMessage(
        chatId,
        '❌ *Код привязки не найден или уже использован*\n\n' +
        'Возможные причины:\n' +
        '• Код истёк (срок действия 24 часа)\n' +
        '• Код уже был использован\n' +
        '• Неверный код\n\n' +
        'Создайте новый код в настройках TradeFrame Builder.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Проверяем срок действия
    const expiresAt = new Date(linkCode.expires_at);
    if (expiresAt < new Date()) {
      console.log('[Telegram Bot] Code expired:', code);
      await bot.sendMessage(
        chatId,
        '❌ *Код привязки истёк*\n\n' +
        'Создайте новый код в настройках TradeFrame Builder.',
        { parse_mode: 'Markdown' }
      );

      // Помечаем код как использованный
      await supabase
        .from('telegram_link_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', linkCode.id);

      return;
    }

    // Сохраняем привязку
    const { error: updateError } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: linkCode.user_id,
        telegram_chat_id: chatId.toString(),
        telegram_verified: true,
        telegram_username: fromUser.username || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('[Telegram Bot] Failed to save linking:', updateError);
      await bot.sendMessage(
        chatId,
        '❌ Ошибка при сохранении привязки. Попробуйте ещё раз.'
      );
      return;
    }

    // Помечаем код как использованный
    await supabase
      .from('telegram_link_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', linkCode.id);

    // Получаем информацию о пользователе
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', linkCode.user_id)
      .single();

    // Отправляем подтверждение
    const userName = user?.full_name || user?.email || 'Пользователь';
    await bot.sendMessage(
      chatId,
      `✅ *Аккаунт успешно привязан!*\n\n` +
      `👤 Пользователь: ${userName}\n` +
      (user?.email ? `📧 Email: ${user.email}\n\n` : '') +
      `Теперь вы будете получать уведомления о событиях в системе TradeFrame Builder.\n\n` +
      `Управляйте подписками в настройках: /help`,
      { parse_mode: 'Markdown' }
    );

    console.log(`[Telegram Bot] Account linked: user_id=${linkCode.user_id}, chat_id=${chatId}`);

  } catch (error) {
    console.error('[Telegram Bot] Account linking error:', error);
    await bot.sendMessage(
      chatId,
      '❌ Произошла ошибка при привязке аккаунта. Попробуйте ещё раз.'
    );
  }
}

/**
 * Проверка статуса привязки
 */
async function handleStatusCheck(chatId) {
  if (!supabase) {
    await bot.sendMessage(chatId, '❌ Ошибка: База данных недоступна');
    return;
  }

  try {
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .select(`
        *,
        users!inner(email, full_name)
      `)
      .eq('telegram_chat_id', chatId.toString())
      .eq('telegram_verified', true)
      .single();

    if (error || !settings) {
      await bot.sendMessage(
        chatId,
        '❌ *Аккаунт не привязан*\n\n' +
        'Привяжите аккаунт через настройки TradeFrame Builder.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Получаем подписки
    const { data: subscriptions } = await supabase
      .from('user_notification_subscriptions')
      .select('notification_type, enabled')
      .eq('user_id', settings.user_id);

    const activeSubscriptions = subscriptions?.filter(s => s.enabled) || [];

    await bot.sendMessage(
      chatId,
      `✅ *Статус привязки*\n\n` +
      `👤 Пользователь: ${settings.users.full_name || settings.users.email}\n` +
      `📧 Email: ${settings.users.email}\n` +
      `🔔 Email уведомления: ${settings.email_enabled ? 'Включены' : 'Выключены'}\n` +
      `🌙 Не беспокоить: ${settings.dnd_enabled ? `Включен (${settings.dnd_start} - ${settings.dnd_end})` : 'Выключен'}\n\n` +
      `*Активные подписки:* ${activeSubscriptions.length}\n` +
      activeSubscriptions.map(s => `• ${formatNotificationType(s.notification_type)}`).join('\n'),
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('[Telegram Bot] Status check error:', error);
    await bot.sendMessage(chatId, '❌ Ошибка при проверке статуса');
  }
}

/**
 * Отвязка аккаунта
 */
async function handleUnlink(chatId) {
  if (!supabase) {
    await bot.sendMessage(chatId, '❌ Ошибка: База данных недоступна');
    return;
  }

  try {
    const { error } = await supabase
      .from('user_notification_settings')
      .update({
        telegram_chat_id: null,
        telegram_verified: false,
        telegram_username: null,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_chat_id', chatId.toString());

    if (error) {
      console.error('[Telegram Bot] Unlink error:', error);
      await bot.sendMessage(chatId, '❌ Ошибка при отвязке аккаунта');
      return;
    }

    await bot.sendMessage(
      chatId,
      `✅ *Аккаунт успешно отвязан*\n\n` +
      `Вы больше не будете получать уведомления.\n\n` +
      `Чтобы снова привязать аккаунт, зайдите в настройки TradeFrame Builder.`,
      { parse_mode: 'Markdown' }
    );

    console.log(`[Telegram Bot] Account unlinked: chat_id=${chatId}`);

  } catch (error) {
    console.error('[Telegram Bot] Unlink error:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при отвязке аккаунта');
  }
}

/**
 * Отправка уведомления в Telegram
 * @param {string} chatId - ID чата в Telegram
 * @param {object} notification - Объект уведомления
 * @returns {Promise<boolean>} - true если отправка успешна
 */
async function sendNotification(chatId, notification) {
  if (!bot) {
    console.error('[Telegram Bot] Bot not initialized');
    return false;
  }

  try {
    const priorityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    }[notification.priority] || '⚪';

    const message =
      `${priorityEmoji} *${notification.title || formatNotificationType(notification.notification_type)}*\n\n` +
      `${notification.message}\n\n` +
      `🕐 ${new Date(notification.created_at).toLocaleString('ru-RU')}`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    console.log(`[Telegram Bot] Notification sent to chat ${chatId}: ${notification.notification_type}`);
    return true;

  } catch (error) {
    console.error(`[Telegram Bot] Failed to send notification to chat ${chatId}:`, error.message);
    return false;
  }
}

/**
 * Форматирование типа уведомления для отображения
 */
function formatNotificationType(type) {
  const types = {
    bill_acceptor_threshold: 'Пороги купюроприемника',
    equipment_offline: 'Оборудование офлайн',
    low_fuel_level: 'Низкий уровень топлива',
    shift_not_closed: 'Незакрытая смена'
  };
  return types[type] || type;
}

/**
 * Получение экземпляра бота (для использования в других модулях)
 */
function getBot() {
  return bot;
}

module.exports = {
  initTelegramBot,
  sendNotification,
  getBot
};
