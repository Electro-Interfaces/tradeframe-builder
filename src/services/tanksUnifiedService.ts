/**
 * УНИФИЦИРОВАННЫЙ СЕРВИС ДЛЯ РАБОТЫ С РЕЗЕРВУАРАМИ
 * 
 * ПРАВИЛЬНАЯ АРХИТЕКТУРА:
 * 1. Первый запрос - проверяет локальную базу данных
 * 2. Если данных нет - автоматически синхронизирует с внешним API
 * 3. Все последующие запросы - из локальной базы
 * 4. Ручное обновление - синхронизирует с API и обновляет базу
 */

import { tanksService, Tank } from './tanksServiceSupabase';
import { Equipment } from '@/types/equipment';
import { tanksApiIntegrationService } from './tanksApiIntegrationService';

export interface TanksLoadResult {
  tanks: Tank[];
  source: 'database' | 'api' | 'mock';
  synchronized: boolean;
  error?: string;
}

class TanksUnifiedService {
  
  /**
   * 🚀 ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ РЕЗЕРВУАРОВ
   * ДИНАМИЧЕСКИЕ ДАННЫЕ ИЗ API БЕЗ ПРИВЯЗКИ К РАЗДЕЛУ ОБОРУДОВАНИЯ
   */
  async getTanksForTradingPoint(tradingPointId: string): Promise<TanksLoadResult> {
    console.log(`🔍 [TANKS UNIFIED] ===== НАЧИНАЕМ ЗАГРУЗКУ РЕЗЕРВУАРОВ =====`);
    console.log(`🔍 [TANKS UNIFIED] ID торговой точки: "${tradingPointId}"`);
    
    if (!tradingPointId || tradingPointId === "all") {
      console.log(`❌ [TANKS UNIFIED] Торговая точка не выбрана или выбрана "all"`);
      return {
        tanks: [],
        source: 'api',
        synchronized: false,
        error: 'Торговая точка не выбрана'
      };
    }

    try {
      console.log(`🏪 [TANKS UNIFIED] Загружаем резервуары для торговой точки: ${tradingPointId}`);
      
      // ЗАГРУЖАЕМ ТОЛЬКО ИЗ API - БЕЗ ПРОВЕРКИ БАЗЫ ДАННЫХ
      console.log(`📡 [TANKS UNIFIED] Получаем динамические данные из API...`);
      const apiTanks = await tanksApiIntegrationService.getTanksFromApi(tradingPointId);
      
      if (apiTanks.length > 0) {
        console.log(`✅ [TANKS UNIFIED] Получено ${apiTanks.length} резервуаров из API (динамически)`);
        return {
          tanks: apiTanks,
          source: 'api',
          synchronized: true
        };
      }
      
      // ЕСЛИ API НЕ ВЕРНУЛ ДАННЫХ - ОШИБКА
      console.error('❌ [TANKS UNIFIED] API не вернул данных о резервуарах');
      
      return {
        tanks: [],
        source: 'api',
        synchronized: false,
        error: 'Резервуары не найдены в API. Проверьте настройки подключения к торговой сети в разделе "Обмен данными"'
      };
      
    } catch (error) {
      console.error('❌ [TANKS UNIFIED] Критическая ошибка при загрузке данных:', error);
      return {
        tanks: [],
        source: 'api',
        synchronized: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки данных резервуаров из API'
      };
    }
  }
  
