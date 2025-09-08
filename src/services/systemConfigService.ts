/**
 * 🗄️ СИСТЕМНЫЙ СЕРВИС КОНФИГУРАЦИИ
 * 
 * Заменяет localStorage на централизованное хранение в БД
 * Работает с таблицей system_config в Supabase
 */

import { supabaseConfigClient } from './supabaseConfigClient';

// Интерфейсы для системной конфигурации
export interface SystemConfig {
  id?: string;
  config_key: string;
  config_value: any;
  config_type?: string;
  description?: string;
  is_encrypted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  url: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mock' | 'supabase' | 'external-api';
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    timeout?: number;
    retryAttempts?: number;
    poolSize?: number;
    ssl?: boolean;
    apiKey?: string;
    serviceRoleKey?: string;
    schema?: string;
    autoApiKey?: boolean;
    username?: string;
    password?: string;
    authType?: 'basic' | 'bearer' | 'none';
  };
}

export interface DatabaseConfig {
  currentConnectionId: string;
  availableConnections: DatabaseConnection[];
  debugMode: boolean;
  lastUpdated: Date;
}

class SystemConfigService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 30000; // 30 секунд

  /**
   * Получить конфигурацию по ключу
   */
  async getConfig<T = any>(key: string, useCache = true): Promise<T | null> {
    console.log(`🔍 SystemConfigService.getConfig(${key})`);
    
    try {
      // Проверяем кеш
      if (useCache && this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`✅ Возвращаем из кеша: ${key}`);
          return cached.value;
        }
      }

      // Загружаем из базы данных
      const { data, error } = await supabaseConfigClient
        .from('system_config')
        .select('*')
        .eq('config_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️ Конфигурация ${key} не найдена`);
          return null;
        }
        throw error;
      }

      const value = data.config_value;
      
      // Сохраняем в кеш
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });

      console.log(`✅ Загружена конфигурация: ${key}`);
      return value;

    } catch (error) {
      console.error(`❌ Ошибка загрузки конфигурации ${key}:`, error);
      throw error;
    }
  }

  /**
   * Сохранить конфигурацию
   */
  async setConfig(key: string, value: any, configType = 'general', description?: string): Promise<void> {
    console.log(`💾 SystemConfigService.setConfig(${key})`);
    
    try {
      const configData: Partial<SystemConfig> = {
        config_key: key,
        config_value: value,
        config_type: configType,
        description,
        updated_at: new Date().toISOString()
      };

      // Пытаемся обновить существующую запись
      const { data: existing } = await supabaseConfigClient
        .from('system_config')
        .select('id')
        .eq('config_key', key)
        .single();

      if (existing) {
        // Обновляем существующую
        const { error } = await supabaseConfigClient
          .from('system_config')
          .update(configData)
          .eq('config_key', key);

        if (error) throw error;
        console.log(`✅ Обновлена конфигурация: ${key}`);
      } else {
        // Создаем новую
        const { error } = await supabaseConfigClient
          .from('system_config')
          .insert(configData);

        if (error) throw error;
        console.log(`✅ Создана конфигурация: ${key}`);
      }

      // Очищаем кеш для этого ключа
      this.cache.delete(key);

    } catch (error) {
      console.error(`❌ Ошибка сохранения конфигурации ${key}:`, error);
      throw error;
    }
  }

  /**
   * Получить все конфигурации по типу
   */
  async getConfigsByType(configType: string): Promise<SystemConfig[]> {
    console.log(`🔍 SystemConfigService.getConfigsByType(${configType})`);
    
    try {
      const { data, error } = await supabaseConfigClient
        .from('system_config')
        .select('*')
        .eq('config_type', configType)
        .order('config_key');

      if (error) throw error;

      console.log(`✅ Загружено конфигураций типа ${configType}: ${data?.length || 0}`);
      return data || [];

    } catch (error) {
      console.error(`❌ Ошибка загрузки конфигураций типа ${configType}:`, error);
      throw error;
    }
  }

  /**
   * Получить конфигурацию подключений к БД
   */
  async getDatabaseConfig(): Promise<DatabaseConfig | null> {
    console.log('🔍 SystemConfigService.getDatabaseConfig()');
    
    try {
      const config = await this.getConfig<DatabaseConfig>('database_connections');
      
      if (!config) {
        throw new Error('Конфигурация базы данных не найдена. Настройте подключение в разделе "Обмен данными".');
      }

      // Преобразуем даты из строк в объекты Date
      if (config.availableConnections) {
        config.availableConnections = config.availableConnections.map(conn => ({
          ...conn,
          createdAt: new Date(conn.createdAt),
          updatedAt: new Date(conn.updatedAt)
        }));
      }

      if (config.lastUpdated) {
        config.lastUpdated = new Date(config.lastUpdated);
      }

      console.log(`✅ Загружена конфигурация БД: ${config.availableConnections?.length || 0} подключений`);
      return config;

    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации БД:', error);
      
      throw new Error('Не удалось загрузить конфигурацию базы данных: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
    }
  }

  /**
   * Сохранить конфигурацию подключений к БД
   */
  async setDatabaseConfig(config: DatabaseConfig): Promise<void> {
    console.log('💾 SystemConfigService.setDatabaseConfig()');
    
    // Обновляем время последнего изменения
    config.lastUpdated = new Date();

    await this.setConfig(
      'database_connections', 
      config, 
      'database', 
      'Конфигурация подключений к базам данных'
    );
  }

  /**
   * Получить текущее активное подключение
   */
  async getCurrentConnection(): Promise<DatabaseConnection | null> {
    console.log('🔍 SystemConfigService.getCurrentConnection()');
    
    const config = await this.getDatabaseConfig();
    if (!config) return null;

    const current = config.availableConnections.find(
      conn => conn.id === config.currentConnectionId
    );

    if (!current) {
      console.log('⚠️ Активное подключение не найдено');
      return null;
    }

    console.log(`✅ Текущее подключение: ${current.name} (${current.type})`);
    return current;
  }

  /**
   * Переключить активное подключение
   */
  async switchConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 SystemConfigService.switchConnection(${connectionId})`);
    
    try {
      const config = await this.getDatabaseConfig();
      if (!config) {
        return { success: false, error: 'Конфигурация БД не найдена' };
      }

      const connection = config.availableConnections.find(conn => conn.id === connectionId);
      if (!connection) {
        return { success: false, error: 'Подключение не найдено' };
      }

      // Обновляем текущее подключение
      config.currentConnectionId = connectionId;
      await this.setDatabaseConfig(config);

      console.log(`✅ Переключено на подключение: ${connection.name}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Ошибка переключения подключения:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
    }
  }

  /**
   * Очистить весь кеш
   */
  clearCache(): void {
    console.log('🗑️ Очистка кеша системной конфигурации');
    this.cache.clear();
  }

  /**
   * Fallback конфигурация для случаев когда БД недоступна
   */
  private getFallbackDatabaseConfig(): DatabaseConfig {
    return {
      currentConnectionId: 'supabase-main',
      debugMode: false,
      lastUpdated: new Date(),
      availableConnections: [
        {
          id: 'supabase-main',
          name: 'Основная БД Supabase',
          url: '',
          type: 'supabase',
          description: 'Основная база данных системы (fallback)',
          isActive: true,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            timeout: 8000,
            retryAttempts: 3,
            ssl: true,
            schema: 'public',
            autoApiKey: true,
            // API ключи должны загружаться из переменных окружения
            apiKey: '',
            serviceRoleKey: ''
          }
        },
        {
          id: 'mock-data',
          name: 'Демо данные (Mock)',
          url: 'localStorage',
          type: 'mock',
          description: 'Локальные демо-данные для разработки',
          isActive: false,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            timeout: 1000,
            retryAttempts: 3
          }
        }
      ]
    };
  }

  /**
   * Проверить доступность системы конфигурации
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Простая проверка - пытаемся прочитать любую конфигурацию
      await supabaseConfigClient
        .from('system_config')
        .select('id')
        .limit(1);

      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
}

// Экспорт singleton экземпляра
export const systemConfigService = new SystemConfigService();

// Совместимость с существующим кодом
export const isSystemConfigHealthy = async () => {
  const health = await systemConfigService.healthCheck();
  return health.healthy;
};