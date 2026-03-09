/**
 * Runtime Telegram Bot с datasource-слоем Supabase/PG
 */

const TelegramBot = require('node-telegram-bot-api');

const notificationDataSource = require('./services/notifications/notificationDataSource');

let bot = null;

function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });

    bot.on('polling_error', (error) => {
      console.error('[Telegram Bot] Polling error:', error.message);
    });

    setupBotHandlers();
    return bot;
  } catch (error) {
    console.error('[Telegram Bot] Failed to initialize:', error.message);
    return null;
  }
}

function setupBotHandlers() {
  if (!bot) {
    return;
  }

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1]?.trim();

    if (!code) {
      await bot.sendMessage(
        chatId,
        `Добро пожаловать в ${process.env.TELEGRAM_BOT_NAME || 'TradeControl Notifications'}.\n\n` +
        `Чтобы привязать аккаунт:\n` +
        `1. Войдите в TradeFrame\n` +
        `2. Перейдите в Настройки -> Уведомления\n` +
        `3. Нажмите "Привязать Telegram"\n` +
        `4. Откройте полученную ссылку`
      );
      return;
    }

    await handleAccountLinking(chatId, code, msg.from);
  });

  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      `Доступные команды:\n` +
      `/start - начать работу\n` +
      `/help - показать справку\n` +
      `/status - проверить статус привязки\n` +
      `/unlink - отвязать аккаунт`
    );
  });

  bot.onText(/\/status/, async (msg) => {
    await handleStatusCheck(msg.chat.id);
  });

  bot.onText(/\/unlink/, async (msg) => {
    await handleUnlink(msg.chat.id);
  });
}

async function handleAccountLinking(chatId, code, fromUser) {
  try {
    const linkCode = await notificationDataSource.findTelegramLinkCode(code);

    if (!linkCode || linkCode.used) {
      await bot.sendMessage(
        chatId,
        'Код привязки не найден или уже использован. Создайте новый код в настройках TradeFrame.'
      );
      return;
    }

    if (new Date(linkCode.expires_at) < new Date()) {
      await notificationDataSource.markTelegramLinkCodeUsed(linkCode.id).catch(() => {});
      await bot.sendMessage(chatId, 'Код привязки истек. Создайте новый код в настройках TradeFrame.');
      return;
    }

    await notificationDataSource.saveTelegramBinding(linkCode.user_id, {
      telegram_chat_id: String(chatId),
      telegram_username: fromUser.username || null,
      telegram_verified: true,
      telegram_enabled: true,
    });
    await notificationDataSource.markTelegramLinkCodeUsed(linkCode.id);

    const user = await notificationDataSource.getUserById(linkCode.user_id);
    const userName = user?.name || user?.email || 'Пользователь';

    await bot.sendMessage(
      chatId,
      `Аккаунт успешно привязан.\n\n` +
      `Пользователь: ${userName}\n` +
      (user?.email ? `Email: ${user.email}\n\n` : '') +
      `Теперь вы будете получать уведомления из TradeFrame.`
    );
  } catch (error) {
    await bot.sendMessage(chatId, 'Произошла ошибка при привязке аккаунта. Попробуйте еще раз.');
  }
}

async function handleStatusCheck(chatId) {
  try {
    const linked = await notificationDataSource.getUserByTelegramChatId(String(chatId));

    if (!linked) {
      await bot.sendMessage(
        chatId,
        'Аккаунт не привязан. Привяжите аккаунт через настройки TradeFrame.'
      );
      return;
    }

    const subscriptions = await notificationDataSource.getUserNotificationSubscriptions(linked.user.id);
    const activeSubscriptions = subscriptions.filter((item) => item.enabled !== false);

    await bot.sendMessage(
      chatId,
      `Статус привязки\n\n` +
      `Пользователь: ${linked.user.name || linked.user.email}\n` +
      `Email: ${linked.user.email}\n` +
      `Email уведомления: ${linked.settings.email_enabled ? 'Включены' : 'Выключены'}\n` +
      `Не беспокоить: ${linked.settings.dnd_enabled ? `${linked.settings.dnd_start || '--:--'} - ${linked.settings.dnd_end || '--:--'}` : 'Выключен'}\n\n` +
      `Активные подписки: ${activeSubscriptions.length}\n` +
      activeSubscriptions.map((item) => `• ${formatNotificationType(item.notification_type)}`).join('\n')
    );
  } catch (error) {
    await bot.sendMessage(chatId, 'Ошибка при проверке статуса привязки.');
  }
}

async function handleUnlink(chatId) {
  try {
    await notificationDataSource.unlinkTelegramByChatId(String(chatId));
    await bot.sendMessage(
      chatId,
      'Аккаунт успешно отвязан. Чтобы снова получать уведомления, привяжите его в настройках TradeFrame.'
    );
  } catch (error) {
    await bot.sendMessage(chatId, 'Ошибка при отвязке аккаунта.');
  }
}

async function sendNotification(chatId, notification) {
  if (!bot) {
    return false;
  }

  try {
    const priorityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
    }[notification.priority] || '⚪';

    const message =
      `${priorityEmoji} ${notification.title || formatNotificationType(notification.notification_type)}\n\n` +
      `${notification.message}\n\n` +
      `${new Date(notification.created_at).toLocaleString('ru-RU')}`;

    await bot.sendMessage(chatId, message);
    return true;
  } catch {
    return false;
  }
}

function formatNotificationType(type) {
  const types = {
    bill_acceptor_threshold: 'Пороги купюроприемника',
    equipment_offline: 'Оборудование офлайн',
    low_fuel_level: 'Низкий уровень топлива',
    shift_not_closed: 'Незакрытая смена',
    terminal_offline: 'Проблемы с терминалом',
    unpunched_receipts: 'Непробитые чеки',
  };

  return types[type] || type;
}

function getBot() {
  return bot;
}

module.exports = {
  getBot,
  initTelegramBot,
  sendNotification,
};
