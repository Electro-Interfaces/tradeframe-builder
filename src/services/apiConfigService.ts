/**
 * 🛠️ СЕРВИС УПРАВЛЕНИЯ КОНФИГУРАЦИЕЙ API
 * 
 * Централизованное управление настройками подключения к БД через UI
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { supabaseService } from '@/services/supabaseServiceClient';
import { createClient } from '@supabase/supabase-js';
import { errorLogService } from './errorLogService';

export interface DatabaseConnection {
  id: string;
  name: string;
  url: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'supabase' | 'external-api'; // ❌ MOCK УДАЛЕН
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
    // Специфичные настройки для Supabase
    apiKey?: string;
    serviceRoleKey?: string;
    schema?: string;
    autoApiKey?: boolean;
    // Настройки для внешнего API
    username?: string;
    password?: string;
    authType?: 'basic' | 'bearer' | 'none';
    loginEndpoint?: string;
    swaggerUrl?: string;
  };
}

export interface ApiConfig {
  currentConnectionId: string;
  availableConnections: DatabaseConnection[];
  debugMode: boolean;
  lastUpdated: Date;
}

// Начальная конфигурация (все параметры должны настраиваться через UI)
const initialConfig: ApiConfig = {
  currentConnectionId: 'supabase-db',
  debugMode: import.meta.env.DEV || false,
  lastUpdated: new Date(),
  availableConnections: [
    // ❌ MOCK ПОДКЛЮЧЕНИЕ УДАЛЕНО ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
    {
      id: 'local-db',
      name: 'Локальная БД',
      url: '', // URL должен быть настроен через UI
      type: 'postgresql',
      description: 'Локальная PostgreSQL база данных',
      isActive: false,
      isDefault: true,
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
      url: '', // URL должен быть настроен через UI
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
    },
    {
      id: 'supabase-db',
      name: 'Supabase БД',
      url: '', // URL должен быть настроен через UI
      type: 'supabase',
      description: 'Supabase PostgreSQL база данных с REST API (ПРАВИЛЬНЫЙ проект для продуктивной системы)',
      isActive: true,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 8000,
        retryAttempts: 3,
        ssl: true,
        // API ключи должны быть настроены через раздел "Обмен данными"
        apiKey: '',
        serviceRoleKey: '',
        schema: 'public',
        autoApiKey: true
      }
    },
    {
      id: 'trading-network-api',
      name: 'API торговой сети',
      url: '', // URL настраивается через раздел "Обмен данными"
      type: 'external-api',
      description: 'Внешний API торговой сети - параметры берутся из раздела "Обмен данными" (localStorage: trading_network_config)',
      isActive: false,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 30000,
        retryAttempts: 3,
        ssl: true,
        authType: 'basic',
        // Учетные данные настраиваются через раздел "Обмен данными"
        username: '',
        password: '',
        swaggerUrl: ''
      }
    }
  ]
};

// Загружаем конфигурацию из localStorage
let currentConfig: ApiConfig = PersistentStorage.load<ApiConfig>('api_config', initialConfig);

/**
 * Создает Supabase клиент из настроек подключения
 */