  /**
   * Получение резервуаров из локальной базы данных
   */
  private async getTanksFromDatabase(tradingPointId: string): Promise<Tank[]> {
    try {
      console.log(`🔍 [getTanksFromDatabase] Проверяем таблицу tanks для точки: ${tradingPointId}`);
      
      // Пытаемся получить из таблицы tanks
      const dbTanks = await tanksService.getTanks(tradingPointId);
      console.log(`🔍 [getTanksFromDatabase] Результат из tanksService.getTanks():`, dbTanks);
      
      if (dbTanks && dbTanks.length > 0) {
        console.log(`📊 [getTanksFromDatabase] НАЙДЕНО! Получено ${dbTanks.length} резервуаров из таблицы tanks`);
        console.log(`📊 [getTanksFromDatabase] Первый резервуар:`, dbTanks[0]);
        return dbTanks;
      }
      
      // ВРЕМЕННО ОТКЛЮЧЕНО: Не используем equipment как fallback
      console.log(`⚠️ [getTanksFromDatabase] Fallback на equipment ОТКЛЮЧЕН - переходим к API`);
      
      // Если в таблице tanks нет данных, проверяем таблицу equipment
      // const equipmentTanks = await this.getTanksFromEquipment(tradingPointId);
      
      // if (equipmentTanks.length > 0) {
      //   console.log(`🏭 Получено ${equipmentTanks.length} резервуаров из таблицы equipment`);
      //   return equipmentTanks;
      // }
      
      return [];
      
    } catch (error) {
      console.error('❌ Ошибка при получении резервуаров из базы:', error);
      return [];
    }
  }
  
