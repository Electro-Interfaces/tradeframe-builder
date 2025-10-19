/**
 * Telegram Service для отправки уведомлений через Telegram Bot
 * Использует Telegram Bot API
 */

const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.isConfigured = !!this.botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.isConfigured) {
      console.warn('⚠️ Telegram бот не настроен. Укажите TELEGRAM_BOT_TOKEN в .env файле');
    } else {
      console.log('✅ Telegram сервис инициализирован');
      this.verifyBot();
    }
  }

  /**
   * Проверка работы бота
   */
  async verifyBot() {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram бот не настроен' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      if (response.data.ok) {
        console.log(`✅ Telegram бот подключен: @${response.data.result.username}`);
        return { success: true, bot: response.data.result };
      }
      return { success: false, error: 'Не удалось подключиться к боту' };
    } catch (error) {
      console.error('❌ Ошибка проверки Telegram бота:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправка сообщения в Telegram
   * @param {Object} options - Параметры сообщения
   * @param {string} options.chatId - Chat ID получателя
   * @param {string} options.text - Текст сообщения
   * @param {string} options.parseMode - Режим парсинга ('Markdown' или 'HTML')
   * @param {boolean} options.disableNotification - Отключить звук уведомления
   */
  async sendMessage(options) {
    if (!this.isConfigured) {
      console.error('❌ Telegram бот не настроен, сообщение не отправлено');
      return {
        success: false,
        error: 'Telegram бот не настроен'
      };
    }

    const {
      chatId,
      text,
      parseMode = 'HTML',
      disableNotification = false
    } = options;

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_notification: disableNotification
      });

      if (response.data.ok) {
        console.log(`✅ Telegram сообщение отправлено в чат ${chatId}`);
        return {
          success: true,
          messageId: response.data.result.message_id
        };
      }

      return {
        success: false,
        error: response.data.description
      };
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram сообщения:', error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Отправка уведомления о превышении порогов купюроприемника
   */
  async sendBillAcceptorAlert(options) {
    const {
      chatId,
      stationName,
      billCount,
      billAmount,
      threshold,
      level // 'warning' или 'critical'
    } = options;

    const isWarning = level === 'warning';
    const emoji = isWarning ? '⚠️' : '🔴';
    const levelText = isWarning ? 'ПРЕДУПРЕЖДЕНИЕ' : 'КРИТИЧНО';

    // Используем HTML форматирование
    const text = `
${emoji} <b>${levelText}</b>

<b>Превышен порог купюроприемника</b>

📍 <b>Торговая точка:</b> ${stationName}
💵 <b>Количество купюр:</b> ${billCount} (порог: ${threshold.billCountWarning || threshold.billCountCritical})
💰 <b>Сумма денег:</b> ${billAmount.toLocaleString('ru-RU')} ₽

<b>Рекомендация:</b> Требуется инкассация купюроприемника.

<i>Автоматическое уведомление TradeFrame Builder</i>
    `.trim();

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: level === 'warning' // Для критичных - со звуком
    });
  }

  /**
   * Получить информацию о чате
   */
  async getChat(chatId) {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram бот не настроен' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getChat`, {
        params: { chat_id: chatId }
      });

      if (response.data.ok) {
        return {
          success: true,
          chat: response.data.result
        };
      }

      return {
        success: false,
        error: response.data.description
      };
    } catch (error) {
      console.error('❌ Ошибка получения информации о чате:', error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Установить вебхук для получения обновлений
   */
  async setWebhook(webhookUrl) {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram бот не настроен' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: webhookUrl
      });

      if (response.data.ok) {
        console.log(`✅ Telegram webhook установлен: ${webhookUrl}`);
        return { success: true };
      }

      return {
        success: false,
        error: response.data.description
      };
    } catch (error) {
      console.error('❌ Ошибка установки webhook:', error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Удалить вебхук
   */
  async deleteWebhook() {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram бот не настроен' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);

      if (response.data.ok) {
        console.log('✅ Telegram webhook удален');
        return { success: true };
      }

      return {
        success: false,
        error: response.data.description
      };
    } catch (error) {
      console.error('❌ Ошибка удаления webhook:', error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  /**
   * Получить обновления (polling mode)
   * Используется для привязки пользователей к Chat ID
   */
  async getUpdates(offset = 0) {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram бот не настроен' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`, {
        params: {
          offset,
          timeout: 30
        }
      });

      if (response.data.ok) {
        return {
          success: true,
          updates: response.data.result
        };
      }

      return {
        success: false,
        error: response.data.description
      };
    } catch (error) {
      console.error('❌ Ошибка получения обновлений:', error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }
}

// Singleton instance
const telegramService = new TelegramService();

module.exports = telegramService;
