// Конфигурация Telegram Bot
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

// Получение конфигурации из localStorage или переменных окружения
export const getTelegramConfig = (): TelegramConfig | null => {
  // Пробуем получить из localStorage (пользовательские настройки)
  const savedToken = localStorage.getItem('telegram_bot_token');
  const savedChatId = localStorage.getItem('telegram_chat_id');
  
  if (savedToken && savedChatId) {
    return {
      botToken: savedToken,
      chatId: savedChatId
    };
  }
  
  // Пробуем получить из переменных окружения (для продакшена)
  const envToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const envChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  
  if (envToken && envChatId) {
    return {
      botToken: envToken,
      chatId: envChatId
    };
  }
  
  return null;
};

// Сохранение конфигурации в localStorage
export const saveTelegramConfig = (config: TelegramConfig): void => {
  localStorage.setItem('telegram_bot_token', config.botToken);
  localStorage.setItem('telegram_chat_id', config.chatId);
};

// Удаление конфигурации
export const clearTelegramConfig = (): void => {
  localStorage.removeItem('telegram_bot_token');
  localStorage.removeItem('telegram_chat_id');
};

// Проверка валидности конфигурации
export const isValidTelegramConfig = (config: TelegramConfig | null): boolean => {
  return !!(config?.botToken && config?.chatId);
};