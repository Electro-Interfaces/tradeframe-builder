/**
 * Сервис для управления конфигурацией подключения к API торговой сети
 * КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ: Интегрирован с централизованной конфигурацией из раздела "Обмен данными"
 * Теперь использует systemConfigService для хранения настроек в базе данных
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';
import { systemConfigService } from './systemConfigService';
import { nomenclatureService } from './nomenclatureService';
import { FuelNomenclature } from '../types/nomenclature';
import { httpClient } from './universalHttpClient';

// Базовый интерфейс для всех типов маппинга
export interface BaseMapping {
  id: string;
  mappingType: 'fuel' | 'payment' | 'dispenser' | 'terminal' | 'equipment' | 'service';
  internalCode: string;      // Код в приложении
  internalName: string;      // Название в приложении
  apiCode: string | number;  // Код в API торговой сети
  apiName: string;           // Название в API
  networkId: string;         // ID сети
  category?: string;         // Категория/группа маппинга
  isActive: boolean;         // Активно ли маппинг
  priority: number;          // Приоритет при коллизиях
  lastSync?: Date;           // Последняя синхронизация
  syncStatus?: 'success' | 'error' | 'pending';
  metadata?: Record<string, any>; // Дополнительные данные
  createdAt: Date;
  updatedAt: Date;
}

// Специализированные маппинги
export interface FuelCodeMapping extends BaseMapping {
  mappingType: 'fuel';
  nomenclatureId?: string;   // Связь с записью номенклатуры
  density?: number;          // Плотность топлива
  octaneRating?: number;     // Октановое число
}

export interface PaymentMethodMapping extends BaseMapping {
  mappingType: 'payment';
  paymentType: 'card' | 'cash' | 'fuel_card' | 'mobile' | 'other';
  processingFee?: number;    // Комиссия за обработку
  isOnline?: boolean;        // Требует ли онлайн подключения
}

export interface DispenserMapping extends BaseMapping {
  mappingType: 'dispenser';
  dispenserNumber: number;   // Номер ТРК
  nozzleCount?: number;      // Количество пистолетов
  maxFlowRate?: number;      // Максимальная производительность
  installedDate?: Date;      // Дата установки
}

export interface TerminalMapping extends BaseMapping {
  mappingType: 'terminal';
  terminalType: 'payment' | 'fuel_management' | 'pos' | 'kiosk';
  serialNumber?: string;     // Серийный номер
  firmwareVersion?: string;  // Версия прошивки
  ipAddress?: string;        // IP адрес
}

export interface EquipmentMapping extends BaseMapping {
  mappingType: 'equipment';
  equipmentType: 'tank' | 'pump' | 'sensor' | 'valve' | 'other';
  model?: string;            // Модель оборудования
  manufacturer?: string;     // Производитель
  capacity?: number;         // Емкость/производительность
}

export interface ServiceMapping extends BaseMapping {
  mappingType: 'service';
  serviceType: 'fuel_sale' | 'car_wash' | 'shop' | 'maintenance' | 'other';
  unitPrice?: number;        // Цена за единицу
  currency?: string;         // Валюта
  taxRate?: number;          // Налоговая ставка
}

// Объединенный тип для всех маппингов
export type EntityMapping = 
  | FuelCodeMapping 
  | PaymentMethodMapping 
  | DispenserMapping 
  | TerminalMapping 
  | EquipmentMapping 
  | ServiceMapping;

// Настройки маппинга для конкретного типа сущности
export interface MappingTypeConfig {
  enabled: boolean;
  syncStrategy: 'manual' | 'auto' | 'hybrid';
  autoSyncInterval: number;  // минуты
  lastSync?: Date;
  syncErrors?: string[];
  conflictResolution: 'prefer_api' | 'prefer_internal' | 'manual';
  validationRules?: {
    requireApiMatch: boolean;
    allowDuplicates: boolean;
    mandatoryFields: string[];
  };
}

// Комплексная конфигурация маппинга для всех типов
export interface UniversalMappingConfig {
  enabled: boolean;
  globalSettings: {
    syncStrategy: 'manual' | 'auto' | 'hybrid';
    autoSyncInterval: number;
    conflictResolution: 'prefer_api' | 'prefer_internal' | 'manual';
    enableLogging: boolean;
    enableValidation: boolean;
  };
  typeConfigs: {
    fuel: MappingTypeConfig;
    payment: MappingTypeConfig;
    dispenser: MappingTypeConfig;
    terminal: MappingTypeConfig;
    equipment: MappingTypeConfig;
    service: MappingTypeConfig;
  };
  mappings: EntityMapping[];
  lastGlobalSync?: Date;
  syncStatistics?: {
    totalMappings: number;
    activeMappings: number;
    lastSyncDuration: number;
    errorCount: number;
    warningCount: number;
  };
}

// Результат синхронизации маппинга (расширенный)
export interface MappingSyncResult {
  success: boolean;
  mappingType?: string;
  networkId: string;
  results: {
    created: number;
    updated: number;
    deleted: number;
    conflicts: number;
    warnings: number;
  };
  errors: string[];
  warnings: string[];
  mappings: EntityMapping[];
  syncDuration: number;
  timestamp: Date;
  details?: {
    processedItems: number;
    skippedItems: number;
    apiCalls: number;
    cacheHits: number;
  };
}

// Интерфейс настроек торговой сети (расширенный)
export interface TradingNetworkConfig {
  enabled: boolean;
  baseUrl: string;
  systemId: string;
  defaultStationId: string;
  authType: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  endpoints: {
    tanks: string;
    transactions: string;
  };
  defaultParams: {
    refreshInterval: number;
    maxRecords: number;
    dateFormat: string;
  };
  // Универсальная система маппинга для всех типов данных
  universalMapping?: UniversalMappingConfig;
}

// Результат тестирования подключения
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  responseTime?: number;
  endpoint?: string;
  data?: any;
}

// Ключи для конфигурации
const TRADING_NETWORK_CONFIG_KEY = 'trading_network_config'; // Backward compatibility с localStorage
const SYSTEM_CONFIG_KEY = 'trading_network_integration'; // Новый ключ для системной конфигурации

// Дефолтные маппинги для всех типов сущностей
const defaultMappings: EntityMapping[] = [
  // Маппинги видов топлива
  {
    id: 'mapping_fuel_ai92',
    mappingType: 'fuel',
    internalCode: 'АИ-92',
    internalName: 'Бензин АИ-92',
    apiCode: 2,
    apiName: 'АИ-92',
    networkId: '',
    isActive: true,
    priority: 1,
    octaneRating: 92,
    createdAt: new Date(),
    updatedAt: new Date()
  } as FuelCodeMapping,
  {
    id: 'mapping_fuel_ai95',
    mappingType: 'fuel',
    internalCode: 'АИ-95',
    internalName: 'Бензин АИ-95',
    apiCode: 3,
    apiName: 'АИ-95',
    networkId: '',
    isActive: true,
    priority: 1,
    octaneRating: 95,
    createdAt: new Date(),
    updatedAt: new Date()
  } as FuelCodeMapping,
  {
    id: 'mapping_fuel_dt',
    mappingType: 'fuel',
    internalCode: 'ДТ',
    internalName: 'Дизельное топливо',
    apiCode: 5,
    apiName: 'Дизельное топливо',
    networkId: '',
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } as FuelCodeMapping,

  // Маппинги способов оплаты
  {
    id: 'mapping_payment_card',
    mappingType: 'payment',
    internalCode: 'CARD',
    internalName: 'Банковская карта',
    apiCode: 'BANK_CARD',
    apiName: 'Банковская карта',
    networkId: '',
    paymentType: 'card',
    isActive: true,
    priority: 1,
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as PaymentMethodMapping,
  {
    id: 'mapping_payment_cash',
    mappingType: 'payment',
    internalCode: 'CASH',
    internalName: 'Наличные',
    apiCode: 'CASH',
    apiName: 'Наличные деньги',
    networkId: '',
    paymentType: 'cash',
    isActive: true,
    priority: 1,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date()
  } as PaymentMethodMapping,
  {
    id: 'mapping_payment_fuel_card',
    mappingType: 'payment',
    internalCode: 'FUEL_CARD',
    internalName: 'Топливная карта',
    apiCode: 'CORPORATE_CARD',
    apiName: 'Корпоративная карта',
    networkId: '',
    paymentType: 'fuel_card',
    isActive: true,
    priority: 1,
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as PaymentMethodMapping,

  // Маппинги ТРК (топливораздаточных колонок)
  {
    id: 'mapping_dispenser_trk1',
    mappingType: 'dispenser',
    internalCode: 'TRK-001',
    internalName: 'ТРК №1',
    apiCode: 1,
    apiName: 'Dispenser 1',
    networkId: '',
    dispenserNumber: 1,
    nozzleCount: 4,
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } as DispenserMapping,
  {
    id: 'mapping_dispenser_trk2',
    mappingType: 'dispenser',
    internalCode: 'TRK-002',
    internalName: 'ТРК №2',
    apiCode: 2,
    apiName: 'Dispenser 2',
    networkId: '',
    dispenserNumber: 2,
    nozzleCount: 4,
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } as DispenserMapping,

  // Маппинги терминалов (ТЮД)
  {
    id: 'mapping_terminal_pos1',
    mappingType: 'terminal',
    internalCode: 'POS-001',
    internalName: 'Касса №1',
    apiCode: 'TERMINAL_1',
    apiName: 'Payment Terminal 1',
    networkId: '',
    terminalType: 'pos',
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } as TerminalMapping,

  // Маппинги оборудования
  {
    id: 'mapping_equipment_tank1',
    mappingType: 'equipment',
    internalCode: 'TANK-001',
    internalName: 'Резервуар №1 АИ-92',
    apiCode: 'TANK_001',
    apiName: 'Tank 1',
    networkId: '',
    equipmentType: 'tank',
    capacity: 50000,
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  } as EquipmentMapping
];

// Базовая конфигурация по умолчанию (без конкретных значений - они берутся из раздела "Обмен данными")
const defaultConfig: TradingNetworkConfig = {
  enabled: true, // По умолчанию включено для работы с резервуарами
  baseUrl: 'https://pos.autooplata.ru/tms', // Базовый URL торгового API
  systemId: '', // Будет браться динамически из выбранной сети
  defaultStationId: '', // Будет браться динамически из выбранной торговой точки
  authType: 'basic', // Используем Basic Auth для демонстрации
  username: 'UserApi', // Демонстрационные учетные данные
  password: 'PasswordApi', // Демонстрационные учетные данные
  apiKey: '', // Не используется для Basic Auth
  timeout: 30000,
  retryAttempts: 3,
  endpoints: {
    tanks: '/tanks',
    transactions: '/transactions'
  },
  defaultParams: {
    refreshInterval: 60,
    maxRecords: 1000,
    dateFormat: 'YYYY-MM-DDTHH:mm:ss'
  },
  universalMapping: {
    enabled: true,
    globalSettings: {
      syncStrategy: 'hybrid',
      autoSyncInterval: 60,
      conflictResolution: 'prefer_internal',
      enableLogging: true,
      enableValidation: true
    },
    typeConfigs: {
      fuel: {
        enabled: true,
        syncStrategy: 'hybrid',
        autoSyncInterval: 60,
        conflictResolution: 'prefer_internal',
        validationRules: {
          requireApiMatch: true,
          allowDuplicates: false,
          mandatoryFields: ['internalCode', 'internalName', 'apiCode']
        }
      },
      payment: {
        enabled: true,
        syncStrategy: 'manual',
        autoSyncInterval: 120,
        conflictResolution: 'prefer_internal',
        validationRules: {
          requireApiMatch: true,
          allowDuplicates: false,
          mandatoryFields: ['internalCode', 'paymentType']
        }
      },
      dispenser: {
        enabled: true,
        syncStrategy: 'manual',
        autoSyncInterval: 300,
        conflictResolution: 'prefer_internal',
        validationRules: {
          requireApiMatch: false,
          allowDuplicates: false,
          mandatoryFields: ['internalCode', 'dispenserNumber']
        }
      },
      terminal: {
        enabled: true,
        syncStrategy: 'manual',
        autoSyncInterval: 300,
        conflictResolution: 'prefer_internal',
        validationRules: {
          requireApiMatch: false,
          allowDuplicates: false,
          mandatoryFields: ['internalCode', 'terminalType']
        }
      },
      equipment: {
        enabled: true,
        syncStrategy: 'auto',
        autoSyncInterval: 180,
        conflictResolution: 'prefer_internal',
        validationRules: {
          requireApiMatch: false,
          allowDuplicates: true,
          mandatoryFields: ['internalCode', 'equipmentType']
        }
      },
      service: {
        enabled: true,
        syncStrategy: 'hybrid',
        autoSyncInterval: 120,
        conflictResolution: 'prefer_api',
        validationRules: {
          requireApiMatch: true,
          allowDuplicates: false,
          mandatoryFields: ['internalCode', 'serviceType']
        }
      }
    },
    mappings: defaultMappings,
    syncStatistics: {
      totalMappings: defaultMappings.length,
      activeMappings: defaultMappings.filter(m => m.isActive).length,
      lastSyncDuration: 0,
      errorCount: 0,
      warningCount: 0
    }
  }
};

class TradingNetworkConfigService {
  private initialized = false;

  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ TradingNetworkConfigService инициализирован с централизованной конфигурацией');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Ошибка инициализации TradingNetworkConfigService:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Проверить используется ли централизованная конфигурация
   */
  private async useSystemConfig(): Promise<boolean> {
    try {
      if (!this.initialized) await this.initialize();
      
      // Проверяем доступность системной конфигурации
      const health = await systemConfigService.healthCheck();
      console.log('🔄 TradingNetworkConfig: Проверка системной конфигурации:', health);
      return health.healthy;
    } catch (error) {
      console.warn('⚠️ Системная конфигурация недоступна, используется localStorage:', error);
      return false;
    }
  }

  /**
   * Получить текущую конфигурацию
   */
  async getConfig(): Promise<TradingNetworkConfig> {
    try {
      if (!this.initialized) await this.initialize();

      const useSystem = await this.useSystemConfig();
      
      if (useSystem) {
        // Загружаем из системной конфигурации
        console.log('🔄 TradingNetworkConfig: Загрузка из системной конфигурации');
        try {
          const systemConfig = await systemConfigService.getConfig(SYSTEM_CONFIG_KEY);
          if (systemConfig && systemConfig.value) {
            const parsed = typeof systemConfig.value === 'string' 
              ? JSON.parse(systemConfig.value) 
              : systemConfig.value;
            return { ...defaultConfig, ...parsed };
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки из системной конфигурации:', error);
          throw error;
        }
      }
      
      throw new Error('Система конфигурации недоступна. Проверьте подключение к базе данных.');
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации торговой сети:', error);
      throw error;
    }
  }

  /**
   * Синхронная версия для обратной совместимости (deprecated)
   */
  getConfigSync(): TradingNetworkConfig {
    try {
      const savedConfig = localStorage.getItem(TRADING_NETWORK_CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        return { ...defaultConfig, ...parsed };
      }
      return defaultConfig;
    } catch (error) {
      console.error('Failed to load trading network config:', error);
      return defaultConfig;
    }
  }

  /**
   * Сохранить конфигурацию
   */
  async saveConfig(config: TradingNetworkConfig): Promise<void> {
    try {
      if (!this.initialized) await this.initialize();

      const useSystem = await this.useSystemConfig();
      
      if (useSystem) {
        // Сохраняем в системную конфигурацию
        console.log('💾 TradingNetworkConfig: Сохранение в системную конфигурацию');
        try {
          await systemConfigService.setConfig(SYSTEM_CONFIG_KEY, {
            key: SYSTEM_CONFIG_KEY,
            value: config,
            description: 'Конфигурация интеграции с торговой сетью',
            is_active: true
          });
          console.log('✅ Конфигурация торговой сети сохранена в системную БД');
        } catch (error) {
          console.error('❌ Ошибка сохранения в системную конфигурацию:', error);
          throw error;
        }
      } else {
        throw new Error('Система конфигурации недоступна.');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения конфигурации торговой сети:', error);
      throw error;
    }
  }

  /**
   * Синхронная версия сохранения для обратной совместимости (deprecated)
   */
  saveConfigSync(config: TradingNetworkConfig): void {
    console.warn('⚠️ saveConfigSync() deprecated, используйте saveConfig()');
    try {
      localStorage.setItem(TRADING_NETWORK_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save trading network config:', error);
      throw new Error('Не удалось сохранить конфигурацию');
    }
  }

  /**
   * Сбросить к настройкам по умолчанию
   */
  async resetToDefault(): Promise<void> {
    if (!this.initialized) await this.initialize();

    const useSystem = await this.useSystemConfig();
    
    if (useSystem) {
      // Удаляем из системной конфигурации
      console.log('🗑️ TradingNetworkConfig: Сброс системной конфигурации');
      await systemConfigService.deleteConfig(SYSTEM_CONFIG_KEY);
      console.log('✅ Конфигурация торговой сети сброшена');
    } else {
      throw new Error('Система конфигурации недоступна.');
    }
  }

  /**
   * Синхронная версия сброса для обратной совместимости (deprecated)
   */
  resetToDefaultSync(): TradingNetworkConfig {
    console.warn('⚠️ resetToDefaultSync() deprecated, используйте resetToDefault()');
    try {
      localStorage.removeItem(TRADING_NETWORK_CONFIG_KEY);
      return defaultConfig;
    } catch (error) {
      console.error('Failed to reset trading network config:', error);
      throw new Error('Не удалось сбросить настройки');
    }
  }

  /**
   * Проверить подключение к API
   */
  async testConnection(config?: TradingNetworkConfig): Promise<ConnectionTestResult> {
    const configToTest = config || await this.getConfig();
    
    if (!configToTest.enabled) {
      return {
        success: false,
        error: 'Интеграция с торговой сетью отключена'
      };
    }

    try {
      // Используем proxy для обхода CORS
      const testUrl = `/api/trading-network${configToTest.endpoints.tanks}?system=${configToTest.systemId}&station=${configToTest.defaultStationId}`;
      
      const startTime = Date.now();
      
      // Создаем заголовки запроса (минимальные для избежания CORS блокировки)
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      // Добавляем аутентификацию
      if (configToTest.authType === 'basic' && configToTest.username && configToTest.password) {
        const authString = btoa(`${configToTest.username}:${configToTest.password}`);
        headers['Authorization'] = `Basic ${authString}`;
        console.log('🔐 Basic Auth:', { 
          username: configToTest.username, 
          password: configToTest.password,
          hasPassword: !!configToTest.password,
          authString: authString,
          fullHeader: `Basic ${authString}`
        });
      } else if (configToTest.authType === 'bearer' && configToTest.apiKey) {
        // Очищаем токен от лишних кавычек, которые могут добавляться от интерфейса
        const cleanToken = configToTest.apiKey.replace(/^["']|["']$/g, '');
        headers['Authorization'] = `Bearer ${cleanToken}`;
        console.log('🔐 Bearer Token:', { hasToken: !!cleanToken });
      }

      console.log('🌐 Testing URL:', testUrl);
      console.log('📋 Request headers:', headers);

      const response = await httpClient.get(configToTest.endpoints.tanks, {
        destination: 'external-api',
        useAuth: true,
        queryParams: {
          system: configToTest.systemId,
          station: configToTest.defaultStationId
        },
        timeout: configToTest.timeout
      });

      const responseTime = response.responseTime || 0;

      if (response.success) {
        console.log('✅ Response success:', response.data);
        return {
          success: true,
          responseTime,
          endpoint: `${configToTest.baseUrl}${configToTest.endpoints.tanks}`,
          data: response.data
        };
      } else {
        console.error('❌ Response error:', {
          status: response.status,
          error: response.error,
          endpoint: `${configToTest.baseUrl}${configToTest.endpoints.tanks}`
        });
        
        let errorMessage = response.error || `HTTP ${response.status}`;
        if (response.status === 403) {
          errorMessage += '\n🔐 Проверьте логин и пароль в настройках';
        }
        
        return {
          success: false,
          error: errorMessage,
          endpoint: `${configToTest.baseUrl}${configToTest.endpoints.tanks}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка сети',
        endpoint: `${configToTest.baseUrl}${configToTest.endpoints.tanks}`
      };
    }
  }

  /**
   * Получить API параметры (system и station) из базы данных по trading_point_id
   */
  async getApiParamsFromDB(tradingPointId: string): Promise<{ systemId: string, stationId: string } | null> {
    try {
      console.log(`🔍 Ищем торговую точку по ID: ${tradingPointId}`);
      
      // Используем универсальный HTTP клиент для получения API параметров
      const apiParamsResult = await httpClient.getApiParamsForTradingPoint(tradingPointId);
      
      if (apiParamsResult.success && apiParamsResult.systemId && apiParamsResult.stationId) {
        console.log(`✅ API параметры найдены: system=${apiParamsResult.systemId}, station=${apiParamsResult.stationId}`);
        return {
          systemId: apiParamsResult.systemId,
          stationId: apiParamsResult.stationId
        };
      } else {
        console.warn(`⚠️ Не удалось получить API параметры: ${apiParamsResult.error || 'неизвестная ошибка'}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Ошибка получения API параметров из БД:', error);
      return null;
    }
  }

  /**
   * Получить данные резервуаров
   */
  async getTanksData(tradingPointId?: string, stationId?: string): Promise<any[]> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      throw new Error('Интеграция с торговой сетью отключена');
    }

    let systemId = '';  // Будет получен из базы данных или останется пустым
    let targetStationId = stationId || '';  // Будет получен из базы данных или останется пустым

    // Если передан tradingPointId, получаем параметры из базы данных
    if (tradingPointId) {
      const apiParams = await this.getApiParamsFromDB(tradingPointId);
      if (apiParams) {
        systemId = apiParams.systemId;  // Убираем parseInt - используем как строку
        targetStationId = apiParams.stationId;  // Убираем parseInt - используем как строку
        console.log(`🎯 Используем API параметры из БД: system=${systemId}, station=${targetStationId}`);
      } else {
        console.warn('⚠️ Не удалось получить API параметры из БД, параметры останутся пустыми');
        console.log(`🔧 Параметры после неудачного поиска: system=${systemId}, station=${targetStationId}`);
      }
    }

    // Валидация: проверяем что у нас есть необходимые параметры
    if (!systemId || !targetStationId) {
      throw new Error(`Отсутствуют обязательные параметры API: systemId="${systemId}", stationId="${targetStationId}". Убедитесь что выбрана сеть и торговая точка.`);
    }

    console.log(`🌐 Формируем запрос с параметрами: system=${systemId}, station=${targetStationId}`);
    
    const response = await httpClient.get(config.endpoints.tanks, {
      destination: 'external-api',
      useAuth: true,
      queryParams: {
        system: systemId,
        station: targetStationId
      },
      timeout: config.timeout
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch tanks data');
    }

    return response.data;
  }

  /**
   * Получить данные транзакций
   */
  async getTransactionsData(params: {
    tradingPointId?: string;
    stationId?: string;
    dateFrom?: string;
    dateTo?: string;
    shiftNumber?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      throw new Error('Интеграция с торговой сетью отключена');
    }

    let systemId = '';
    let targetStationId = params.stationId || '';

    // Если передан tradingPointId, получаем параметры из базы данных
    if (params.tradingPointId) {
      const apiParams = await this.getApiParamsFromDB(params.tradingPointId);
      if (apiParams) {
        systemId = apiParams.systemId;
        targetStationId = apiParams.stationId;
        console.log(`🎯 Используем API параметры из БД для транзакций: system=${systemId}, station=${targetStationId}`);
      } else {
        console.warn('⚠️ Не удалось получить API параметры из БД для транзакций');
      }
    }

    // Если параметры не получены из БД, используем fallback
    if (!systemId) {
      systemId = config.systemId;
    }
    if (!targetStationId) {
      targetStationId = config.defaultStationId;
    }

    // Валидация: проверяем что у нас есть необходимые параметры
    if (!systemId || !targetStationId) {
      throw new Error(`Отсутствуют обязательные параметры API для транзакций: systemId="${systemId}", stationId="${targetStationId}".`);
    }

    console.log(`🌐 Формируем запрос транзакций с параметрами: system=${systemId}, station=${targetStationId}`);

    const queryParams: Record<string, string> = {
      system: systemId,
      station: targetStationId
    };

    // Добавляем дополнительные параметры
    if (params.dateFrom) {
      queryParams.dt_beg = params.dateFrom;
    }
    if (params.dateTo) {
      queryParams.dt_end = params.dateTo;
    }
    if (params.shiftNumber) {
      queryParams.shift = params.shiftNumber.toString();
    }
    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }

    const response = await httpClient.get(config.endpoints.transactions, {
      destination: 'external-api',
      useAuth: true,
      queryParams,
      timeout: config.timeout
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch transactions data');
    }

    return response.data;
  }

  /**
   * Проверить готовность конфигурации
   */
  async isConfigurationReady(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled && 
           !!config.baseUrl && 
           !!config.systemId && 
           !!config.defaultStationId;
  }

  /**
   * Синхронная версия проверки готовности для обратной совместимости (deprecated)
   */
  isConfigurationReadySync(): boolean {
    console.warn('⚠️ isConfigurationReadySync() deprecated, используйте isConfigurationReady()');
    throw new Error('Sync методы отключены. Используйте async методы.');
    return config.enabled && 
           !!config.baseUrl && 
           !!config.systemId && 
           !!config.defaultStationId;
  }

  /**
   * Получить статистику использования
   */
  async getUsageStats() {
    const config = await this.getConfig();
    const ready = await this.isConfigurationReady();
    return {
      enabled: config.enabled,
      configured: ready,
      baseUrl: config.baseUrl,
      systemId: config.systemId,
      authType: config.authType,
      endpoints: Object.keys(config.endpoints).length,
      storageType: await this.useSystemConfig() ? 'database' : 'localStorage'
    };
  }

  /**
   * Синхронная версия статистики для обратной совместимости (deprecated)
   */
  getUsageStatsSync() {
    console.warn('⚠️ getUsageStatsSync() deprecated, используйте getUsageStats()');
    throw new Error('Sync методы отключены. Используйте async методы.');
    return {
      enabled: config.enabled,
      configured: this.isConfigurationReadySync(),
      baseUrl: config.baseUrl,
      systemId: config.systemId,
      authType: config.authType,
      endpoints: Object.keys(config.endpoints).length
    };
  }

  /**
   * Валидация конфигурации
   */
  validateConfig(config: TradingNetworkConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
      errors.push('Некорректный базовый URL');
    }

    if (!config.systemId || config.systemId.trim().length === 0) {
      errors.push('Не указан ID системы');
    }

    if (!config.defaultStationId || config.defaultStationId.trim().length === 0) {
      errors.push('Не указан ID торговой точки по умолчанию');
    }

    if (config.authType === 'basic' && (!config.username || !config.password)) {
      errors.push('Для Basic Auth требуются логин и пароль');
    }

    if (config.authType === 'bearer' && !config.apiKey) {
      errors.push('Для Bearer Auth требуется API ключ');
    }

    if (config.timeout < 1000 || config.timeout > 300000) {
      errors.push('Timeout должен быть от 1 до 300 секунд');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Получить пример URL для тестирования
   */
  async getExampleUrls(config?: TradingNetworkConfig): Promise<{ tanks: string; transactions: string }> {
    const configToUse = config || await this.getConfig();
    
    return {
      tanks: `${configToUse.baseUrl}${configToUse.endpoints.tanks}?system=${configToUse.systemId}&station=${configToUse.defaultStationId}`,
      transactions: `${configToUse.baseUrl}${configToUse.endpoints.transactions}?system=${configToUse.systemId}&station=${configToUse.defaultStationId}&shift=6`
    };
  }

  /**
   * Синхронная версия получения примеров URL для обратной совместимости (deprecated)
   */
  getExampleUrlsSync(config?: TradingNetworkConfig): { tanks: string; transactions: string } {
    console.warn('⚠️ getExampleUrlsSync() deprecated, используйте getExampleUrls()');
    throw new Error('Sync методы отключены. Используйте async методы.');
    
    return {
      tanks: `${configToUse.baseUrl}${configToUse.endpoints.tanks}?system=${configToUse.systemId}&station=${configToUse.defaultStationId}`,
      transactions: `${configToUse.baseUrl}${configToUse.endpoints.transactions}?system=${configToUse.systemId}&station=${configToUse.defaultStationId}&shift=6`
    };
  }

}

// Создаем синглтон сервиса
export const tradingNetworkConfigService = new TradingNetworkConfigService();

// === НОВЫЕ МЕТОДЫ С ИСПОЛЬЗОВАНИЕМ УНИВЕРСАЛЬНОГО HTTP КЛИЕНТА ===

/**
 * 🔄 ОБНОВЛЕННЫЙ метод тестирования подключения
 * Использует универсальный HTTP клиент вместо прямого fetch
 */
/**
 * 🧪 Тест подключения к торговой сети с пользовательскими параметрами
 */
export async function testTradingNetworkConnectionWithParams(
  config?: TradingNetworkConfig, 
  systemId = '1', 
  stationId = '15'
): Promise<ConnectionTestResult> {
  console.log('🧪 Тест подключения к торговой сети с параметрами:', { systemId, stationId });
  
  if (!config) {
    const service = new TradingNetworkConfigService();
    config = service.getConfig();
  }

  if (!config.enabled) {
    return {
      success: false,
      error: 'Интеграция с торговой сетью отключена'
    };
  }

  try {
    // Импортируем HTTP клиент динамически
    const { httpClient } = await import('./universalHttpClient');

    // Тестируем эндпоинт резервуаров с пользовательскими параметрами
    const testEndpoint = config.endpoints.tanks;
    const queryParams = {
      system: systemId,   // Используем переданные параметры
      station: stationId  // Используем переданные параметры
    };

    console.log('🌐 Testing endpoint:', testEndpoint);
    console.log('📋 Query params:', queryParams);

    const response = await httpClient.get(testEndpoint, {
      destination: 'external-api',
      queryParams,
      timeout: config.timeout
    });

    console.log('🔍 HTTP Client Response:', response);

    if (response.success) {
      console.log('✅ Подключение через HTTP Client успешно');
      return {
        success: true,
        responseTime: response.responseTime,
        endpoint: `${config.baseUrl}${testEndpoint}?system=${systemId}&station=${stationId}`,
        data: response.data
      };
    } else {
      console.log('❌ Ошибка HTTP Client:', response.error);
      return {
        success: false,
        error: response.error || 'Неизвестная ошибка HTTP Client',
        endpoint: `${config.baseUrl}${testEndpoint}?system=${systemId}&station=${stationId}`
      };
    }
  } catch (error) {
    console.error('💥 Критическая ошибка тестирования:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      endpoint: `${config.baseUrl}${config.endpoints.tanks}?system=${systemId}&station=${stationId}`
    };
  }
}

export async function testTradingNetworkConnectionNew(config?: TradingNetworkConfig): Promise<ConnectionTestResult> {
  console.log('🧪 Новый тест подключения к торговой сети через HTTP Client');
  
  try {
    const configToTest = config || tradingNetworkConfigService.getConfigSync();
    
    if (!configToTest.enabled) {
      return {
        success: false,
        error: 'Trading network integration disabled'
      };
    }

    // Импортируем HTTP клиент динамически
    const { httpClient } = await import('./universalHttpClient');

    // Тестируем эндпоинт резервуаров
    const testEndpoint = configToTest.endpoints.tanks;
    const queryParams = {
      systemId: '1', // Тестовый system ID
      stationId: '1' // Тестовый station ID  
    };

    console.log('🌐 Testing endpoint:', testEndpoint);
    console.log('📋 Query params:', queryParams);

    const response = await httpClient.get(testEndpoint, {
      destination: 'external-api',
      queryParams,
      timeout: configToTest.timeout
    });

    console.log('🔍 HTTP Client Response:', response);

    if (response.success) {
      console.log('✅ Подключение через HTTP Client успешно');
      return {
        success: true,
        responseTime: response.responseTime,
        endpoint: `${configToTest.baseUrl}${testEndpoint}`,
        data: response.data
      };
    } else {
      console.error('❌ Ошибка HTTP Client:', response.error);
      return {
        success: false,
        error: response.error || 'HTTP Client request failed',
        endpoint: `${configToTest.baseUrl}${testEndpoint}`,
        responseTime: response.responseTime
      };
    }

  } catch (error: any) {
    console.error('❌ Критическая ошибка тестирования:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error during connection test'
    };
  }
}

/**
 * 🔄 ОБНОВЛЕННЫЙ метод получения данных резервуаров
 */
export async function getTanksDataNew(systemId: string, stationId: string): Promise<any> {
  console.log('🛢️ Получение данных резервуаров через HTTP Client');
  
  try {
    const config = await tradingNetworkConfigService.getConfig();
    
    if (!config.enabled) {
      throw new Error('Trading network integration disabled');
    }

    // Импортируем HTTP клиент
    const { httpClient } = await import('./universalHttpClient');

    const response = await httpClient.get(config.endpoints.tanks, {
      destination: 'external-api',
      queryParams: { systemId, stationId },
      timeout: config.timeout
    });

    if (response.success) {
      console.log('✅ Данные резервуаров получены через HTTP Client');
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to fetch tanks data');
    }

  } catch (error: any) {
    console.error('❌ Ошибка получения данных резервуаров:', error);
    throw error;
  }
}

/**
 * 🔄 ОБНОВЛЕННЫЙ метод получения операций
 */
export async function getTransactionsDataNew(
  systemId: string, 
  stationId: string, 
  params?: { startDate?: string; endDate?: string; limit?: number }
): Promise<any> {
  console.log('🧾 Получение данных операций через HTTP Client');
  
  try {
    const config = await tradingNetworkConfigService.getConfig();
    
    if (!config.enabled) {
      throw new Error('Trading network integration disabled');
    }

    // Импортируем HTTP клиент
    const { httpClient } = await import('./universalHttpClient');

    const queryParams = {
      systemId,
      stationId,
      ...params
    };

    const response = await httpClient.get(config.endpoints.transactions, {
      destination: 'external-api',
      queryParams,
      timeout: config.timeout
    });

    if (response.success) {
      console.log('✅ Данные операций получены через HTTP Client');
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to fetch transactions data');
    }

  } catch (error: any) {
    console.error('❌ Ошибка получения данных операций:', error);
    throw error;
  }
}

// Экспорт новых методов
export const newTradingNetworkConfigAPI = {
  testConnection: testTradingNetworkConnectionNew,
  getTanksData: getTanksDataNew,
  getTransactionsData: getTransactionsDataNew,
};

// Экспортируем также класс для тестирования
export { TradingNetworkConfigService };