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

    if (this.isConfigured) {
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

<b>Торговая точка:</b> ${stationName}
<b>Количество купюр:</b> ${billCount} (порог: ${threshold.billCountWarning || threshold.billCountCritical})
<b>Сумма денег:</b> ${billAmount.toLocaleString('ru-RU')} ₽

<b>Рекомендация:</b> Требуется инкассация купюроприемника.

<i>Автоматическое уведомление TradeControl Builder</i>
    `.trim();

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: level === 'warning' // Для критичных - со звуком
    });
  }

  /**
   * Отправка уведомления о низком уровне топлива
   */
  async sendLowFuelLevelAlert(options) {
    const {
      chatId,
      stationName,
      tankNumber,
      fuelType,
      currentPercent,
      currentVolume,
      maxVolume,
      threshold,
      level // 'warning' или 'critical'
    } = options;

    const isWarning = level === 'warning';
    const emoji = isWarning ? '⚠️' : '🔴';
    const levelText = isWarning ? 'ПРЕДУПРЕЖДЕНИЕ' : 'КРИТИЧНО';

    const text = `
${emoji} <b>${levelText}</b>

<b>Низкий уровень топлива</b>

<b>Торговая точка:</b> ${stationName}
<b>Резервуар:</b> №${tankNumber} (${fuelType})
<b>Текущий уровень:</b> ${currentPercent.toFixed(1)}% (${currentVolume.toLocaleString('ru-RU')} / ${maxVolume.toLocaleString('ru-RU')} л)
<b>Порог ${isWarning ? 'предупреждения' : 'критический'}:</b> ${isWarning ? threshold.levelWarning : threshold.levelCritical}%

<b>Рекомендация:</b> Требуется заправка резервуара.

<i>Автоматическое уведомление TradeControl Builder</i>
    `.trim();

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: level === 'warning'
    });
  }

  /**
   * Отправка уведомления о БЛОКИРОВКЕ отпуска топлива (уровень < 800 л)
   */
  async sendFuelBlockAlert(options) {
    const {
      chatId,
      stationName,
      tankNumber,
      fuelType,
      currentPercent,
      currentVolume,
      maxVolume,
      blockThreshold,
      dataSource
    } = options;

    const dataSourceLabel = dataSource ? ` [${dataSource}]` : '';

    const text = `
🚫 <b>БЛОКИРОВКА ОТПУСКА ТОПЛИВА</b>

📍 <b>АЗС:</b> ${stationName}
⛽ <b>Резервуар:</b> №${tankNumber} (${fuelType})
📊 <b>Уровень:</b> ${currentVolume.toLocaleString('ru-RU')} л (${currentPercent.toFixed(1)}%)${dataSourceLabel}
⚠️ <b>Порог блокировки:</b> ${blockThreshold} л

<b>Отпуск данного вида топлива заблокирован</b> до поступления следующей партии нефтепродуктов.

<i>Автоматическое уведомление TradeControl Builder</i>
    `.trim();

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: false // Всегда со звуком - критическое уведомление
    });
  }

  /**
   * Отправить уведомление о проблемах с работой терминала
   */
  async sendTerminalOfflineAlert(options) {
    const {
      chatId,
      stationName,
      stationCode,
      lastUpdate,
      delayMinutes,
      maxDelayMinutes
    } = options;

    const lastUpdateDate = new Date(lastUpdate);
    const emoji = '🔴';
    const levelText = 'КРИТИЧНО';

    const text = `
${emoji} <b>${levelText}</b>

<b>Проблема с передачей данных</b>

<b>Торговая точка:</b> ${stationName} (${stationCode})
<b>Последнее обновление:</b> ${lastUpdateDate.toLocaleString('ru-RU')}
<b>Прошло времени:</b> ${delayMinutes} мин
<b>Максимально допустимо:</b> ${maxDelayMinutes} мин

<b>Рекомендация:</b> Проверьте работу терминала и связь с облаком.

<i>Автоматическое уведомление TradeControl Builder</i>
    `.trim();

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: false // Всегда со звуком для критических проблем
    });
  }

  /**
   * Отправить уведомление о непробитых чеках (сводка по сети)
   */
  async sendUnpunchedReceiptsAlert(options) {
    const {
      chatId,
      networkName,
      totalCash,
      totalBank,
      stations // массив { stationName, stationCode, cashSum, bankSum }
    } = options;

    // Форматируем суммы
    const formatSum = (sum) => {
      return Math.round(sum).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Формируем детали по станциям
    const stationLines = [];
    for (const station of stations) {
      if (station.cashSum > 0 || station.bankSum > 0) {
        const parts = [];
        if (station.cashSum > 0) parts.push('нал: ' + formatSum(station.cashSum) + ' руб');
        if (station.bankSum > 0) parts.push('безнал: ' + formatSum(station.bankSum) + ' руб');
        stationLines.push('• ' + station.stationName + ': ' + parts.join(', '));
      }
    }

    const totalSum = totalCash + totalBank;
    const stationsText = stationLines.length > 0 ? stationLines.join('\n') : 'Нет данных';

    const text = [
      '🧾 <b>ВНИМАНИЕ</b>',
      '',
      '<b>Непробитые чеки</b>',
      '',
      '<b>Сеть:</b> ' + networkName,
      '<b>Наличные:</b> ' + formatSum(totalCash) + ' руб',
      '<b>Безнал:</b> ' + formatSum(totalBank) + ' руб',
      '<b>Итого:</b> ' + formatSum(totalSum) + ' руб',
      '',
      '<b>По станциям:</b>',
      stationsText,
      '',
      '<b>Рекомендация:</b> Пробейте чеки для корректировки кассы.',
      '',
      '<i>Автоматическое уведомление TradeControl Builder</i>'
    ].join('\n');

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      disableNotification: false
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
