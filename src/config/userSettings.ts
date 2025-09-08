// Индивидуальные настройки пользователя
export interface UserTelegramSettings {
  enabled: boolean;
  chatId: string;
  sendReports: boolean;
}

export interface UserSettings {
  telegram: UserTelegramSettings;
  notifications: {
    email: boolean;
    browser: boolean;
  };
}

// Получение настроек пользователя
export const getUserSettings = (userId?: string): UserSettings => {
  // В реальном приложении это будет по userId с сервера
  // Пока используем localStorage
  const savedSettings = localStorage.getItem('user_settings');
  
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (error) {
      console.error('Ошибка парсинга настроек пользователя:', error);
    }
  }

  // Дефолтные настройки пользователя
  return {
    telegram: {
      enabled: false,
      chatId: '',
      sendReports: true
    },
    notifications: {
      email: true,
      browser: true
    }
  };
};

// Сохранение настроек пользователя
export const saveUserSettings = (settings: UserSettings, userId?: string): void => {
  // В реальном приложении это будет отправляться на сервер по userId
  localStorage.setItem('user_settings', JSON.stringify(settings));
};

// Проверка включен ли Telegram у пользователя
export const isUserTelegramEnabled = (userId?: string): boolean => {
  const settings = getUserSettings(userId);
  return settings.telegram.enabled && !!settings.telegram.chatId;
};

// Получение chat_id пользователя
export const getUserTelegramChatId = (userId?: string): string | null => {
  const settings = getUserSettings(userId);
  return settings.telegram.enabled ? settings.telegram.chatId : null;
};