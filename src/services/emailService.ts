/**
 * Email Service для отправки отчетов по электронной почте
 * Использует веб-сервисы для отправки email без backend сервера
 */

export interface EmailConfig {
  enabled: boolean;
  recipientEmail: string;
  senderName?: string;
  serviceProvider: 'formsubmit' | 'emailjs' | 'custom';
  apiKey?: string;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  message: string;
  attachmentBlob?: Blob;
  attachmentName?: string;
}

const EMAIL_CONFIG_KEY = 'email_integration';

const defaultEmailConfig: EmailConfig = {
  enabled: false,
  recipientEmail: '',
  senderName: 'TradeFrame System',
  serviceProvider: 'formsubmit'
};

class EmailService {
  
  async getEmailConfig(): Promise<EmailConfig> {
    try {
      const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
      return saved ? { ...defaultEmailConfig, ...JSON.parse(saved) } : defaultEmailConfig;
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации Email:', error);
      return defaultEmailConfig;
    }
  }

  async saveEmailConfig(config: EmailConfig): Promise<void> {
    try {
      localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Email конфигурация сохранена');
    } catch (error) {
      console.error('❌ Ошибка сохранения конфигурации Email:', error);
      throw error;
    }
  }

  /**
   * Отправка email через FormSubmit (бесплатный сервис)
   */
  private async sendViaFormSubmit(options: EmailSendOptions): Promise<boolean> {
    const config = await this.getEmailConfig();
    
    if (!config.recipientEmail) {
      throw new Error('Email получателя не настроен');
    }

    try {
      // FormSubmit не поддерживает файлы напрямую, отправляем только текст
      const formData = new FormData();
      formData.append('_subject', options.subject);
      formData.append('_autoresponse', 'Ваш отчет получен и обработан системой TradeFrame');
      formData.append('message', options.message);
      formData.append('_next', window.location.origin); // Redirect после отправки
      formData.append('_captcha', 'false'); // Отключаем капчу
      
      // Если есть вложение, добавляем информацию о нем в сообщение
      if (options.attachmentBlob && options.attachmentName) {
        formData.append('attachment_info', `Файл: ${options.attachmentName} (${(options.attachmentBlob.size / 1024).toFixed(1)} KB)`);
      }

      const response = await fetch(`https://formsubmit.co/${config.recipientEmail}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Email отправлен через FormSubmit');
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка отправки email через FormSubmit:', error);
      throw error;
    }
  }

  /**
   * Отправка email с уведомлением (без файла)
   */
  async sendReportNotification(options: EmailSendOptions): Promise<boolean> {
    try {
      const config = await this.getEmailConfig();
      
      if (!config.enabled) {
        console.log('ℹ️ Email отправка отключена в настройках');
        return false;
      }

      console.log('📧 Отправляем email уведомление:', {
        to: config.recipientEmail,
        subject: options.subject
      });

      switch (config.serviceProvider) {
        case 'formsubmit':
          return await this.sendViaFormSubmit(options);
        
        default:
          throw new Error(`Провайдер ${config.serviceProvider} не поддерживается`);
      }
      
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      throw error;
    }
  }

  /**
   * Проверка настроек email
   */
  async testEmailConfig(): Promise<boolean> {
    try {
      const config = await this.getEmailConfig();
      
      if (!config.enabled || !config.recipientEmail) {
        return false;
      }

      // Отправляем тестовое сообщение
      await this.sendReportNotification({
        to: config.recipientEmail,
        subject: '✅ Тест настроек TradeFrame Email',
        message: `🔧 Тестовое сообщение от системы TradeFrame\n\n` +
          `📅 Время отправки: ${new Date().toLocaleString('ru-RU')}\n` +
          `⚙️ Провайдер: ${config.serviceProvider}\n\n` +
          `Если вы получили это сообщение, значит настройки email работают корректно.`
      });

      return true;
      
    } catch (error) {
      console.error('❌ Тест email не прошел:', error);
      return false;
    }
  }

  /**
   * Генерация ссылки для скачивания файла (для email без вложений)
   */
  generateDownloadLink(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);
    return `${window.location.origin}#download=${encodeURIComponent(filename)}&url=${encodeURIComponent(url)}`;
  }
}

export const emailService = new EmailService();