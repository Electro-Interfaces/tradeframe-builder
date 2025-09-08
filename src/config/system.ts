// Глобальная конфигурация системы
export interface SystemConfig {
  telegram: {
    botToken: string;
    botUsername: string;
    enabled: boolean;
  };
  whatsapp: {
    enabled: boolean;
  };
}

// Получение системной конфигурации
export const getSystemConfig = (): SystemConfig => {
  // В реальном приложении это будет загружаться с сервера
  // Пока храним в localStorage для администраторов
  const savedConfig = localStorage.getItem('system_config');
  
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch (error) {
      console.error('Ошибка парсинга системной конфигурации:', error);
    }
  }

  // Дефолтная конфигурация
  return {
    telegram: {
      botToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
      botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'TradeControl_DW_Export_Bot',
      enabled: false
    },
    whatsapp: {
      enabled: true
    }
  };
};

// Сохранение системной конфигурации (только для администраторов)
export const saveSystemConfig = (config: SystemConfig): void => {
  localStorage.setItem('system_config', JSON.stringify(config));
};

// Проверка настроен ли глобальный Telegram бот
export const isGlobalTelegramConfigured = (): boolean => {
  const config = getSystemConfig();
  return !!(config.telegram.botToken && config.telegram.enabled);
};