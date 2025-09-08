/**
 * Универсальный сервис для управления маппингом всех типов сущностей
 * между приложением и API торговой сети
 * 
 * Поддерживает: топливо, способы оплаты, ТРК, терминалы, оборудование, услуги
 */

import { 
  EntityMapping, 
  MappingSyncResult, 
  UniversalMappingConfig, 
  TradingNetworkConfig,
  MappingTypeConfig,
  FuelCodeMapping,
  PaymentMethodMapping,
  DispenserMapping,
  TerminalMapping,
  EquipmentMapping,
  ServiceMapping
} from './tradingNetworkConfigService';
import { nomenclatureService } from './nomenclatureService';
import { tradingNetworkAPI } from './tradingNetworkAPI';
import { FuelNomenclature } from '../types/nomenclature';

// Типы для валидации маппингов
interface MappingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mappingType: string;
}

// Конфликты маппингов
interface MappingConflict {
  type: 'duplicate_api_code' | 'duplicate_internal_code' | 'inconsistent_data' | 'missing_required_field';
  mappingType: string;
  mappingId: string;
  conflictWith?: string;
  description: string;
  suggestedResolution: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Статистика маппингов
interface MappingStats {
  totalMappings: number;
  byType: Record<string, number>;
  activeMappings: number;
  inactiveMappings: number;
  conflictCount: number;
  lastSyncDate?: Date;
  syncSuccessRate: number;
}

class UniversalMappingService {
  private cachedMappings: Map<string, EntityMapping> = new Map();
  private mappingsByType: Map<string, Map<string, EntityMapping>> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 минут

  constructor() {
    this.initializeMappingsByType();
  }

  private initializeMappingsByType(): void {
    const mappingTypes = ['fuel', 'payment', 'dispenser', 'terminal', 'equipment', 'service'];
    mappingTypes.forEach(type => {
      this.mappingsByType.set(type, new Map());
    });
  }

  /**
   * Получить маппинг по внутреннему коду и типу
   */
  getMappingByInternalCode<T extends EntityMapping>(
    internalCode: string, 
    mappingType: T['mappingType'], 
    networkId?: string
  ): T | null {
    console.log(`🔍 Поиск маппинга ${mappingType}: ${internalCode}`);
    
    const typeMap = this.mappingsByType.get(mappingType);
    if (!typeMap) {
      console.warn(`⚠️ Неизвестный тип маппинга: ${mappingType}`);
      return null;
    }

    const key = networkId ? `${internalCode}_${networkId}` : internalCode;
    const mapping = typeMap.get(key);
    
    if (mapping && mapping.isActive) {
      console.log(`✅ Найден маппинг ${mappingType}: ${internalCode} → ${mapping.apiCode}`);
      return mapping as T;
    }

    console.log(`⚠️ Маппинг ${mappingType} для "${internalCode}" не найден`);
    return null;
  }

  /**
   * Получить маппинг по API коду и типу
   */
  getMappingByApiCode<T extends EntityMapping>(
    apiCode: string | number, 
    mappingType: T['mappingType'], 
    networkId?: string
  ): T | null {
    console.log(`🔍 Поиск маппинга ${mappingType} по API коду: ${apiCode}`);
    
    const typeMap = this.mappingsByType.get(mappingType);
    if (!typeMap) return null;

    for (const mapping of typeMap.values()) {
      if (mapping.apiCode === apiCode && 
          mapping.isActive && 
          (!networkId || mapping.networkId === networkId)) {
        console.log(`✅ Найден маппинг ${mappingType}: API ${apiCode} → ${mapping.internalCode}`);
        return mapping as T;
      }
    }

    console.log(`⚠️ Маппинг ${mappingType} для API кода ${apiCode} не найден`);
    return null;
  }

  /**
   * Получить все маппинги определенного типа
   */
  getMappingsByType<T extends EntityMapping>(
    mappingType: T['mappingType'], 
    networkId?: string, 
    activeOnly: boolean = false
  ): T[] {
    const typeMap = this.mappingsByType.get(mappingType);
    if (!typeMap) return [];

    const mappings = Array.from(typeMap.values()).filter(mapping => {
      if (networkId && mapping.networkId !== networkId) return false;
      if (activeOnly && !mapping.isActive) return false;
      return mapping.mappingType === mappingType;
    });

    return mappings as T[];
  }