  /**
   * Получение резервуаров из таблицы equipment (как fallback)
   */
  private async getTanksFromEquipment(tradingPointId: string): Promise<Tank[]> {
    try {
      const { equipmentSupabaseService } = await import('./equipmentSupabase');
      
      // Получаем все оборудование типа fuel_tank для данной торговой точки
      const equipmentList = await equipmentSupabaseService.list({
        trading_point_id: tradingPointId,
        system_type: 'fuel_tank'
      });
      
      if (!equipmentList.data || equipmentList.data.length === 0) {
        console.log(`📭 Не найдено оборудования типа fuel_tank для торговой точки ${tradingPointId}`);
        return [];
      }
      
      console.log(`🔍 Найдено ${equipmentList.data.length} единиц оборудования типа fuel_tank`);
      
      // Преобразуем Equipment в Tank
      const tanks: Tank[] = equipmentList.data.map((equipment, index) => {
        // Извлекаем параметры из default_params если есть
        const params = equipment.params || {};
        const defaultParams = equipment.default_params || {};
        
        // Функция получения типа топлива из названия оборудования
        const getFuelTypeFromName = (name: string): string => {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('дт') || lowerName.includes('дизель')) return 'Дизельное топливо';
          if (lowerName.includes('аи-95') || lowerName.includes('95')) return 'АИ-95';
          if (lowerName.includes('аи-92') || lowerName.includes('92')) return 'АИ-92';
          if (lowerName.includes('аи-98') || lowerName.includes('98')) return 'АИ-98';
          if (lowerName.includes('газ')) return 'Газ';
          return 'Неопределенный тип';
        };
        
        const tank: Tank = {
          id: equipment.id,
          name: equipment.display_name || equipment.name,
          fuelType: getFuelTypeFromName(equipment.display_name || equipment.name),
          currentLevelLiters: params.currentLevelLiters || 0,
          bookBalance: params.bookBalance || 0,
          capacityLiters: params.capacityLiters || defaultParams.capacityLiters || 5000,
          minLevelPercent: params.minLevelPercent ?? params.min_level_percent ?? 
                          defaultParams.minLevelPercent ?? defaultParams.min_level_percent ?? 
                          params.minLevel ?? defaultParams.minLevel ?? 0,
          criticalLevelPercent: params.criticalLevelPercent ?? params.critical_level_percent ?? 
                               defaultParams.criticalLevelPercent ?? defaultParams.critical_level_percent ??
                               params.criticalLevel ?? defaultParams.criticalLevel ?? 0,
          temperature: params.temperature || 20,
          waterLevelMm: params.waterLevelMm || 0,
          density: params.density || 0.832,
          status: equipment.status === 'online' ? 'active' : 
                  equipment.status === 'offline' ? 'offline' : 'maintenance',
          location: `Торговая точка ${tradingPointId}`,
          installationDate: equipment.installation_date || equipment.created_at,
          lastCalibration: params.lastCalibration,
          supplier: params.supplier,
          
          // Моковые датчики (будут заменены реальными данными)
          sensors: [
            {
              name: 'Уровень топлива',
              status: equipment.status === 'online' ? 'ok' : 'error'
            },
            {
              name: 'Температура',
              status: equipment.status === 'online' ? 'ok' : 'error'
            }
          ],
          
          // Связанные колонки (пока пустой массив)
          linkedPumps: [],
          
          // Настройки уведомлений
          notifications: {
            enabled: params.notifications?.enabled || true,
            drainAlerts: params.notifications?.drainAlerts || true,
            levelAlerts: params.notifications?.levelAlerts || true
          },
          
          // Пороговые значения
          thresholds: {
            criticalTemp: {
              min: params.thresholds?.criticalTemp?.min || -10,
              max: params.thresholds?.criticalTemp?.max || 50
            },
            maxWaterLevel: params.thresholds?.maxWaterLevel || 10,
            notifications: {
              critical: params.thresholds?.notifications?.critical || true,
              warning: params.thresholds?.notifications?.warning || true,
              info: params.thresholds?.notifications?.info || false
            }
          }
        };
        
        return tank;
      });
      
      console.log(`🏭 Успешно преобразовано ${tanks.length} единиц оборудования в резервуары`);
      return tanks;
      
    } catch (error) {
      console.error('❌ Ошибка при получении резервуаров из equipment:', error);
      return [];
    }
  }
  
  /**
   * Автоматическая синхронизация с внешним API
   */
  private async autoSyncFromApi(tradingPointId: string): Promise<{success: boolean, error?: string}> {
    try {
      console.log('🔄 Запускаем автоматическую синхронизацию с внешним API...');
      
      const syncResult = await tanksApiIntegrationService.syncTanksFromApi(tradingPointId);
      
      const totalProcessed = syncResult.created.length + syncResult.updated.length;
      
      if (totalProcessed > 0) {
        console.log(`✅ Синхронизация успешна: создано ${syncResult.created.length}, обновлено ${syncResult.updated.length}`);
        return { success: true };
      }
      
      if (syncResult.errors.length > 0) {
        const errorMsg = syncResult.errors.join(', ');
        console.error('❌ Ошибки при синхронизации:', errorMsg);
        return { success: false, error: errorMsg };
      }
      
      return { success: false, error: 'API не вернул данных' };
      
    } catch (error) {
      console.error('❌ Критическая ошибка при синхронизации:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка синхронизации' 
      };
    }
  }
  
  /**
   * ПРОВЕРКА НАЛИЧИЯ РЕЗЕРВУАРОВ В БАЗЕ
   * Возвращает true если есть хотя бы один резервуар для торговой точки
   */
  async hasTanksInDatabase(tradingPointId: string): Promise<boolean> {
    if (!tradingPointId || tradingPointId === "all") return false;
    
    try {
      const tanks = await this.getTanksFromDatabase(tradingPointId);
      return tanks.length > 0;
    } catch (error) {
      console.error('❌ Ошибка при проверке резервуаров:', error);
      return false;
    }
  }

  /**
   * СИНХРОНИЗАЦИЯ РЕЗЕРВУАРОВ ИЗ API (только при отсутствии данных в базе)
   * Вызывается кнопкой синхронизации - создает резервуары ТОЛЬКО если их нет в базе
   */
  async syncIfEmpty(tradingPointId: string): Promise<TanksLoadResult> {
    if (!tradingPointId || tradingPointId === "all") {
      return {
        tanks: [],
        source: 'mock',
        synchronized: false,
        error: 'Торговая точка не выбрана'
      };
    }

    try {
      console.log(`🔍 Проверяем наличие резервуаров для торговой точки: ${tradingPointId}`);
      
      // Проверяем есть ли уже резервуары в базе
      const hasExistingTanks = await this.hasTanksInDatabase(tradingPointId);
      
      if (hasExistingTanks) {
        console.log('⚠️ В базе уже есть резервуары для этой торговой точки');
        
        // Возвращаем существующие резервуары
        const existingTanks = await this.getTanksFromDatabase(tradingPointId);
        return {
          tanks: existingTanks,
          source: 'database',
          synchronized: false,
          error: 'Резервуары уже существуют. Для принудительного обновления используйте кнопку "Обновить".'
        };
      }
      
      // Если резервуаров нет - синхронизируем с API
      console.log('📡 Резервуары отсутствуют, запускаем синхронизацию с API...');
      const syncResult = await this.autoSyncFromApi(tradingPointId);
      
      if (syncResult.success) {
        // Загружаем синхронизированные данные
        const syncedTanks = await this.getTanksFromDatabase(tradingPointId);
        return {
          tanks: syncedTanks,
          source: 'api',
          synchronized: true
        };
      }
      
      return {
        tanks: [],
        source: 'database',
        synchronized: false,
        error: syncResult.error || 'Не удалось синхронизировать данные с API'
      };
      
    } catch (error) {
      console.error('❌ Ошибка при синхронизации:', error);
      return {
        tanks: [],
        source: 'database',
        synchronized: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка синхронизации'
      };
    }
  }

  /**
   * РУЧНОЕ ОБНОВЛЕНИЕ РЕЗЕРВУАРОВ
   * Вызывается кнопкой "Обновить" - принудительно синхронизирует с API
   */
  async forceUpdateFromApi(tradingPointId: string): Promise<TanksLoadResult> {
    if (!tradingPointId || tradingPointId === "all") {
      return {
        tanks: [],
        source: 'mock',
        synchronized: false,
        error: 'Торговая точка не выбрана'
      };
    }

    try {
      console.log(`🔄 ПРИНУДИТЕЛЬНОЕ обновление резервуаров для торговой точки: ${tradingPointId}`);
      
      const syncResult = await tanksApiIntegrationService.syncTanksFromApi(tradingPointId);
      
      const totalProcessed = syncResult.created.length + syncResult.updated.length;
      
      if (totalProcessed > 0 || syncResult.errors.length === 0) {
        // Загружаем обновленные данные из базы
        const updatedTanks = await this.getTanksFromDatabase(tradingPointId);
        
        return {
          tanks: updatedTanks,
          source: 'api',
          synchronized: true
        };
      }
      
      // Если обновление не удалось, возвращаем текущие данные из базы
      const currentTanks = await this.getTanksFromDatabase(tradingPointId);
      
      return {
        tanks: currentTanks,
        source: 'database',
        synchronized: false,
        error: syncResult.errors.length > 0 ? syncResult.errors.join(', ') : 'Не удалось обновить данные'
      };
      
    } catch (error) {
      console.error('❌ Ошибка при принудительном обновлении:', error);
      
      // Возвращаем текущие данные из базы при ошибке
      const currentTanks = await this.getTanksFromDatabase(tradingPointId);
      
      return {
        tanks: currentTanks,
        source: 'database',
        synchronized: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка обновления'
      };
    }
  }
  
  /**
   * Получение статистики по резервуарам
   */
  getStatistics(tanks: Tank[]) {
    if (tanks.length === 0) {
      return {
        total: 0,
        totalCapacity: 0,
        totalCurrent: 0,
        utilizationPercent: 0,
        lowLevelCount: 0,
        criticalLevelCount: 0
      };
    }
    
    const totalCapacity = tanks.reduce((sum, tank) => sum + (tank.capacityLiters || 0), 0);
    const totalCurrent = tanks.reduce((sum, tank) => sum + (tank.currentLevelLiters || 0), 0);
    const utilizationPercent = totalCapacity > 0 ? (totalCurrent / totalCapacity) * 100 : 0;
    
    const lowLevelCount = tanks.filter(tank => {
      const percent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
      return percent <= (tank.minLevelPercent || 20);
    }).length;
    
    const criticalLevelCount = tanks.filter(tank => {
      const percent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
      return percent <= (tank.criticalLevelPercent || 10);
    }).length;
    
    return {
      total: tanks.length,
      totalCapacity,
      totalCurrent,
      utilizationPercent,
      lowLevelCount,
      criticalLevelCount
    };
  }
}

// Экспортируем singleton
export const tanksUnifiedService = new TanksUnifiedService();