/**
 * 🛠️ СЕРВИС УПРАВЛЕНИЯ КОНФИГУРАЦИЕЙ API
 * 
 * Централизованное управление настройками подключения к БД через UI
 */

import { PersistentStorage } from '@/utils/persistentStorage';

export interface DatabaseConnection {
  id: string;
  name: string;
  url: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mock';
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Настройки подключения
  settings?: {
    timeout?: number;
    retryAttempts?: number;
    poolSize?: number;
    ssl?: boolean;
  };
}

export interface ApiConfig {
  currentConnectionId: string;
  availableConnections: DatabaseConnection[];
  debugMode: boolean;
  lastUpdated: Date;
}

// Начальная конфигурация с mock и demo подключениями
const initialConfig: ApiConfig = {
  currentConnectionId: 'mock',
  debugMode: import.meta.env.DEV || false,
  lastUpdated: new Date(),
  availableConnections: [
    {
      id: 'mock',
      name: 'Mock Data (Демо)',
      url: 'localStorage',
      type: 'mock',
      description: 'Локальные демо-данные в localStorage',
      isActive: true,
      isDefault: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      settings: {
        timeout: 1000,
        retryAttempts: 3
      }
    },
    {
      id: 'local-db',
      name: 'Локальная БД',
      url: 'http://localhost:3000/api/v1',
      type: 'postgresql',
      description: 'Локальная PostgreSQL база данных',
      isActive: false,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 5000,
        retryAttempts: 3,
        poolSize: 10,
        ssl: false
      }
    },
    {
      id: 'prod-db',
      name: 'Продакшн БД',
      url: 'https://api.tradeframe.production.com/v1',
      type: 'postgresql',
      description: 'Продакшн PostgreSQL база данных',
      isActive: false,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 10000,
        retryAttempts: 5,
        poolSize: 20,
        ssl: true
      }
    }
  ]
};

// Загружаем конфигурацию из localStorage
let currentConfig: ApiConfig = PersistentStorage.load<ApiConfig>('api_config', initialConfig);

// Функция сохранения
const saveConfig = () => {
  currentConfig.lastUpdated = new Date();
  PersistentStorage.save('api_config', currentConfig);
};

/**
 * Сервис управления API конфигурацией
 */
