/**
 * 🔄 СЕРВИС ЧАСТИЧНОЙ МИГРАЦИИ НА БД
 * 
 * Позволяет переключать отдельные разделы приложения на реальную БД,
 * в то время как остальные продолжают работать с mock данными
 */

import { apiConfigService, DatabaseConnection } from '@/services/apiConfigService';
import { PersistentStorage } from '@/utils/persistentStorage';

export type ServiceModule = 
  | 'networks'
  | 'nomenclature' 
  | 'users'
  | 'equipment'
  | 'components'
  | 'commandTemplates'
  | 'connections'
  | 'prices'
  | 'messages'
  | 'auditLog'
  | 'workflows'
  | 'tanks'
  | 'tradingPoints'
  | 'operations'
  | 'shiftReports';

export interface ServiceMigrationConfig {
  moduleId: ServiceModule;
  moduleName: string;
  description: string;
  migrationStatus: 'mock' | 'database' | 'migrating' | 'error';
  connectionId?: string;
  lastMigrated?: Date;
  errorMessage?: string;
  apiEndpoints: string[];
  dependencies: ServiceModule[];
  priority: 'high' | 'medium' | 'low';
}

export interface PartialMigrationConfig {
  globalDefault: 'mock' | 'database';
  serviceOverrides: Record<ServiceModule, {
    status: 'mock' | 'database';
    connectionId?: string;
    lastUpdated: Date;
  }>;
  lastUpdated: Date;
}

// Конфигурация сервисов для частичной миграции
const serviceConfigs: Record<ServiceModule, ServiceMigrationConfig> = {
  networks: {
    moduleId: 'networks',
    moduleName: 'Торговые сети',
    description: 'Управление торговыми сетями и торговыми точками',
    migrationStatus: 'mock',
    apiEndpoints: ['/networks', '/trading-points'],
    dependencies: [],
    priority: 'high'
  },
  nomenclature: {
    moduleId: 'nomenclature', 
    moduleName: 'Номенклатура топлива',
    description: 'Справочник видов топлива и внешних кодов',
    migrationStatus: 'mock',
    apiEndpoints: ['/nomenclature', '/external-codes'],
    dependencies: ['networks'],
    priority: 'high'
  },
  users: {
    moduleId: 'users',
    moduleName: 'Пользователи и роли',
    description: 'Управление пользователями, ролями и правами доступа',
    migrationStatus: 'mock',
    apiEndpoints: ['/users', '/roles', '/permissions'],
    dependencies: [],
    priority: 'high'
  },
  equipment: {
    moduleId: 'equipment',
    moduleName: 'Оборудование',
    description: 'Управление оборудованием АЗС',
    migrationStatus: 'mock', 
    apiEndpoints: ['/equipment', '/equipment-templates'],
    dependencies: ['networks', 'users'],
    priority: 'medium'
  },
  components: {
    moduleId: 'components',
    moduleName: 'Компоненты оборудования',
    description: 'Компоненты и их шаблоны',
    migrationStatus: 'mock',
    apiEndpoints: ['/components', '/component-templates'],
    dependencies: ['equipment'],
    priority: 'medium'
  },
  commandTemplates: {
    moduleId: 'commandTemplates',
    moduleName: 'Шаблоны команд',
    description: 'API шаблоны команд для оборудования',
    migrationStatus: 'mock',
    apiEndpoints: ['/command-templates'],
    dependencies: ['equipment', 'components'],
    priority: 'medium'
  },
  connections: {
    moduleId: 'connections',
    moduleName: 'Настройки подключений',
    description: 'Настройки подключений к внешним системам',
    migrationStatus: 'mock',
    apiEndpoints: ['/connections'],
    dependencies: [],
    priority: 'low'
  },
  prices: {
    moduleId: 'prices',
    moduleName: 'Цены на топливо', 
    description: 'Управление ценами и тарифами',
    migrationStatus: 'mock',
    apiEndpoints: ['/prices', '/price-history'],
    dependencies: ['networks', 'nomenclature'],
    priority: 'low'
  },
  messages: {
    moduleId: 'messages',
    moduleName: 'Сообщения и поддержка',
    description: 'Система тикетов и уведомлений',
    migrationStatus: 'mock',
    apiEndpoints: ['/messages', '/tickets', '/notifications'],
    dependencies: ['users'],
    priority: 'low'
  },
  auditLog: {
    moduleId: 'auditLog',
    moduleName: 'Журнал аудита',
    description: 'Логирование действий пользователей',
    migrationStatus: 'mock',
    apiEndpoints: ['/audit-log'],
    dependencies: ['users'],
    priority: 'low'
  },
  workflows: {
    moduleId: 'workflows',
    moduleName: 'Регламенты',
    description: 'Бизнес-процессы и workflow',
    migrationStatus: 'mock',
    apiEndpoints: ['/workflows'],
    dependencies: ['users', 'equipment'],
    priority: 'low'
  },
  tanks: {
    moduleId: 'tanks',
    moduleName: 'Резервуары',
    description: 'Управление резервуарами АЗС',
    migrationStatus: 'mock',
    apiEndpoints: ['/tanks'],
    dependencies: ['networks', 'nomenclature'],
    priority: 'medium'
  },
  tradingPoints: {
    moduleId: 'tradingPoints',
    moduleName: 'Торговые точки',
    description: 'Управление торговыми точками',
    migrationStatus: 'mock',
    apiEndpoints: ['/trading-points'],
    dependencies: ['networks'],
    priority: 'high'
  },
  
  operations: {
    moduleId: 'operations',
    moduleName: 'Операции и транзакции',
    description: 'Управление операциями заправки, инкассации, диагностики',
    migrationStatus: 'mock',
    apiEndpoints: ['/operations', '/operations/statistics', '/operations/search'],
    dependencies: ['tradingPoints'],
    priority: 'high'
  },
  
  shiftReports: {
    moduleId: 'shiftReports',
    moduleName: 'Сменные отчеты',
    description: 'Сменные отчеты по форме 25-НП с закрытием смен и синхронизацией с ФНС',
    migrationStatus: 'mock',
    apiEndpoints: ['/shift-reports', '/shift-reports/statistics', '/shift-reports/synchronize'],
    dependencies: ['tradingPoints', 'operations'],
    priority: 'high'
  }
};