  /**
   * Синхронизация маппингов определенного типа
   */
  async syncMappingsByType(
    config: TradingNetworkConfig,
    mappingType: EntityMapping['mappingType'],
    networkId: string
  ): Promise<MappingSyncResult> {
    console.log(`🔄 Синхронизация маппингов типа ${mappingType} для сети ${networkId}`);
    const startTime = Date.now();

    const result: MappingSyncResult = {
      success: false,
      mappingType,
      networkId,
      results: {
        created: 0,
        updated: 0,
        deleted: 0,
        conflicts: 0,
        warnings: 0
      },
      errors: [],
      warnings: [],
      mappings: [],
      syncDuration: 0,
      timestamp: new Date()
    };

    try {
      switch (mappingType) {
        case 'fuel':
          return await this.syncFuelMappings(config, networkId, result);
        case 'payment':
          return await this.syncPaymentMappings(config, networkId, result);
        case 'dispenser':
          return await this.syncDispenserMappings(config, networkId, result);
        case 'terminal':
          return await this.syncTerminalMappings(config, networkId, result);
        case 'equipment':
          return await this.syncEquipmentMappings(config, networkId, result);
        case 'service':
          return await this.syncServiceMappings(config, networkId, result);
        default:
          throw new Error(`Неподдерживаемый тип маппинга: ${mappingType}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка синхронизации ${mappingType}:`, error);
      result.errors.push(`Критическая ошибка: ${error.message}`);
    } finally {
      result.syncDuration = Date.now() - startTime;
      result.success = result.errors.length === 0;
    }

    return result;
  }

  /**
   * Синхронизация всех типов маппингов
   */
  async syncAllMappings(config: TradingNetworkConfig, networkId: string): Promise<MappingSyncResult[]> {
    console.log(`🔄 Полная синхронизация всех маппингов для сети ${networkId}`);
    
    const mappingTypes: EntityMapping['mappingType'][] = ['fuel', 'payment', 'dispenser', 'terminal', 'equipment', 'service'];
    const results: MappingSyncResult[] = [];

    for (const mappingType of mappingTypes) {
      const typeConfig = config.universalMapping?.typeConfigs[mappingType];
      if (typeConfig?.enabled) {
        console.log(`🔄 Синхронизация ${mappingType}...`);
        const result = await this.syncMappingsByType(config, mappingType, networkId);
        results.push(result);
        
        // Обновляем кэш после каждого типа
        this.updateCacheForType(mappingType, result.mappings);
      } else {
        console.log(`⏭️ Пропускаем ${mappingType} - отключен в конфигурации`);
      }
    }

    console.log(`✅ Синхронизация завершена: ${results.length} типов обработано`);
    return results;
  }

  /**
   * Синхронизация маппингов топлива
   */
  private async syncFuelMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Получаем номенклатуру топлива
      const nomenclature = await nomenclatureService.getNomenclature({ 
        networkId, 
        status: 'active' 
      });

      // Получаем API услуги
      const apiServices = await tradingNetworkAPI.getServices();
      
      // Обрабатываем каждую позицию номенклатуры
      for (const item of nomenclature) {
        const matchingService = this.findMatchingFuelService(item, apiServices);
        
        if (matchingService) {
          const mapping: FuelCodeMapping = {
            id: `fuel_${item.id}_${matchingService.service_code}`,
            mappingType: 'fuel',
            internalCode: item.internalCode,
            internalName: item.name,
            apiCode: matchingService.service_code,
            apiName: matchingService.service_name,
            networkId,
            nomenclatureId: item.id,
            isActive: true,
            priority: 1,
            lastSync: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          result.mappings.push(mapping);
          result.results.created++;
        } else {
          result.warnings.push(`Не найдено соответствие для топлива "${item.name}"`);
          result.results.warnings++;
        }
      }

      console.log(`✅ Синхронизация топлива: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации топлива:', error);
      result.errors.push(`Ошибка синхронизации топлива: ${error.message}`);
      return result;
    }
  }

  /**
   * Синхронизация маппингов способов оплаты
   */
  private async syncPaymentMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Стандартные способы оплаты из приложения
      const internalPaymentMethods = [
        { code: 'CARD', name: 'Банковская карта', type: 'card' as const },
        { code: 'CASH', name: 'Наличные', type: 'cash' as const },
        { code: 'FUEL_CARD', name: 'Топливная карта', type: 'fuel_card' as const },
        { code: 'MOBILE', name: 'Мобильный платеж', type: 'mobile' as const }
      ];

      // API коды способов оплаты (предполагаемые)
      const apiPaymentMethods = [
        { code: 'BANK_CARD', name: 'Банковская карта' },
        { code: 'CASH', name: 'Наличные деньги' },
        { code: 'CORPORATE_CARD', name: 'Корпоративная карта' },
        { code: 'MOBILE_PAY', name: 'Мобильный платеж' }
      ];

      for (const internal of internalPaymentMethods) {
        const apiMethod = this.findMatchingPaymentMethod(internal, apiPaymentMethods);
        
        if (apiMethod) {
          const mapping: PaymentMethodMapping = {
            id: `payment_${internal.code}_${apiMethod.code}`,
            mappingType: 'payment',
            internalCode: internal.code,
            internalName: internal.name,
            apiCode: apiMethod.code,
            apiName: apiMethod.name,
            networkId,
            paymentType: internal.type,
            isActive: true,
            priority: 1,
            isOnline: internal.type !== 'cash',
            lastSync: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          result.mappings.push(mapping);
          result.results.created++;
        }
      }

      console.log(`✅ Синхронизация способов оплаты: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации способов оплаты:', error);
      result.errors.push(`Ошибка синхронизации способов оплаты: ${error.message}`);
      return result;
    }
  }

  /**
   * Синхронизация маппингов ТРК
   */
  private async syncDispenserMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Получаем оборудование типа "dispenser" из базы данных
      // Здесь можно интегрироваться с сервисом оборудования
      
      // Для демонстрации создаем стандартные ТРК
      const dispensers = [
        { number: 1, nozzles: 4, code: 'TRK-001' },
        { number: 2, nozzles: 4, code: 'TRK-002' },
        { number: 3, nozzles: 2, code: 'TRK-003' }
      ];

      for (const dispenser of dispensers) {
        const mapping: DispenserMapping = {
          id: `dispenser_${dispenser.code}`,
          mappingType: 'dispenser',
          internalCode: dispenser.code,
          internalName: `ТРК №${dispenser.number}`,
          apiCode: dispenser.number,
          apiName: `Dispenser ${dispenser.number}`,
          networkId,
          dispenserNumber: dispenser.number,
          nozzleCount: dispenser.nozzles,
          isActive: true,
          priority: 1,
          lastSync: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        result.mappings.push(mapping);
        result.results.created++;
      }

      console.log(`✅ Синхронизация ТРК: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации ТРК:', error);
      result.errors.push(`Ошибка синхронизации ТРК: ${error.message}`);
      return result;
    }
  }

  /**
   * Синхронизация маппингов терминалов
   */
  private async syncTerminalMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Стандартные терминалы
      const terminals = [
        { code: 'POS-001', type: 'pos' as const, name: 'Касса №1' },
        { code: 'POS-002', type: 'pos' as const, name: 'Касса №2' },
        { code: 'KIOSK-001', type: 'kiosk' as const, name: 'Киоск самообслуживания' }
      ];

      for (const terminal of terminals) {
        const mapping: TerminalMapping = {
          id: `terminal_${terminal.code}`,
          mappingType: 'terminal',
          internalCode: terminal.code,
          internalName: terminal.name,
          apiCode: terminal.code,
          apiName: terminal.name,
          networkId,
          terminalType: terminal.type,
          isActive: true,
          priority: 1,
          lastSync: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        result.mappings.push(mapping);
        result.results.created++;
      }

      console.log(`✅ Синхронизация терминалов: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации терминалов:', error);
      result.errors.push(`Ошибка синхронизации терминалов: ${error.message}`);
      return result;
    }
  }

  /**
   * Синхронизация маппингов оборудования
   */
  private async syncEquipmentMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Получаем оборудование из базы данных
      // Здесь интегрируемся с equipmentService
      
      // Для демонстрации создаем стандартное оборудование
      const equipment = [
        { code: 'TANK-001', type: 'tank' as const, name: 'Резервуар №1 АИ-92', capacity: 50000 },
        { code: 'TANK-002', type: 'tank' as const, name: 'Резервуар №2 АИ-95', capacity: 50000 },
        { code: 'PUMP-001', type: 'pump' as const, name: 'Насос №1', capacity: 1000 },
        { code: 'SENSOR-001', type: 'sensor' as const, name: 'Датчик уровня №1', capacity: 0 }
      ];

      for (const item of equipment) {
        const mapping: EquipmentMapping = {
          id: `equipment_${item.code}`,
          mappingType: 'equipment',
          internalCode: item.code,
          internalName: item.name,
          apiCode: item.code,
          apiName: item.name,
          networkId,
          equipmentType: item.type,
          capacity: item.capacity,
          isActive: true,
          priority: 1,
          lastSync: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        result.mappings.push(mapping);
        result.results.created++;
      }

      console.log(`✅ Синхронизация оборудования: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации оборудования:', error);
      result.errors.push(`Ошибка синхронизации оборудования: ${error.message}`);
      return result;
    }
  }

  /**
   * Синхронизация маппингов услуг
   */
  private async syncServiceMappings(
    config: TradingNetworkConfig, 
    networkId: string, 
    result: MappingSyncResult
  ): Promise<MappingSyncResult> {
    try {
      // Получаем услуги из API торговой сети
      const apiServices = await tradingNetworkAPI.getServices();
      
      for (const service of apiServices) {
        const mapping: ServiceMapping = {
          id: `service_${service.service_code}`,
          mappingType: 'service',
          internalCode: `SERVICE_${service.service_code}`,
          internalName: service.service_name,
          apiCode: service.service_code,
          apiName: service.service_name,
          networkId,
          serviceType: 'fuel_sale', // Предполагаем, что все услуги - продажа топлива
          isActive: true,
          priority: 1,
          lastSync: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        result.mappings.push(mapping);
        result.results.created++;
      }

      console.log(`✅ Синхронизация услуг: создано ${result.results.created} маппингов`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка синхронизации услуг:', error);
      result.errors.push(`Ошибка синхронизации услуг: ${error.message}`);
      return result;
    }
  }

  /**
   * Валидация всех маппингов
   */
  validateAllMappings(mappings: EntityMapping[]): MappingValidationResult[] {
    const results: MappingValidationResult[] = [];
    const mappingsByType = this.groupMappingsByType(mappings);

    for (const [type, typeMappings] of mappingsByType) {
      results.push(this.validateMappingsByType(type, typeMappings));
    }

    return results;
  }

  /**
   * Поиск конфликтов во всех маппингах
   */
  findAllConflicts(mappings: EntityMapping[]): MappingConflict[] {
    const conflicts: MappingConflict[] = [];
    const mappingsByType = this.groupMappingsByType(mappings);

    for (const [type, typeMappings] of mappingsByType) {
      conflicts.push(...this.findConflictsByType(type, typeMappings));
    }

    return conflicts;
  }

  /**
   * Получение статистики маппингов
   */
  getMappingStatistics(mappings: EntityMapping[]): MappingStats {
    const byType: Record<string, number> = {};
    let activeMappings = 0;
    let conflictCount = 0;
    let lastSyncDate: Date | undefined;

    mappings.forEach(mapping => {
      byType[mapping.mappingType] = (byType[mapping.mappingType] || 0) + 1;
      if (mapping.isActive) activeMappings++;
      if (mapping.lastSync && (!lastSyncDate || mapping.lastSync > lastSyncDate)) {
        lastSyncDate = mapping.lastSync;
      }
    });

    // Подсчитываем конфликты
    const conflicts = this.findAllConflicts(mappings);
    conflictCount = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length;

    return {
      totalMappings: mappings.length,
      byType,
      activeMappings,
      inactiveMappings: mappings.length - activeMappings,
      conflictCount,
      lastSyncDate,
      syncSuccessRate: mappings.length > 0 ? (activeMappings / mappings.length) * 100 : 0
    };
  }

  /**
   * Обновление кэша для определенного типа маппингов
   */
  private updateCacheForType(mappingType: string, mappings: EntityMapping[]): void {
    const typeMap = this.mappingsByType.get(mappingType);
    if (!typeMap) return;

    typeMap.clear();
    
    mappings.forEach(mapping => {
      if (mapping.mappingType === mappingType) {
        typeMap.set(mapping.internalCode, mapping);
        if (mapping.networkId) {
          typeMap.set(`${mapping.internalCode}_${mapping.networkId}`, mapping);
        }
        this.cachedMappings.set(mapping.id, mapping);
      }
    });

    this.lastCacheUpdate = new Date();
    console.log(`🗂️ Кэш обновлен для типа ${mappingType}: ${mappings.length} записей`);
  }

  /**
   * Инициализация кэша из конфигурации
   */
  async initializeCache(config: TradingNetworkConfig): Promise<void> {
    if (config.universalMapping?.mappings) {
      const mappingsByType = this.groupMappingsByType(config.universalMapping.mappings);
      
      for (const [type, mappings] of mappingsByType) {
        this.updateCacheForType(type, mappings);
      }
      
      console.log(`🔄 Универсальный кэш маппингов инициализирован`);
    }
  }

  // Вспомогательные методы

  private findMatchingFuelService(nomenclature: FuelNomenclature, apiServices: any[]): any | null {
    // Аналогично логике из оригинального сервиса
    return apiServices.find(service => 
      service.service_name.toLowerCase().includes(nomenclature.internalCode.toLowerCase())
    ) || null;
  }

  private findMatchingPaymentMethod(internal: any, apiMethods: any[]): any | null {
    const mapping: Record<string, string> = {
      'CARD': 'BANK_CARD',
      'CASH': 'CASH',
      'FUEL_CARD': 'CORPORATE_CARD',
      'MOBILE': 'MOBILE_PAY'
    };

    return apiMethods.find(method => method.code === mapping[internal.code]) || null;
  }

  private groupMappingsByType(mappings: EntityMapping[]): Map<string, EntityMapping[]> {
    const grouped = new Map<string, EntityMapping[]>();
    
    mappings.forEach(mapping => {
      if (!grouped.has(mapping.mappingType)) {
        grouped.set(mapping.mappingType, []);
      }
      grouped.get(mapping.mappingType)!.push(mapping);
    });

    return grouped;
  }

  private validateMappingsByType(type: string, mappings: EntityMapping[]): MappingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Базовая валидация
    mappings.forEach(mapping => {
      if (!mapping.internalCode || mapping.internalCode.trim().length === 0) {
        errors.push(`Пустой внутренний код в маппинге ${mapping.id}`);
      }
      if (!mapping.apiCode) {
        errors.push(`Пустой API код в маппинге ${mapping.id}`);
      }
    });

    // Проверка дубликатов
    const internalCodes = new Set<string>();
    const apiCodes = new Set<string | number>();

    mappings.forEach(mapping => {
      if (internalCodes.has(mapping.internalCode)) {
        errors.push(`Дублирующийся внутренний код: ${mapping.internalCode}`);
      }
      internalCodes.add(mapping.internalCode);

      if (apiCodes.has(mapping.apiCode)) {
        warnings.push(`Дублирующийся API код: ${mapping.apiCode}`);
      }
      apiCodes.add(mapping.apiCode);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      mappingType: type
    };
  }

  private findConflictsByType(type: string, mappings: EntityMapping[]): MappingConflict[] {
    const conflicts: MappingConflict[] = [];

    // Поиск дубликатов API кодов
    const apiCodeGroups = new Map<string | number, EntityMapping[]>();
    mappings.forEach(mapping => {
      if (!apiCodeGroups.has(mapping.apiCode)) {
        apiCodeGroups.set(mapping.apiCode, []);
      }
      apiCodeGroups.get(mapping.apiCode)!.push(mapping);
    });

    apiCodeGroups.forEach((group, apiCode) => {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          conflicts.push({
            type: 'duplicate_api_code',
            mappingType: type,
            mappingId: group[i].id,
            conflictWith: group[i + 1].id,
            description: `API код ${apiCode} используется в нескольких маппингах`,
            suggestedResolution: 'Объединить маппинги или изменить API код',
            severity: 'high'
          });
        }
      }
    });

    return conflicts;
  }
}

// Экспорт синглтона
export const universalMappingService = new UniversalMappingService();
export { UniversalMappingService };