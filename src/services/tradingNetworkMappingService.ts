/**
 * Сервис для управления маппингом кодов топлива между приложением и API торговой сети
 * Обеспечивает автоматическую синхронизацию с номенклатурой и API торговой сети
 */

import { 
  FuelCodeMapping, 
  MappingSyncResult, 
  FuelMappingConfig, 
  TradingNetworkConfig 
} from './tradingNetworkConfigService';
import { nomenclatureService } from './nomenclatureService';
import { tradingNetworkAPI } from './tradingNetworkAPI';
import { FuelNomenclature } from '../types/nomenclature';

// Валидация маппингов
interface MappingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Конфликт маппингов
interface MappingConflict {
  type: 'duplicate_api_code' | 'duplicate_internal_code' | 'nomenclature_mismatch';
  mappingId: string;
  conflictWith: string;
  description: string;
  suggestedResolution: string;
}

class TradingNetworkMappingService {
  private cachedMappings: Map<string, FuelCodeMapping> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут

  /**
   * Получить маппинг для внутреннего кода топлива
   */
  getMappingForFuelType(internalCode: string, networkId?: string): FuelCodeMapping | null {
    console.log(`🔍 getMappingForFuelType: поиск маппинга для "${internalCode}"`);
    
    const key = networkId ? `${internalCode}_${networkId}` : internalCode;
    
    // Проверяем кэш
    if (this.cachedMappings.has(key) && this.isCacheValid()) {
      const mapping = this.cachedMappings.get(key)!;
      console.log(`✅ Найден кэшированный маппинг: ${internalCode} → API код ${mapping.apiCode}`);
      return mapping;
    }

    return null;
  }

  /**
   * Получить маппинг для API кода
   */
  getMappingForApiCode(apiCode: number, networkId?: string): FuelCodeMapping | null {
    console.log(`🔍 getMappingForApiCode: поиск маппинга для API кода ${apiCode}`);
    
    for (const mapping of this.cachedMappings.values()) {
      if (mapping.apiCode === apiCode && 
          (!networkId || mapping.networkId === networkId) && 
          mapping.isActive) {
        console.log(`✅ Найден маппинг: API код ${apiCode} → ${mapping.internalCode}`);
        return mapping;
      }
    }

    console.log(`⚠️ Маппинг для API кода ${apiCode} не найден`);
    return null;
  }

