import { getSystemConfig, isGlobalTelegramConfigured } from '@/config/system';
import { getUserTelegramChatId, isUserTelegramEnabled } from '@/config/userSettings';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { systemConfigService } from './systemConfigService';

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  defaultChatId?: string;
  webhookUrl?: string;
}

export interface TelegramSendFileOptions {
  filename: string;
  caption?: string;
  chatId?: string;
}

const TELEGRAM_CONFIG_KEY = 'telegram_integration';

const defaultTelegramConfig: TelegramConfig = {
  botToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
  enabled: false,
  defaultChatId: '',
  webhookUrl: ''
};

class TelegramService {
  private readonly baseUrl = 'https://api.telegram.org';

  // ====== КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ ======

  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ TelegramService инициализирован с централизованной конфигурацией');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации TelegramService:', error);
    }
  }

  async useSystemConfig(): Promise<boolean> {
    try {
      return !(await apiConfigServiceDB.isMockMode());
    } catch (error) {
      console.warn('⚠️ Ошибка проверки режима, используется localStorage:', error);
      return false;
    }
  }

  async getTelegramConfig(): Promise<TelegramConfig> {
    try {
      const useSystem = await this.useSystemConfig();
      
      if (useSystem) {
        const config = await systemConfigService.getConfig(TELEGRAM_CONFIG_KEY);
        if (config?.value) {
          return { ...defaultTelegramConfig, ...config.value };
        }
      }
      
      // Fallback на localStorage
      const saved = localStorage.getItem('telegram_config');
      return saved ? JSON.parse(saved) : defaultTelegramConfig;
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации Telegram:', error);
      return defaultTelegramConfig;
    }
  }

  async saveTelegramConfig(config: TelegramConfig): Promise<void> {
    try {
      const useSystem = await this.useSystemConfig();
      
      if (useSystem) {
        await systemConfigService.setConfig(TELEGRAM_CONFIG_KEY, {
          key: TELEGRAM_CONFIG_KEY,
          value: config,
          description: 'Конфигурация Telegram интеграции',
          is_active: true
        });
        console.log('✅ Telegram конфигурация сохранена в системе');
      } else {
        localStorage.setItem('telegram_config', JSON.stringify(config));
        console.log('✅ Telegram конфигурация сохранена локально');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения конфигурации Telegram:', error);
      localStorage.setItem('telegram_config', JSON.stringify(config));
    }
  }

  // ====== ОТПРАВКА СООБЩЕНИЙ ======

  // Отправка сообщения
  async sendMessage(text: string, chatId?: string): Promise<boolean> {
    const systemConfig = getSystemConfig();
    if (!isGlobalTelegramConfigured()) {
      throw new Error('Глобальный Telegram бот не настроен администратором.');
    }

    const targetChatId = chatId || getUserTelegramChatId();
    if (!targetChatId) {
      throw new Error('Chat ID не настроен для пользователя.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/bot${systemConfig.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Ошибка Telegram API:', result);
        throw new Error(result.description || 'Неизвестная ошибка');
      }

      console.log('✅ Сообщение отправлено в Telegram');
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      throw error;
    }
  }

  // Отправка файла
  async sendDocument(blob: Blob, options: TelegramSendFileOptions): Promise<boolean> {
    const systemConfig = getSystemConfig();
    if (!isGlobalTelegramConfigured()) {
      throw new Error('Глобальный Telegram бот не настроен администратором.');
    }

    const targetChatId = options.chatId || getUserTelegramChatId();
    if (!targetChatId) {
      throw new Error('Chat ID не настроен для пользователя.');
    }

    try {
      const formData = new FormData();
      formData.append('chat_id', targetChatId);
      formData.append('document', blob, options.filename);
      
      if (options.caption) {
        formData.append('caption', options.caption);
        formData.append('parse_mode', 'HTML');
      }

      console.log('📤 Отправляем файл в Telegram:', {
        filename: options.filename,
        size: blob.size,
        chatId: targetChatId
      });

      const response = await fetch(`${this.baseUrl}/bot${systemConfig.telegram.botToken}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Ошибка Telegram API:', result);
        throw new Error(result.description || 'Неизвестная ошибка');
      }

      console.log('✅ Файл отправлен в Telegram:', result);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки файла:', error);
      throw error;
    }
  }

  // Получение информации о боте
  async getBotInfo(): Promise<any> {
    const systemConfig = getSystemConfig();
    if (!isGlobalTelegramConfigured()) {
      throw new Error('Глобальный Telegram бот не настроен');
    }

    try {
      const response = await fetch(`${this.baseUrl}/bot${systemConfig.telegram.botToken}/getMe`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.description || 'Неизвестная ошибка');
      }

      return result.result;
    } catch (error) {
      console.error('❌ Ошибка получения информации о боте:', error);
      throw error;
    }
  }

  // Проверка доступности чата
  async testChat(chatId?: string): Promise<boolean> {
    const systemConfig = getSystemConfig();
    if (!isGlobalTelegramConfigured()) {
      return false;
    }

    try {
      const targetChatId = chatId || getUserTelegramChatId();
      if (!targetChatId) return false;

      const response = await fetch(`${this.baseUrl}/bot${systemConfig.telegram.botToken}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Ошибка проверки чата:', error);
      return false;
    }
  }

  // Получение chat_id (для помощи пользователю)
  async getUpdates(): Promise<any> {
    const systemConfig = getSystemConfig();
    if (!isGlobalTelegramConfigured()) {
      throw new Error('Глобальный Telegram бот не настроен');
    }

    try {
      const response = await fetch(`${this.baseUrl}/bot${systemConfig.telegram.botToken}/getUpdates`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.description || 'Неизвестная ошибка');
      }

      return result.result;
    } catch (error) {
      console.error('❌ Ошибка получения обновлений:', error);
      throw error;
    }
  }
}

export const telegramService = new TelegramService();