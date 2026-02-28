/**
 * Email Service для отправки уведомлений
 * Использует Nodemailer для отправки email
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Инициализация транспорта для отправки email
   */
  initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true для 465, false для других портов
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

    // Проверяем что все параметры указаны
    if (!config.host || !config.auth.user || !config.auth.pass) {
      console.warn('⚠️ Email сервис не настроен. Укажите SMTP параметры в .env файле');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter(config);
      this.isConfigured = true;
      console.log('✅ Email транспорт инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации email транспорта:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Проверка подключения к SMTP серверу
   */
  async verifyConnection() {
    if (!this.isConfigured || !this.transporter) {
      return { success: false, error: 'Email сервис не настроен' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка проверки SMTP соединения:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправка email уведомления
   * @param {Object} options - Параметры email
   * @param {string} options.to - Email получателя
   * @param {string} options.subject - Тема письма
   * @param {string} options.text - Текст письма (plain text)
   * @param {string} options.html - HTML содержимое письма
   * @param {string} options.priority - Приоритет (low, medium, high, critical)
   */
  async sendNotification(options) {
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ Email сервис не настроен, письмо не отправлено');
      return {
        success: false,
        error: 'Email сервис не настроен'
      };
    }

    const { to, subject, text, html, priority = 'medium' } = options;

    // Настройки приоритета email
    const prioritySettings = this.getPrioritySettings(priority);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      ...prioritySettings
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email отправлен: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получить настройки приоритета для email
   */
  getPrioritySettings(priority) {
    const settings = {};

    switch (priority) {
      case 'critical':
      case 'high':
        settings.priority = 'high';
        settings.headers = {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        };
        break;
      case 'low':
        settings.priority = 'low';
        settings.headers = {
          'X-Priority': '5',
          'X-MSMail-Priority': 'Low',
          'Importance': 'low'
        };
        break;
      default: // medium
        settings.priority = 'normal';
    }

    return settings;
  }

  /**
   * Отправка уведомления о превышении порогов купюроприемника
   */
  async sendBillAcceptorAlert(options) {
    const {
      to,
      stationName,
      billCount,
      billAmount,
      threshold,
      level // 'warning' или 'critical'
    } = options;

    const isWarning = level === 'warning';
    const emoji = isWarning ? '⚠️' : '🔴';
    const levelText = isWarning ? 'ПРЕДУПРЕЖДЕНИЕ' : 'КРИТИЧНО';

    const subject = `${emoji} ${levelText}: Купюроприемник ${stationName}`;

    const text = `
${levelText}: Превышен порог купюроприемника

Торговая точка: ${stationName}
Текущее количество купюр: ${billCount}
Пороговое значение: ${threshold.billCountWarning || threshold.billCountCritical}
Текущая сумма: ${billAmount.toLocaleString('ru-RU')} ₽

Требуется инкассация.
    `.trim();

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-warning { background-color: #fff3cd; border-left: 4px solid #ffc107; }
    .alert-critical { background-color: #f8d7da; border-left: 4px solid #dc3545; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
    .info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert ${isWarning ? 'alert-warning' : 'alert-critical'}">
      <div class="title">${emoji} ${levelText}</div>
      <p>Превышен порог купюроприемника</p>
    </div>

    <div class="info">
      <div class="info-row">
        <span class="label">Торговая точка:</span>
        <span>${stationName}</span>
      </div>
      <div class="info-row">
        <span class="label">Количество купюр:</span>
        <span><strong>${billCount}</strong> (порог: ${threshold.billCountWarning || threshold.billCountCritical})</span>
      </div>
      <div class="info-row">
        <span class="label">Сумма денег:</span>
        <span><strong>${billAmount.toLocaleString('ru-RU')} ₽</strong></span>
      </div>
    </div>

    <p><strong>Рекомендуемое действие:</strong> Требуется инкассация купюроприемника.</p>

    <div class="footer">
      <p>Это автоматическое уведомление из системы TradeControl Builder.</p>
      <p>Для изменения настроек уведомлений войдите в систему и перейдите в раздел "Профиль".</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendNotification({
      to,
      subject,
      text,
      html,
      priority: level === 'critical' ? 'high' : 'medium'
    });
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