export const apiConfigService = {
  // === ПОЛУЧЕНИЕ КОНФИГУРАЦИИ ===
  
  /**
   * Получить текущую конфигурацию
   */
  getCurrentConfig(): ApiConfig {
    return { ...currentConfig };
  },

  /**
   * Получить текущее активное подключение
   */
  getCurrentConnection(): DatabaseConnection | null {
    return currentConfig.availableConnections.find(
      conn => conn.id === currentConfig.currentConnectionId
    ) || null;
  },

  /**
   * Получить URL для API запросов
   */
  getCurrentApiUrl(): string {
    const connection = this.getCurrentConnection();
    if (!connection) {
      console.warn('⚠️ Активное подключение не найдено, используем mock');
      return 'mock';
    }
    return connection.url;
  },

  /**
   * Проверить используется ли mock режим
   */
  isMockMode(): boolean {
    const connection = this.getCurrentConnection();
    return connection?.type === 'mock' || !connection;
  },

  /**
   * Получить все доступные подключения
   */
  getAllConnections(): DatabaseConnection[] {
    return [...currentConfig.availableConnections];
  },

  // === УПРАВЛЕНИЕ ПОДКЛЮЧЕНИЯМИ ===

  /**
   * Переключиться на другое подключение
   */
  async switchConnection(connectionId: string): Promise<{
    success: boolean;
    error?: string;
    connection?: DatabaseConnection;
  }> {
    const connection = currentConfig.availableConnections.find(
      conn => conn.id === connectionId
    );

    if (!connection) {
      return {
        success: false,
        error: 'Подключение не найдено'
      };
    }

    // Проверяем доступность подключения (если это не mock)
    if (connection.type !== 'mock') {
      const testResult = await this.testConnection(connectionId);
      if (!testResult.success) {
        return {
          success: false,
          error: testResult.error || 'Подключение недоступно'
        };
      }
    }

    // Переключаемся
    currentConfig.currentConnectionId = connectionId;
    saveConfig();

    return {
      success: true,
      connection
    };
  },

  /**
   * Добавить новое подключение
   */
  async addConnection(connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseConnection> {
    const newConnection: DatabaseConnection = {
      ...connection,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    currentConfig.availableConnections.push(newConnection);
    saveConfig();

    return newConnection;
  },

  /**
   * Обновить подключение
   */
  async updateConnection(
    id: string, 
    updates: Partial<Omit<DatabaseConnection, 'id' | 'createdAt'>>
  ): Promise<DatabaseConnection | null> {
    const index = currentConfig.availableConnections.findIndex(conn => conn.id === id);
    if (index === -1) return null;

    const connection = currentConfig.availableConnections[index];
    currentConfig.availableConnections[index] = {
      ...connection,
      ...updates,
      id: connection.id,
      createdAt: connection.createdAt,
      updatedAt: new Date()
    };

    saveConfig();
    return currentConfig.availableConnections[index];
  },

  /**
   * Удалить подключение
   */
  async deleteConnection(id: string): Promise<boolean> {
    // Нельзя удалить активное подключение
    if (currentConfig.currentConnectionId === id) {
      throw new Error('Нельзя удалить активное подключение');
    }

    // Нельзя удалить дефолтное подключение
    const connection = currentConfig.availableConnections.find(conn => conn.id === id);
    if (connection?.isDefault) {
      throw new Error('Нельзя удалить дефолтное подключение');
    }

    const initialLength = currentConfig.availableConnections.length;
    currentConfig.availableConnections = currentConfig.availableConnections.filter(
      conn => conn.id !== id
    );

    if (currentConfig.availableConnections.length < initialLength) {
      saveConfig();
      return true;
    }

    return false;
  },

  // === ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЙ ===

  /**
   * Тестировать подключение к БД
   */
  async testConnection(connectionId: string): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
    details?: any;
  }> {
    const connection = currentConfig.availableConnections.find(
      conn => conn.id === connectionId
    );

    if (!connection) {
      return {
        success: false,
        error: 'Подключение не найдено'
      };
    }

    // Mock подключение всегда успешно
    if (connection.type === 'mock') {
      return {
        success: true,
        responseTime: 50,
        details: { mode: 'mock', storage: 'localStorage' }
      };
    }

    // Тестируем HTTP подключение
    const startTime = Date.now();
    try {
      const response = await fetch(`${connection.url}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(connection.settings?.timeout || 5000)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        };
      }

      const data = await response.json();
      return {
        success: true,
        responseTime,
        details: data
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error.message || 'Ошибка подключения',
        responseTime
      };
    }
  },

  /**
   * Тестировать все подключения
   */
  async testAllConnections(): Promise<Record<string, {
    success: boolean;
    error?: string;
    responseTime?: number;
  }>> {
    const results: Record<string, any> = {};
    
    for (const connection of currentConfig.availableConnections) {
      results[connection.id] = await this.testConnection(connection.id);
    }

    return results;
  },

  // === НАСТРОЙКИ ===

  /**
   * Включить/выключить режим отладки
   */
  setDebugMode(enabled: boolean): void {
    currentConfig.debugMode = enabled;
    saveConfig();
  },

  /**
   * Получить статистику использования
   */
  getUsageStats() {
    const connection = this.getCurrentConnection();
    return {
      currentConnection: connection?.name || 'Неизвестно',
      connectionType: connection?.type || 'unknown',
      totalConnections: currentConfig.availableConnections.length,
      mockMode: this.isMockMode(),
      debugMode: currentConfig.debugMode,
      lastUpdated: currentConfig.lastUpdated
    };
  },

  // === МИГРАЦИЯ ===

  /**
   * Экспорт конфигурации
   */
  exportConfig(): string {
    return JSON.stringify(currentConfig, null, 2);
  },

  /**
   * Импорт конфигурации
   */
  importConfig(configJson: string): boolean {
    try {
      const newConfig = JSON.parse(configJson) as ApiConfig;
      
      // Валидация базовой структуры
      if (!newConfig.availableConnections || !Array.isArray(newConfig.availableConnections)) {
        throw new Error('Неверная структура конфигурации');
      }

      currentConfig = newConfig;
      saveConfig();
      return true;
    } catch (error) {
      console.error('Ошибка импорта конфигурации:', error);
      return false;
    }
  },

  /**
   * Сброс к дефолтной конфигурации
   */
  resetToDefault(): void {
    currentConfig = { ...initialConfig };
    saveConfig();
  }
};

/**
 * Хук для получения текущего URL API
 * Используется во всех HTTP клиентах
 */
export const getApiBaseUrl = (): string => {
  return apiConfigService.getCurrentApiUrl();
};

/**
 * Хук для проверки mock режима
 */
export const isApiMockMode = (): boolean => {
  return apiConfigService.isMockMode();
};

// Экспорт для window (в dev режиме)
if (import.meta.env.DEV) {
  // @ts-ignore
  window.apiConfigService = apiConfigService;
  console.log('🛠️ API Config Service доступен через window.apiConfigService');
}