// Начальная конфигурация частичной миграции
const initialPartialConfig: PartialMigrationConfig = {
  globalDefault: 'mock',
  serviceOverrides: {} as any,
  lastUpdated: new Date()
};

// Загружаем конфигурацию из localStorage
let partialConfig: PartialMigrationConfig = PersistentStorage.load<PartialMigrationConfig>('partial_migration_config', initialPartialConfig);

// Функция сохранения
const savePartialConfig = () => {
  partialConfig.lastUpdated = new Date();
  PersistentStorage.save('partial_migration_config', partialConfig);
};

/**
 * Сервис частичной миграции
 */
export const partialMigrationService = {
  // === УПРАВЛЕНИЕ КОНФИГУРАЦИЕЙ ===

  /**
   * Получить конфигурацию всех сервисов
   */
  getAllServiceConfigs(): ServiceMigrationConfig[] {
    return Object.values(serviceConfigs).map(config => ({
      ...config,
      migrationStatus: this.getServiceStatus(config.moduleId),
      connectionId: partialConfig.serviceOverrides[config.moduleId]?.connectionId,
      lastMigrated: partialConfig.serviceOverrides[config.moduleId]?.lastUpdated
    }));
  },

  /**
   * Получить конфигурацию конкретного сервиса
   */
  getServiceConfig(moduleId: ServiceModule): ServiceMigrationConfig {
    const baseConfig = serviceConfigs[moduleId];
    if (!baseConfig) {
      throw new Error(`Неизвестный модуль: ${moduleId}`);
    }

    return {
      ...baseConfig,
      migrationStatus: this.getServiceStatus(moduleId),
      connectionId: partialConfig.serviceOverrides[moduleId]?.connectionId,
      lastMigrated: partialConfig.serviceOverrides[moduleId]?.lastUpdated
    };
  },

  /**
   * Получить статус конкретного сервиса
   */
  getServiceStatus(moduleId: ServiceModule): 'mock' | 'database' {
    return partialConfig.serviceOverrides[moduleId]?.status || partialConfig.globalDefault;
  },

  /**
   * Получить URL для конкретного сервиса
   */
  getServiceApiUrl(moduleId: ServiceModule): string {
    const override = partialConfig.serviceOverrides[moduleId];
    
    if (override && override.status === 'database' && override.connectionId) {
      // Используем специальное подключение для этого сервиса
      const connections = apiConfigService.getAllConnections();
      const connection = connections.find(c => c.id === override.connectionId);
      return connection?.url || apiConfigService.getCurrentApiUrl();
    }
    
    if (this.getServiceStatus(moduleId) === 'database') {
      // Используем глобальное подключение
      return apiConfigService.getCurrentApiUrl();
    }
    
    // Mock режим
    return 'mock';
  },

  /**
   * Проверить, использует ли сервис mock данные
   */
  isServiceMockMode(moduleId: ServiceModule): boolean {
    return this.getServiceApiUrl(moduleId) === 'mock';
  },

  // === ПЕРЕКЛЮЧЕНИЕ СЕРВИСОВ ===

  /**
   * Переключить сервис на БД
   */
  async migrateServiceToDatabase(
    moduleId: ServiceModule, 
    connectionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Проверяем зависимости
      const config = serviceConfigs[moduleId];
      const unmigratedDeps = config.dependencies.filter(depId => 
        this.getServiceStatus(depId) === 'mock'
      );

      if (unmigratedDeps.length > 0) {
        return {
          success: false,
          error: `Сначала нужно перевести зависимости: ${unmigratedDeps.map(id => serviceConfigs[id].moduleName).join(', ')}`
        };
      }

      // Проверяем доступность подключения
      if (connectionId) {
        const testResult = await apiConfigService.testConnection(connectionId);
        if (!testResult.success) {
          return {
            success: false,
            error: `Подключение недоступно: ${testResult.error}`
          };
        }
      }

      // Выполняем переключение
      partialConfig.serviceOverrides[moduleId] = {
        status: 'database',
        connectionId: connectionId || apiConfigService.getCurrentConfig().currentConnectionId,
        lastUpdated: new Date()
      };

      savePartialConfig();

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Вернуть сервис к mock данным
   */
  revertServiceToMock(moduleId: ServiceModule): { success: boolean; error?: string } {
    try {
      // Проверяем, есть ли зависимые сервисы
      const dependentServices = Object.values(serviceConfigs).filter(config =>
        config.dependencies.includes(moduleId) && 
        this.getServiceStatus(config.moduleId) === 'database'
      );

      if (dependentServices.length > 0) {
        return {
          success: false,
          error: `Сначала нужно вернуть зависимые сервисы: ${dependentServices.map(s => s.moduleName).join(', ')}`
        };
      }

      // Удаляем override (возврат к global default)
      delete partialConfig.serviceOverrides[moduleId];
      savePartialConfig();

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Массовое переключение сервисов
   */
  async migrateBatch(
    moduleIds: ServiceModule[], 
    connectionId?: string
  ): Promise<Record<ServiceModule, { success: boolean; error?: string }>> {
    const results: Record<string, any> = {};
    
    // Сортируем по приоритету и зависимостям
    const sortedModules = this.getSortedMigrationOrder(moduleIds);
    
    for (const moduleId of sortedModules) {
      results[moduleId] = await this.migrateServiceToDatabase(moduleId, connectionId);
      
      // При ошибке останавливаемся
      if (!results[moduleId].success) {
        break;
      }
    }

    return results;
  },

  // === АНАЛИЗ И ПЛАНИРОВАНИЕ ===

  /**
   * Получить план миграции с учетом зависимостей
   */
  getMigrationPlan(targetModules: ServiceModule[]): {
    order: ServiceModule[];
    conflicts: string[];
    recommendations: string[];
  } {
    const conflicts: string[] = [];
    const recommendations: string[] = [];
    
    // Добавляем все зависимости
    const allModules = new Set<ServiceModule>();
    const addDependencies = (moduleId: ServiceModule) => {
      if (allModules.has(moduleId)) return;
      
      allModules.add(moduleId);
      const config = serviceConfigs[moduleId];
      config.dependencies.forEach(depId => addDependencies(depId));
    };

    targetModules.forEach(addDependencies);
    
    // Проверяем конфликты
    for (const moduleId of allModules) {
      const config = serviceConfigs[moduleId];
      const unmigratedDeps = config.dependencies.filter(depId => 
        !allModules.has(depId) && this.getServiceStatus(depId) === 'mock'
      );
      
      if (unmigratedDeps.length > 0) {
        conflicts.push(`${config.moduleName} требует: ${unmigratedDeps.map(id => serviceConfigs[id].moduleName).join(', ')}`);
      }
    }

    // Создаем рекомендации
    if (allModules.size > targetModules.length) {
      recommendations.push(`Будут также перенесены зависимости: ${Array.from(allModules).filter(id => !targetModules.includes(id)).map(id => serviceConfigs[id].moduleName).join(', ')}`);
    }

    return {
      order: this.getSortedMigrationOrder(Array.from(allModules)),
      conflicts,
      recommendations
    };
  },

  /**
   * Получить статистику миграции
   */
  getMigrationStats() {
    const allServices = Object.keys(serviceConfigs);
    const migratedServices = allServices.filter(id => 
      this.getServiceStatus(id as ServiceModule) === 'database'
    );

    return {
      total: allServices.length,
      migrated: migratedServices.length,
      remaining: allServices.length - migratedServices.length,
      percentage: Math.round((migratedServices.length / allServices.length) * 100),
      migratedServices: migratedServices.map(id => serviceConfigs[id as ServiceModule].moduleName),
      remainingServices: allServices.filter(id => 
        this.getServiceStatus(id as ServiceModule) === 'mock'
      ).map(id => serviceConfigs[id as ServiceModule].moduleName)
    };
  },

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  /**
   * Получить отсортированный порядок миграции
   */
  getSortedMigrationOrder(moduleIds: ServiceModule[]): ServiceModule[] {
    const visited = new Set<ServiceModule>();
    const result: ServiceModule[] = [];

    const visit = (moduleId: ServiceModule) => {
      if (visited.has(moduleId)) return;
      
      visited.add(moduleId);
      const config = serviceConfigs[moduleId];
      
      // Сначала обрабатываем зависимости
      config.dependencies
        .filter(depId => moduleIds.includes(depId))
        .forEach(visit);
      
      result.push(moduleId);
    };

    // Сортируем по приоритету
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedModules = moduleIds.sort((a, b) => {
      const priorityA = priorityOrder[serviceConfigs[a].priority];
      const priorityB = priorityOrder[serviceConfigs[b].priority];
      return priorityA - priorityB;
    });

    sortedModules.forEach(visit);
    return result;
  },

  /**
   * Тестирование доступности API для сервиса
   */
  async testServiceConnection(moduleId: ServiceModule): Promise<{
    success: boolean;
    error?: string;
    endpoints: Record<string, boolean>;
  }> {
    const config = serviceConfigs[moduleId];
    const baseUrl = this.getServiceApiUrl(moduleId);
    
    if (baseUrl === 'mock') {
      return {
        success: true,
        endpoints: config.apiEndpoints.reduce((acc, endpoint) => {
          acc[endpoint] = true; // Mock всегда доступен
          return acc;
        }, {} as Record<string, boolean>)
      };
    }

    const results: Record<string, boolean> = {};
    let overallSuccess = true;

    for (const endpoint of config.apiEndpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        results[endpoint] = response.ok;
        if (!response.ok) overallSuccess = false;
      } catch (error) {
        results[endpoint] = false;
        overallSuccess = false;
      }
    }

    return {
      success: overallSuccess,
      error: overallSuccess ? undefined : 'Некоторые endpoints недоступны',
      endpoints: results
    };
  },

  // === УТИЛИТЫ ===

  /**
   * Экспорт конфигурации частичной миграции
   */
  exportPartialConfig(): string {
    return JSON.stringify({
      partialConfig,
      serviceConfigs,
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  /**
   * Сброс к настройкам по умолчанию
   */
  resetPartialConfig(): void {
    partialConfig = { ...initialPartialConfig };
    savePartialConfig();
  }
};

// Экспорт для window (в dev режиме)
if (import.meta.env.DEV) {
  // @ts-ignore
  window.partialMigrationService = partialMigrationService;
}