function createSupabaseFromSettings(url: string, apiKey: string, schema: string = 'public') {
  const client = createClient(url, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema
    }
  });

  return {
    client,
    async testConnection() {
      try {
        const { data, error, count } = await client
          .from('operations')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          return {
            success: false,
            error: error.message,
            info: { error }
          };
        }
        
        return {
          success: true,
          info: { count, schema }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          info: { error }
        };
      }
    }
  };
}

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
   * Получить текущее активное подключение с обновленными параметрами из раздела "Обмен данными"
   */
  getCurrentConnection(): DatabaseConnection | null {
    const connection = currentConfig.availableConnections.find(
      conn => conn.id === currentConfig.currentConnectionId
    );
    
    if (!connection) return null;
    
    // Для внешнего API торговой сети - получаем реальные параметры из localStorage
    if (connection.id === 'trading-network-api') {
      try {
        const tradingNetworkConfig = localStorage.getItem('trading_network_config');
        if (tradingNetworkConfig) {
          const config = JSON.parse(tradingNetworkConfig);
          
          // Обновляем настройки подключения реальными данными из раздела "Обмен данными"
          return {
            ...connection,
            url: config.baseUrl || connection.url,
            settings: {
              ...connection.settings,
              username: config.username || connection.settings?.username,
              password: config.password || connection.settings?.password,
              authType: config.authType || connection.settings?.authType,
              timeout: config.timeout || connection.settings?.timeout
            }
          };
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить реальную конфигурацию торговой сети:', error);
      }
    }
    
    return connection;
  },

  /**
   * Получить URL для API запросов
   */
  getCurrentApiUrl(): string {
    const connection = this.getCurrentConnection();
    if (!connection) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Нет активного подключения к базе данных
      console.error('❌ КРИТИЧНО: Активное подключение к БД не найдено');
      throw new Error('Отсутствует активное подключение к базе данных. Система заблокирована.');
    }
    return connection.url;
  },

  /**
   * ❌ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ БЕЗОПАСНОСТИ: MOCK РЕЖИМ ПОЛНОСТЬЮ ЗАБЛОКИРОВАН
   */
  isMockMode(): boolean {
    // ✅ FAIL-SECURE: Mock режим навсегда заблокирован из соображений безопасности
    console.log('🔒 Mock режим заблокирован политикой безопасности');
    return false;
  },

  /**
   * Получить текущий режим API
   */
  getApiMode(): 'http' | 'supabase' { // ❌ MOCK УДАЛЕН ИЗ ВОЗМОЖНЫХ РЕЖИМОВ
    const connection = this.getCurrentConnection();
    if (!connection) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Нет подключения к базе данных
      throw new Error('Отсутствует подключение к базе данных. Система заблокирована.');
    }
    if (connection.type === 'supabase') {
      return 'supabase';
    }
    return 'http';
  },

  /**
   * Получить тип текущего подключения
   */
  getCurrentConnectionType(): string {
    const connection = this.getCurrentConnection();
    if (!connection) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Нет подключения к базе данных
      throw new Error('Отсутствует подключение к базе данных. Система заблокирована.');
    }
    return connection.type;
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

    // Проверяем доступность подключения
    {
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

    // ❌ MOCK ПОДКЛЮЧЕНИЯ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ

    // Supabase подключение
    if (connection.type === 'supabase') {
      const startTime = Date.now();
      try {
        const apiKey = connection.settings?.apiKey;
        if (!apiKey) {
          return {
            success: false,
            error: 'API ключ не настроен для Supabase подключения'
          };
        }

        const supabaseClient = createSupabaseFromSettings(
          connection.url, 
          apiKey, 
          connection.settings?.schema || 'public'
        );
        
        const testResult = await supabaseClient.testConnection();
        const responseTime = Date.now() - startTime;
        
        if (testResult.success) {
          return {
            success: true,
            responseTime,
            details: {
              type: 'supabase',
              url: connection.url,
              schema: connection.settings?.schema || 'public',
              ...testResult.info
            }
          };
        } else {
          return {
            success: false,
            error: testResult.error || 'Не удалось подключиться к Supabase',
            responseTime
          };
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          responseTime
        };
      }
    }

    // Тестируем внешний API с базовой аутентификацией
    if (connection.type === 'external-api') {
      const startTime = Date.now();
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        // Добавляем базовую аутентификацию
        if (connection.settings?.authType === 'basic' && connection.settings?.username && connection.settings?.password) {
          const credentials = btoa(`${connection.settings.username}:${connection.settings.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(connection.url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(connection.settings?.timeout || 10000)
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          let responseData = null;
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }

          return {
            success: true,
            responseTime,
            details: {
              type: 'external-api',
              url: connection.url,
              status: response.status,
              statusText: response.statusText,
              authType: connection.settings?.authType || 'none',
              response: responseData
            }
          };
        } else {
          const errorText = await response.text();
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`,
            responseTime
          };
        }
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        return {
          success: false,
          error: error.message || 'Ошибка подключения к внешнему API',
          responseTime
        };
      }
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
      secureMode: true, // ❌ MOCK РЕЖИМ ЗАБЛОКИРОВАН
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
 * ❌ MOCK РЕЖИМ НАВСЕГДА ЗАБЛОКИРОВАН - ПОЛИТИКА БЕЗОПАСНОСТИ
 */
export const isApiMockMode = (): boolean => {
  // ✅ FAIL-SECURE: Mock режим навсегда заблокирован
  console.warn('🔒 Mock режим заблокирован политикой безопасности физической торговой системы');
  return false;
};

// Экспорт для window (в dev режиме)
if (import.meta.env.DEV) {
  // @ts-ignore
  window.apiConfigService = apiConfigService;
  console.log('🛠️ API Config Service доступен через window.apiConfigService');
}