  /**
   * Синхронизация маппингов с номенклатурой и API торговой сети
   */
  async syncFuelMappings(config: TradingNetworkConfig, networkId: string): Promise<MappingSyncResult> {
    console.log(`🔄 Начинаем синхронизацию маппингов для сети ${networkId}`);
    
    const result: MappingSyncResult = {
      success: false,
      created: 0,
      updated: 0,
      conflicts: 0,
      errors: [],
      mappings: []
    };

    try {
      // 1. Получаем номенклатуру из базы данных
      const nomenclature = await nomenclatureService.getNomenclature({ 
        networkId, 
        status: 'active' 
      });
      console.log(`📋 Загружено ${nomenclature.length} записей номенклатуры`);

      // 2. Получаем список услуг из API торговой сети
      const apiServices = await tradingNetworkAPI.getServices();
      console.log(`🌐 Получено ${apiServices.length} услуг из API торговой сети`);

      // 3. Получаем текущие маппинги из конфигурации
      const existingMappings = config.fuelMapping?.mappings || [];
      const mappingsByInternalCode = new Map<string, FuelCodeMapping>();
      const mappingsByApiCode = new Map<number, FuelCodeMapping>();

      existingMappings.forEach(mapping => {
        if (mapping.networkId === networkId) {
          mappingsByInternalCode.set(mapping.internalCode, mapping);
          mappingsByApiCode.set(mapping.apiCode, mapping);
        }
      });

      // 4. Создаем маппинги на основе номенклатуры
      for (const nomenclatureItem of nomenclature) {
        // Пытаемся найти соответствующую услугу в API по названию
        const matchingService = this.findMatchingApiService(nomenclatureItem, apiServices);
        
        if (matchingService) {
          const existingMapping = mappingsByInternalCode.get(nomenclatureItem.internalCode);
          
          if (existingMapping) {
            // Обновляем существующий маппинг
            if (existingMapping.apiCode !== matchingService.service_code || 
                existingMapping.apiName !== matchingService.service_name) {
              existingMapping.apiCode = matchingService.service_code;
              existingMapping.apiName = matchingService.service_name;
              existingMapping.updatedAt = new Date();
              existingMapping.lastSync = new Date();
              result.updated++;
              console.log(`🔄 Обновлен маппинг: ${nomenclatureItem.internalCode} → API ${matchingService.service_code}`);
            }
          } else {
            // Создаем новый маппинг
            const newMapping: FuelCodeMapping = {
              id: `mapping_${nomenclatureItem.id}_${matchingService.service_code}`,
              internalCode: nomenclatureItem.internalCode,
              internalName: nomenclatureItem.name,
              apiCode: matchingService.service_code,
              apiName: matchingService.service_name,
              networkId: networkId,
              nomenclatureId: nomenclatureItem.id,
              isActive: true,
              priority: 1,
              lastSync: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Проверяем конфликты
            const existingByApiCode = mappingsByApiCode.get(matchingService.service_code);
            if (existingByApiCode && existingByApiCode.internalCode !== nomenclatureItem.internalCode) {
              result.conflicts++;
              result.errors.push(
                `Конфликт API кода ${matchingService.service_code}: используется для "${existingByApiCode.internalCode}" и "${nomenclatureItem.internalCode}"`
              );
              console.warn(`⚠️ Конфликт маппинга для API кода ${matchingService.service_code}`);
            } else {
              result.mappings.push(newMapping);
              mappingsByInternalCode.set(newMapping.internalCode, newMapping);
              mappingsByApiCode.set(newMapping.apiCode, newMapping);
              result.created++;
              console.log(`✅ Создан маппинг: ${nomenclatureItem.internalCode} → API ${matchingService.service_code}`);
            }
          }
        } else {
          console.warn(`⚠️ Не найдено соответствие в API для "${nomenclatureItem.name}" (${nomenclatureItem.internalCode})`);
          result.errors.push(`Не найдено соответствие в API для "${nomenclatureItem.name}"`);
        }
      }

      // 5. Добавляем обновленные маппинги к результату
      result.mappings.push(...existingMappings.filter(m => m.networkId === networkId));

      // 6. Обновляем кэш
      this.updateCache(result.mappings);

      result.success = result.errors.length === 0 || result.created > 0 || result.updated > 0;
      console.log(`✅ Синхронизация завершена: создано ${result.created}, обновлено ${result.updated}, конфликтов ${result.conflicts}`);

    } catch (error) {
      console.error('❌ Ошибка при синхронизации маппингов:', error);
      result.errors.push(`Критическая ошибка: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Автоматическое создание маппингов на основе анализа названий
   */
  async autoCreateMappings(config: TradingNetworkConfig, networkId: string): Promise<FuelCodeMapping[]> {
    console.log(`🤖 Автоматическое создание маппингов для сети ${networkId}`);
    
    try {
      // Получаем номенклатуру и API услуги
      const [nomenclature, apiServices] = await Promise.all([
        nomenclatureService.getNomenclature({ networkId, status: 'active' }),
        tradingNetworkAPI.getServices()
      ]);

      const mappings: FuelCodeMapping[] = [];

      for (const nomenclatureItem of nomenclature) {
        const matchingService = this.findMatchingApiService(nomenclatureItem, apiServices);
        
        if (matchingService) {
          mappings.push({
            id: `auto_mapping_${nomenclatureItem.id}_${matchingService.service_code}`,
            internalCode: nomenclatureItem.internalCode,
            internalName: nomenclatureItem.name,
            apiCode: matchingService.service_code,
            apiName: matchingService.service_name,
            networkId: networkId,
            nomenclatureId: nomenclatureItem.id,
            isActive: true,
            priority: 1,
            lastSync: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      console.log(`🤖 Автоматически создано ${mappings.length} маппингов`);
      return mappings;

    } catch (error) {
      console.error('❌ Ошибка автоматического создания маппингов:', error);
      return [];
    }
  }

  /**
   * Валидация маппингов
   */
  validateMappings(mappings: FuelCodeMapping[]): MappingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверяем уникальность API кодов
    const apiCodes = new Map<number, string>();
    const internalCodes = new Map<string, number>();

    for (const mapping of mappings.filter(m => m.isActive)) {
      // Проверка дублирующихся API кодов
      if (apiCodes.has(mapping.apiCode)) {
        errors.push(
          `Дублирующийся API код ${mapping.apiCode} для "${mapping.internalCode}" и "${apiCodes.get(mapping.apiCode)}"`
        );
      } else {
        apiCodes.set(mapping.apiCode, mapping.internalCode);
      }

      // Проверка дублирующихся внутренних кодов
      if (internalCodes.has(mapping.internalCode)) {
        warnings.push(
          `Дублирующийся внутренний код "${mapping.internalCode}" для API кодов ${mapping.apiCode} и ${internalCodes.get(mapping.internalCode)}`
        );
      } else {
        internalCodes.set(mapping.internalCode, mapping.apiCode);
      }

      // Проверка корректности кодов
      if (!mapping.internalCode || mapping.internalCode.trim().length === 0) {
        errors.push(`Пустой внутренний код для маппинга ${mapping.id}`);
      }

      if (!mapping.apiCode || mapping.apiCode <= 0) {
        errors.push(`Некорректный API код для маппинга ${mapping.id}`);
      }

      // Проверка названий
      if (!mapping.internalName || mapping.internalName.trim().length === 0) {
        warnings.push(`Пустое внутреннее название для маппинга ${mapping.id}`);
      }

      if (!mapping.apiName || mapping.apiName.trim().length === 0) {
        warnings.push(`Пустое API название для маппинга ${mapping.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Поиск конфликтов в маппингах
   */
  findConflicts(mappings: FuelCodeMapping[]): MappingConflict[] {
    const conflicts: MappingConflict[] = [];
    const activeMappings = mappings.filter(m => m.isActive);

    // Группируем по API кодам и внутренним кодам
    const byApiCode = new Map<number, FuelCodeMapping[]>();
    const byInternalCode = new Map<string, FuelCodeMapping[]>();

    activeMappings.forEach(mapping => {
      // По API кодам
      if (!byApiCode.has(mapping.apiCode)) {
        byApiCode.set(mapping.apiCode, []);
      }
      byApiCode.get(mapping.apiCode)!.push(mapping);

      // По внутренним кодам
      if (!byInternalCode.has(mapping.internalCode)) {
        byInternalCode.set(mapping.internalCode, []);
      }
      byInternalCode.get(mapping.internalCode)!.push(mapping);
    });

    // Ищем конфликты API кодов
    byApiCode.forEach((mappingsGroup, apiCode) => {
      if (mappingsGroup.length > 1) {
        for (let i = 0; i < mappingsGroup.length - 1; i++) {
          conflicts.push({
            type: 'duplicate_api_code',
            mappingId: mappingsGroup[i].id,
            conflictWith: mappingsGroup[i + 1].id,
            description: `API код ${apiCode} используется для "${mappingsGroup[i].internalCode}" и "${mappingsGroup[i + 1].internalCode}"`,
            suggestedResolution: 'Оставить маппинг с более высоким приоритетом'
          });
        }
      }
    });

    // Ищем конфликты внутренних кодов
    byInternalCode.forEach((mappingsGroup, internalCode) => {
      if (mappingsGroup.length > 1) {
        for (let i = 0; i < mappingsGroup.length - 1; i++) {
          conflicts.push({
            type: 'duplicate_internal_code',
            mappingId: mappingsGroup[i].id,
            conflictWith: mappingsGroup[i + 1].id,
            description: `Внутренний код "${internalCode}" связан с API кодами ${mappingsGroup[i].apiCode} и ${mappingsGroup[i + 1].apiCode}`,
            suggestedResolution: 'Объединить маппинги или деактивировать один из них'
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Поиск соответствующей услуги API для записи номенклатуры
   */
  private findMatchingApiService(nomenclature: FuelNomenclature, apiServices: any[]): any | null {
    // 1. Точное совпадение по внутреннему коду
    let match = apiServices.find(service => 
      service.service_name.toLowerCase() === nomenclature.internalCode.toLowerCase()
    );
    if (match) return match;

    // 2. Точное совпадение по названию
    match = apiServices.find(service => 
      service.service_name.toLowerCase() === nomenclature.name.toLowerCase()
    );
    if (match) return match;

    // 3. Частичное совпадение по ключевым словам
    const nomenclatureLower = nomenclature.name.toLowerCase();
    const internalCodeLower = nomenclature.internalCode.toLowerCase();
    
    match = apiServices.find(service => {
      const serviceLower = service.service_name.toLowerCase();
      
      // Проверяем ключевые слова для бензина
      if ((nomenclatureLower.includes('аи-92') || internalCodeLower.includes('аи-92')) && 
          serviceLower.includes('аи-92')) return true;
      if ((nomenclatureLower.includes('аи-95') || internalCodeLower.includes('аи-95')) && 
          serviceLower.includes('аи-95')) return true;
      if ((nomenclatureLower.includes('аи-98') || internalCodeLower.includes('аи-98')) && 
          serviceLower.includes('аи-98')) return true;
      if ((nomenclatureLower.includes('аи-100') || internalCodeLower.includes('аи-100')) && 
          serviceLower.includes('аи-100')) return true;
      
      // Проверяем ключевые слова для дизеля
      if ((nomenclatureLower.includes('дизель') || internalCodeLower.includes('дт')) && 
          serviceLower.includes('дизель')) return true;
      
      return false;
    });

    return match || null;
  }

  /**
   * Обновление кэша маппингов
   */
  private updateCache(mappings: FuelCodeMapping[]): void {
    this.cachedMappings.clear();
    
    mappings.forEach(mapping => {
      if (mapping.isActive) {
        // Кэшируем по внутреннему коду
        this.cachedMappings.set(mapping.internalCode, mapping);
        // Кэшируем по внутреннему коду с привязкой к сети
        if (mapping.networkId) {
          this.cachedMappings.set(`${mapping.internalCode}_${mapping.networkId}`, mapping);
        }
      }
    });

    this.lastCacheUpdate = new Date();
    console.log(`🗂️ Кэш маппингов обновлен: ${this.cachedMappings.size} записей`);
  }

  /**
   * Проверка актуальности кэша
   */
  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) return false;
    const now = new Date();
    return (now.getTime() - this.lastCacheUpdate.getTime()) < this.CACHE_TTL;
  }

  /**
   * Инициализация кэша из конфигурации
   */
  async initializeCache(config: TradingNetworkConfig): Promise<void> {
    if (config.fuelMapping?.mappings) {
      this.updateCache(config.fuelMapping.mappings);
      console.log(`🔄 Кэш маппингов инициализирован из конфигурации`);
    }
  }

  /**
   * Очистка кэша
   */
  clearCache(): void {
    this.cachedMappings.clear();
    this.lastCacheUpdate = null;
    console.log(`🗑️ Кэш маппингов очищен`);
  }

  /**
   * Получить статистику маппингов
   */
  getMappingStats(mappings: FuelCodeMapping[]): {
    total: number;
    active: number;
    inactive: number;
    withNomenclature: number;
    conflicts: number;
  } {
    const active = mappings.filter(m => m.isActive);
    const withNomenclature = mappings.filter(m => m.nomenclatureId);
    const conflicts = this.findConflicts(mappings);

    return {
      total: mappings.length,
      active: active.length,
      inactive: mappings.length - active.length,
      withNomenclature: withNomenclature.length,
      conflicts: conflicts.length
    };
  }
}

// Экспорт синглтона
export const tradingNetworkMappingService = new TradingNetworkMappingService();
export { TradingNetworkMappingService };