/**
 * 🛠️ НОВЫЙ СЕРВИС УПРАВЛЕНИЯ КОНФИГУРАЦИЕЙ API
 * 
 * Заменяет localStorage на централизованное хранение в БД
 * Использует systemConfigService для работы с базой данных
 */

import { systemConfigService, DatabaseConnection, DatabaseConfig } from './systemConfigService';
import { PersistentStorage } from '@/utils/persistentStorage';

export interface ApiConfig {
  currentConnectionId: string;
  availableConnections: DatabaseConnection[];
  debugMode: boolean;
  lastUpdated: Date;
}

class ApiConfigServiceDB {
  private isInitialized = false;

  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Инициализация ApiConfigServiceDB...');

    try {
      // Проверяем доступность системы конфигурации
      const health = await systemConfigService.healthCheck();
      
      if (!health.healthy) {
        throw new Error('Система конфигурации недоступна. Проверьте подключение к базе данных.');
      }
      console.log('✅ Система конфигурации доступна');

      this.isInitialized = true;
      console.log('✅ ApiConfigServiceDB инициализирован');

    } catch (error) {
      console.error('❌ Ошибка инициализации ApiConfigServiceDB:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Получить текущую конфигурацию
   */
  async getCurrentConfig(): Promise<ApiConfig> {
    await this.initialize();

    console.log('🔍 ApiConfigServiceDB.getCurrentConfig()');

    if (!this.isInitialized) {
      throw new Error('Сервис конфигурации не инициализирован. Вызовите initialize() сначала.');
    }

    try {
      const dbConfig = await systemConfigService.getDatabaseConfig();
      
      if (!dbConfig) {
        throw new Error('Конфигурация базы данных не найдена. Настройте подключение в разделе "Обмен данными".');
      }

      // Преобразуем в формат ApiConfig
      const apiConfig: ApiConfig = {
        currentConnectionId: dbConfig.currentConnectionId,
        availableConnections: dbConfig.availableConnections,
        debugMode: dbConfig.debugMode,
        lastUpdated: dbConfig.lastUpdated
      };

      console.log(`✅ Конфигурация загружена из БД: ${apiConfig.availableConnections.length} подключений`);
      return apiConfig;

    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации из БД:', error);
      throw new Error('Не удалось загрузить конфигурацию из базы данных: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  }

  /**
   * Получить текущее активное подключение
   */
  async getCurrentConnection(): Promise<DatabaseConnection | null> {
    await this.initialize();

    console.log('🔍 ApiConfigServiceDB.getCurrentConnection()');

    if (!this.isInitialized) {
      throw new Error('Сервис конфигурации не инициализирован.');
    }

    try {
      const connection = await systemConfigService.getCurrentConnection();
      
      if (connection) {
        console.log(`✅ Текущее подключение из БД: ${connection.name} (${connection.type})`);
      } else {
        console.log('⚠️ Активное подключение не найдено в БД');
      }

      return connection;

    } catch (error) {
      console.error('❌ Ошибка получения текущего подключения:', error);
      
      throw new Error('Не удалось получить текущее подключение: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  }

  /**
   * Переключиться на другое подключение
   */
  async switchConnection(connectionId: string): Promise<{
    success: boolean;
    error?: string;
    connection?: DatabaseConnection;
  }> {
    await this.initialize();

    console.log(`🔄 ApiConfigServiceDB.switchConnection(${connectionId})`);

    if (!this.isInitialized) {
      throw new Error('Сервис конфигурации не инициализирован.');
    }

    try {
      const result = await systemConfigService.switchConnection(connectionId);
      
      if (result.success) {
        const connection = await systemConfigService.getCurrentConnection();
        console.log(`✅ Подключение переключено в БД: ${connection?.name}`);
        
        return {
          success: true,
          connection: connection || undefined
        };
      } else {
        console.error(`❌ Ошибка переключения подключения: ${result.error}`);
        return result;
      }

    } catch (error) {
      console.error('❌ Ошибка переключения подключения:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить URL для API запросов
   */
  async getCurrentApiUrl(): Promise<string> {
    const connection = await this.getCurrentConnection();
    if (!connection) {
      throw new Error('Активное подключение не найдено. Настройте подключение в разделе "Обмен данными".');
    }
    if (!connection.url) {
      throw new Error('URL подключения не настроен.');
    }
    return connection.url;
  }

  /**
   * Проверить используется ли mock режим
   * ОБНОВЛЕНО: ПРИНУДИТЕЛЬНО ОТКЛЮЧЕН MOCK РЕЖИМ
   */
  async isMockMode(): Promise<boolean> {
    // Mock режим полностью отключен - только реальные подключения
    return false;
  }

  /**
   * Получить тип текущего подключения
   */
  async getCurrentConnectionType(): Promise<string> {
    const connection = await this.getCurrentConnection();
    if (!connection) {
      throw new Error('Подключение не настроено.');
    }
    return connection.type;
  }

  /**
   * Получить все доступные подключения
   */
  async getAllConnections(): Promise<DatabaseConnection[]> {
    const config = await this.getCurrentConfig();
    return config.availableConnections;
  }

  /**
   * Получить статистику использования
   */
  async getUsageStats() {
    const connection = await this.getCurrentConnection();
    const config = await this.getCurrentConfig();
    const isMock = await this.isMockMode();
    
    return {
      currentConnection: connection?.name || 'Неизвестно',
      connectionType: connection?.type || 'unknown',
      totalConnections: config.availableConnections.length,
      mockMode: isMock,
      debugMode: config.debugMode,
      lastUpdated: config.lastUpdated,
      storageType: 'database'
    };
  }

  /**
   * Включить/выключить режим отладки
   */
  async setDebugMode(enabled: boolean): Promise<void> {
    await this.initialize();

    if (!this.isInitialized) {
      throw new Error('Сервис конфигурации не инициализирован.');
    }

    try {
      const dbConfig = await systemConfigService.getDatabaseConfig();
      if (dbConfig) {
        dbConfig.debugMode = enabled;
        await systemConfigService.setDatabaseConfig(dbConfig);
        console.log(`✅ Режим отладки ${enabled ? 'включен' : 'выключен'}`);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления режима отладки:', error);
    }
  }

  /**
   * Обновить подключение
   */
  async updateConnection(connectionId: string, updates: Partial<DatabaseConnection>): Promise<{
    success: boolean;
    error?: string;
  }> {
    await this.initialize();
    
    console.log(`🔄 ApiConfigServiceDB.updateConnection(${connectionId})`);

    if (!this.isInitialized) {
      throw new Error('Сервис конфигурации не инициализирован.');
    }

    try {
      const result = await systemConfigService.updateConnection(connectionId, updates);
      
      if (result.success) {
        console.log(`✅ Подключение ${connectionId} обновлено в БД`);
        // Очищаем кеш чтобы получить свежие данные
        this.clearCache();
      }
      
      return result;

    } catch (error) {
      console.error('❌ Ошибка обновления подключения:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Очистить кеш конфигурации
   */
  private clearCache(): void {
    // Если будет кеш - здесь его очистим
    console.log('🗑️ Cache cleared');
  }

  private updateConnectionLocalStorage(connectionId: string, updates: Partial<DatabaseConnection>): {
    success: boolean;
    error?: string;
  } {
    throw new Error('LocalStorage fallback отключен. Используйте только базу данных.');
  }
}

// Экспорт singleton экземпляра
export const apiConfigServiceDB = new ApiConfigServiceDB();

// Совместимость с существующим кодом
export const getApiBaseUrl = async (): Promise<string> => {
  return await apiConfigServiceDB.getCurrentApiUrl();
};

export const isApiMockMode = async (): Promise<boolean> => {
  return await apiConfigServiceDB.isMockMode();
};