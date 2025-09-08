/**
 * 🌐 ТАНКИ API ИНТЕГРАЦИЯ СЕРВИС
 * Правильная архитектура: все запросы к внешним API только через universalHttpClient
 * 
 * ВОЗМОЖНОСТИ:
 * 1. Получение данных резервуаров из внешнего API через universalHttpClient
 * 2. Временные демонстрационные данные (пока API не настроен)
 * 3. Правильное преобразование API данных в Tank объекты
 */

import { httpClient } from './universalHttpClient';
import { tradingNetworkConfigService } from './tradingNetworkConfigService';
import { Tank } from './tanksServiceSupabase';

// Интерфейс данных из торгового API (обновлен по реальной структуре)
interface TradingApiTank {
  number: number;
  fuel: number;
  fuel_name: string;
  state: number;
  volume_end: string;    // Текущий объем
  volume_max: string;    // Максимальный объем  
  temperature: string;   // Температура
  density: string;       // Плотность
  water: {
    level: string;       // Уровень подтоварной воды
  };
  release?: {           // Данные о выдаче топлива
    volume: string;     // Объем выданного топлива
    amount: string;     // Сумма выданного топлива
  };
  dt: string;           // Дата и время обновления данных
}

// Интерфейс ответа API - возвращает массив напрямую, а не в поле tanks
type TanksApiResponse = TradingApiTank[];

// Маппинг типов топлива из API
const fuelTypeMapping: Record<number, string> = {
  1: 'АИ-80',
  2: 'АИ-92', 
  3: 'АИ-95',
  4: 'АИ-98',
  5: 'Дизельное топливо',
  6: 'Газ',
  7: 'Керосин'
};

// Маппинг статусов резервуаров
const tankStatusMapping: Record<number, string> = {
  0: 'offline',
  1: 'active', 
  2: 'maintenance',
  3: 'error',
  4: 'critical'
};

class TanksApiIntegrationService {
  
  /**
   * 🚀 ГЛАВНЫЙ МЕТОД: Получение резервуаров из внешнего API через universalHttpClient
   * ТОЛЬКО РЕАЛЬНЫЕ API ДАННЫЕ - БЕЗ ДЕМО!
   */
  async getTanksFromApi(tradingPointId: string): Promise<Tank[]> {
    console.log(`🌐 [TANKS API] РЕАЛЬНЫЙ запрос резервуаров через универсальный HTTP клиент для ТП: ${tradingPointId}`);
    
    try {
      // Получаем конфигурацию торговой сети
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.enabled) {
        throw new Error('Торговая сеть отключена в настройках. Включите в разделе "Обмен данными"');
      }

      if (!config.endpoints.tanks) {
        throw new Error('Эндпоинт для резервуаров не настроен. Настройте в разделе "Обмен данными"');
      }

      // Получаем маппинг внешних ID (отдельно для сети и торговой точки)
      const apiParams = await this.getApiParams(tradingPointId);
      if (!apiParams.systemId || !apiParams.stationId) {
        throw new Error(`Не найдены API параметры для торговой точки ${tradingPointId}. System ID: ${apiParams.systemId}, Station ID: ${apiParams.stationId}`);
      }

      console.log(`🔗 [TANKS API] Используем API параметры: system=${apiParams.systemId}, station=${apiParams.stationId}`);
      console.log(`🌐 [TANKS API] Полный URL запроса: ${config.baseUrl}${config.endpoints.tanks}`);
      console.log(`📋 [TANKS API] Параметры запроса:`, { system: apiParams.systemId, station: apiParams.stationId });

      // Делаем запрос через universalHttpClient с правильными параметрами
      const response = await httpClient.get<TanksApiResponse>(config.endpoints.tanks, {
        destination: 'external-api',
        queryParams: {
          system: apiParams.systemId,   // external_id сети
          station: apiParams.stationId  // external_id торговой точки
        }
      });

      if (!response.success) {
        console.error(`❌ [TANKS API] Полная информация об ошибке:`);
        console.error(`📍 URL: ${config.baseUrl}${config.endpoints.tanks}`);
        console.error(`📋 Query параметры:`, { system: externalId, station: externalId });
        console.error(`🔢 HTTP статус: ${response.status}`);
        console.error(`💬 Ошибка: ${response.error}`);
        console.error(`📄 Данные ответа от сервера:`, response.data);
        
        // Попытаемся извлечь более детальную информацию из ответа
        if (response.data && typeof response.data === 'object') {
          console.error(`🔍 Структура данных ответа:`, JSON.stringify(response.data, null, 2));
        }
        
        throw new Error(`Ошибка API: HTTP ${response.status}: ${response.error}`);
      }

      // Отладка: посмотрим что именно вернул API
      console.log(`📦 [TANKS API] Данные от сервера:`, response.data);
      console.log(`🔍 [TANKS API] Структура ответа:`, JSON.stringify(response.data, null, 2));

      // API возвращает массив резервуаров напрямую, а не в поле tanks
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.warn(`⚠️ [TANKS API] Проверка ответа API:`);
        console.warn(`- response.data существует:`, !!response.data);
        console.warn(`- response.data это массив:`, Array.isArray(response.data));
        console.warn(`- количество элементов:`, response.data ? response.data.length : 0);
        
        throw new Error('API вернул пустой список резервуаров');
      }

      console.log(`✅ [TANKS API] Получено ${response.data.length} резервуаров из API`);
      
      // Преобразуем данные API в Tank объекты БЕЗ ПРОВЕРКИ ОБОРУДОВАНИЯ (динамически)
      const tanks = this.convertApiDataToTanksDynamic(response.data, tradingPointId);
      
      console.log(`✅ [TANKS API] Получено ${tanks.length} РЕАЛЬНЫХ резервуаров из API`);
      return tanks;

    } catch (error) {
      console.error('❌ [TANKS API] Ошибка получения реальных данных:', error);
      throw error;
    }
  }

  /**
   * 📡 ДИНАМИЧЕСКОЕ ПОЛУЧЕНИЕ РЕЗЕРВУАРОВ ИЗ API
   * БЕЗ ЗАВИСИМОСТИ ОТ РАЗДЕЛА ОБОРУДОВАНИЯ
   */
  async getTanksFromApiDynamic(tradingPointId: string): Promise<Tank[]> {
    console.log(`🚀 [TANKS API DYNAMIC] Загружаем резервуары динамически для ТП: ${tradingPointId}`);

    try {
      // Получаем конфигурацию торговой сети
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.enabled) {
        throw new Error('Торговая сеть отключена в настройках. Включите в разделе "Обмен данными"');
      }

      if (!config.endpoints.tanks) {
        throw new Error('Эндпоинт для резервуаров не настроен. Настройте в разделе "Обмен данными"');
      }

      // Получаем маппинг внешних ID
      const apiParams = await this.getApiParams(tradingPointId);
      if (!apiParams.systemId || !apiParams.stationId) {
        throw new Error(`Не найдены API параметры для торговой точки ${tradingPointId}. System ID: ${apiParams.systemId}, Station ID: ${apiParams.stationId}`);
      }

      console.log(`🔗 [TANKS API DYNAMIC] Используем API параметры: system=${apiParams.systemId}, station=${apiParams.stationId}`);

      // Делаем запрос через universalHttpClient
      const response = await httpClient.get<TanksApiResponse>(config.endpoints.tanks, {
        destination: 'external-api',
        queryParams: {
          system: apiParams.systemId,
          station: apiParams.stationId
        }
      });

      if (!response.success) {
        console.error(`❌ [TANKS API DYNAMIC] Ошибка API запроса:`, response.error);
        throw new Error(`Ошибка получения данных из API: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data)) {
        console.log('⚠️ [TANKS API DYNAMIC] API не вернул данных или некорректный формат');
        return [];
      }

      console.log(`📦 [TANKS API DYNAMIC] Получено ${response.data.length} резервуаров из API`);

      // Преобразуем данные API в Tank объекты БЕЗ проверки оборудования
      const tanks = this.convertApiDataToTanksDynamic(response.data, tradingPointId);
      
      console.log(`✅ [TANKS API DYNAMIC] Преобразовано ${tanks.length} резервуаров`);
      return tanks;

    } catch (error) {
      console.error('❌ [TANKS API DYNAMIC] Ошибка получения динамических данных:', error);
      throw error;
    }
  }

  /**
   * 🔄 ДИНАМИЧЕСКОЕ преобразование данных API в Tank объекты
   * БЕЗ ЗАВИСИМОСТИ ОТ БАЗЫ ДАННЫХ ОБОРУДОВАНИЯ
   */
  private convertApiDataToTanksDynamic(apiTanks: TradingApiTank[], tradingPointId: string): Tank[] {
    return apiTanks.map((apiTank) => {
      const currentVolume = parseFloat(apiTank.volume_end) || 0;
      const maxVolume = parseFloat(apiTank.volume_max) || 10000;
      const levelPercent = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;
      
      // Стандартные настройки для всех резервуаров (без привязки к оборудованию)
      const defaultMinLevelPercent = 20;
      const defaultCriticalLevelPercent = 10;
      
      const tank: Tank = {
        id: `tank_${tradingPointId}_${apiTank.number}`,
        name: `Резервуар №${apiTank.number}`,
        fuelType: apiTank.fuel_name || `Топливо ${apiTank.fuel}`,
        currentLevelLiters: currentVolume,
        bookBalance: parseFloat(apiTank.amount_end) || 0,
        capacityLiters: maxVolume,
        minLevelPercent: defaultMinLevelPercent,
        criticalLevelPercent: defaultCriticalLevelPercent,
        temperature: parseFloat(apiTank.temperature) || 20,
        waterLevelMm: parseFloat(apiTank.water?.level) || 0,
        density: parseFloat(apiTank.density) || 0.832,
        status: apiTank.state === 1 ? 'active' : 'offline',
        location: `Торговая точка ${tradingPointId}`,
        installationDate: new Date().toISOString(),
        lastCalibration: apiTank.dt || new Date().toISOString(),
        supplier: null,
        
        // Сенсоры
        sensors: [
          {
            name: 'Уровень топлива',
            status: apiTank.state === 1 ? 'ok' : 'error'
          },
          {
            name: 'Температура', 
            status: apiTank.state === 1 ? 'ok' : 'error'
          }
        ],
        
        // Связанные колонки (пустой массив)
        linkedPumps: [],
        
        // Настройки уведомлений
        notifications: {
          enabled: true,
          drainAlerts: true,
          levelAlerts: true
        },
        
        // Пороговые значения
        thresholds: {
          criticalTemp: {
            min: -10,
            max: 50
          },
          maxWaterLevel: 10,
          notifications: {
            critical: true,
            warning: true,
            info: false
          }
        }
      };
      
      console.log(`🛢️ [TANKS API DYNAMIC] Резервуар №${apiTank.number}: ${apiTank.fuel_name} | ${currentVolume.toFixed(2)}/${maxVolume.toFixed(2)}л (${Math.round(levelPercent)}%) | ${apiTank.temperature}°C | ${apiTank.density}кг/м³ | мин=${defaultMinLevelPercent}% крит=${defaultCriticalLevelPercent}%`);
      
      return tank;
    });
  }

  /**
   * 🔄 Преобразование данных API в Tank объекты с полной информацией
   */
  private async convertApiDataToTanks(apiTanks: TradingApiTank[], tradingPointId: string): Promise<Tank[]> {
    const tanks = await Promise.all(apiTanks.map(async (apiTank) => {
      const currentVolume = parseFloat(apiTank.volume_end) || 0;
      const maxVolume = parseFloat(apiTank.volume_max) || 10000;
      const levelPercent = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;
      
      // Получаем настройки резервуара из оборудования
      let equipmentSettings = { minLevelPercent: 20, criticalLevelPercent: 10 };
      try {
        const { equipmentSupabaseService } = await import('./equipmentSupabase');
        const equipmentList = await equipmentSupabaseService.list({
          trading_point_id: tradingPointId,
          system_type: 'fuel_tank'
        });
        
        // Ищем резервуар по номеру в названии
        const matchingEquipment = equipmentList.data?.find(eq => 
          eq.name.includes(`${apiTank.number}`) || 
          eq.display_name?.includes(`${apiTank.number}`)
        );
        
        if (matchingEquipment) {
          console.log(`🔧 Найдено соответствующее оборудование для резервуара ${apiTank.number}:`, {
            id: matchingEquipment.id,
            name: matchingEquipment.name,
            displayName: matchingEquipment.display_name,
            params: matchingEquipment.params,
            defaultParams: matchingEquipment.default_params
          });
          
          // Извлекаем пороговые значения из параметров оборудования
          const params = matchingEquipment.params || {};
          const defaultParams = matchingEquipment.default_params || {};
          
          // ВАЖНО: Проверяем все возможные поля где могут храниться пороги
          const minLevel = params.minLevelPercent ?? params.min_level_percent ?? 
                          defaultParams.minLevelPercent ?? defaultParams.min_level_percent ?? 
                          params.minLevel ?? defaultParams.minLevel ?? 0;
                          
          const critLevel = params.criticalLevelPercent ?? params.critical_level_percent ?? 
                           defaultParams.criticalLevelPercent ?? defaultParams.critical_level_percent ??
                           params.criticalLevel ?? defaultParams.criticalLevel ?? 0;
          
          equipmentSettings = {
            minLevelPercent: typeof minLevel === 'number' ? minLevel : 0,
            criticalLevelPercent: typeof critLevel === 'number' ? critLevel : 0
          };
          
          console.log(`📊 Пороговые значения для резервуара ${apiTank.number}:`, equipmentSettings);
          console.log(`🔍 Проверка полей params:`, Object.keys(params));
          console.log(`🔍 Проверка полей defaultParams:`, Object.keys(defaultParams));
        }
      } catch (error) {
        console.warn(`⚠️ [TANKS API] Не удалось получить настройки оборудования для резервуара №${apiTank.number}:`, error);
      }
      
      const tank: Tank = {
        id: `tank_${tradingPointId}_${apiTank.number}`,
        name: `Резервуар №${apiTank.number}`,
        fuelType: fuelTypeMapping[apiTank.fuel] || apiTank.fuel_name || `Тип ${apiTank.fuel}`,
        currentLevelLiters: currentVolume,
        capacityLiters: maxVolume,
        bookBalance: currentVolume, // Книжный остаток равен физическому
        minLevelPercent: equipmentSettings.minLevelPercent,
        criticalLevelPercent: equipmentSettings.criticalLevelPercent,
        temperature: parseFloat(apiTank.temperature) || 20,
        waterLevelMm: parseFloat(apiTank.water?.level) || 0,
        density: parseFloat(apiTank.density) || 832,
        status: tankStatusMapping[apiTank.state] || 'active',
        location: `Торговая точка ${tradingPointId}`,
        installationDate: new Date().toISOString(),
        lastUpdateTime: apiTank.dt,
        
        // Дополнительные данные с API
        apiData: {
          levelPercent: Math.round(levelPercent * 10) / 10, // Округляем до 1 знака
          releaseVolume: apiTank.release ? parseFloat(apiTank.release.volume) : 0,
          releaseAmount: apiTank.release ? parseFloat(apiTank.release.amount) : 0,
          fuelCode: apiTank.fuel,
          stateCode: apiTank.state,
          lastSync: apiTank.dt
        },
        
        // Статус датчиков на основе реальных данных
        sensors: [
          {
            name: 'Уровень топлива',
            status: apiTank.state === 1 ? 'ok' : (apiTank.state === 0 ? 'offline' : 'error'),
            value: `${Math.round(levelPercent)}%`,
            lastUpdate: apiTank.dt
          },
          {
            name: 'Температура', 
            status: apiTank.temperature ? 'ok' : 'error',
            value: `${parseFloat(apiTank.temperature) || 0}°C`,
            lastUpdate: apiTank.dt
          },
          {
            name: 'Плотность',
            status: apiTank.density ? 'ok' : 'warning',
            value: `${parseFloat(apiTank.density) || 0} кг/м³`,
            lastUpdate: apiTank.dt
          },
          {
            name: 'Подтоварная вода',
            status: parseFloat(apiTank.water?.level) > 5 ? 'warning' : 'ok',
            value: `${parseFloat(apiTank.water?.level) || 0} мм`,
            lastUpdate: apiTank.dt
          }
        ],
        
        linkedPumps: [],
        
        notifications: {
          enabled: true,
          drainAlerts: true,
          levelAlerts: true
        },
        
        thresholds: {
          criticalTemp: {
            min: -10,
            max: 50
          },
          maxWaterLevel: 10,
          notifications: {
            critical: true,
            warning: true,
            info: false
          }
        }
      };

      console.log(`🛢️ [TANKS API] Резервуар №${apiTank.number}: ${tank.fuelType} | ${currentVolume}/${maxVolume}л (${Math.round(levelPercent)}%) | ${apiTank.temperature}°C | ${apiTank.density}кг/м³ | мин=${equipmentSettings.minLevelPercent}% крит=${equipmentSettings.criticalLevelPercent}%`);
      
      return tank;
    }));
    
    return tanks;
  }

  /**
   * 🆔 Получение API параметров (system и station) для торговой точки
   */
  private async getApiParams(tradingPointId: string): Promise<{ systemId: string; stationId: string }> {
    try {
      console.log(`🔍 [TANKS API] Получение API параметров для торговой точки: ${tradingPointId}`);
      
      // Импортируем tradingPointsService для получения данных о торговой точке
      const { tradingPointsService } = await import('./tradingPointsService');
      
      const tradingPoint = await tradingPointsService.getById(tradingPointId);
      if (!tradingPoint) {
        console.error(`❌ [TANKS API] Торговая точка ${tradingPointId} не найдена`);
        return { systemId: '', stationId: '' };
      }

      console.log(`✅ [TANKS API] Торговая точка найдена:`, {
        id: tradingPoint.id,
        name: tradingPoint.name,
        external_id: tradingPoint.external_id,
        networkId: tradingPoint.networkId,
        code: tradingPoint.code
      });

      // Station ID = external_id торговой точки
      const stationId = tradingPoint.external_id || tradingPoint.code || '';
      
      if (!stationId) {
        console.error(`❌ [TANKS API] У торговой точки ${tradingPoint.name} НЕТ external_id или code!`);
        return { systemId: '', stationId: '' };
      }

      console.log(`✅ [TANKS API] Station ID определен: "${stationId}"`);

      // System ID = external_id сети (получаем из network_id)
      let systemId = '';
      
      if (!tradingPoint.networkId) {
        console.error(`❌ [TANKS API] У торговой точки ${tradingPoint.name} НЕТ networkId!`);
        return { systemId: '', stationId };
      }

      console.log(`🔍 [TANKS API] Получение сети по ID: ${tradingPoint.networkId}`);
      
      try {
        // Импортируем networksService для получения данных о сети
        const { networksService } = await import('./networksService');
        
        const network = await networksService.getById(tradingPoint.networkId);
        
        if (!network) {
          console.error(`❌ [TANKS API] Сеть ${tradingPoint.networkId} не найдена`);
          return { systemId: '', stationId };
        }

        console.log(`✅ [TANKS API] Сеть найдена:`, {
          id: network.id,
          name: network.name,
          external_id: network.external_id,
          code: network.code,
          status: network.status
        });

        // Попытка получить system ID из разных полей
        systemId = network.external_id || network.code || network.name || '';
        
        console.log(`🔍 [TANKS API] Попытка получить System ID:`, {
          external_id: network.external_id,
          code: network.code,
          name: network.name,
          result: systemId
        });
        
        if (!systemId) {
          console.error(`❌ [TANKS API] У сети ${network.name} НЕТ external_id, code или name! Это критическая проблема!`);
          console.log(`💡 [TANKS API] РЕШЕНИЕ: Добавить external_id в сеть "${network.name}" в базе данных`);
          return { systemId: '', stationId };
        }

        console.log(`✅ [TANKS API] System ID определен: "${systemId}"`);
        
      } catch (networkError) {
        console.error(`❌ [TANKS API] Ошибка получения сети ${tradingPoint.networkId}:`, networkError);
        return { systemId: '', stationId };
      }

      console.log(`📋 [TANKS API] ИТОГОВЫЕ API параметры для ${tradingPoint.name}:`);
      console.log(`   System ID: "${systemId}"`);
      console.log(`   Station ID: "${stationId}"`);
      console.log(`   Оба параметра заполнены: ${systemId && stationId ? '✅' : '❌'}`);
      
      return {
        systemId: systemId || '',
        stationId: stationId || ''
      };
      
    } catch (error) {
      console.error(`❌ [TANKS API] Критическая ошибка получения API параметров для ${tradingPointId}:`, error);
      return { systemId: '', stationId: '' };
    }
  }

  /**
   * ❌ ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ - УДАЛЕНЫ!
   * Не используется - только реальные данные из API или базы
   */
  private generateDemoTanks(tradingPointId: string): Tank[] {
    console.log(`🎭 [TANKS DEMO] Создаем демонстрационные резервуары для ${tradingPointId}`);
    
    const demoTanks: Tank[] = [
      {
        id: `demo_tank_${tradingPointId}_1`,
        name: 'Резервуар №1',
        fuelType: 'АИ-92',
        currentLevelLiters: 8500,
        capacityLiters: 10000,
        bookBalance: 8500,
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        temperature: 22,
        waterLevelMm: 2,
        density: 0.745,
        status: 'active',
        location: `Торговая точка ${tradingPointId}`,
        installationDate: '2024-01-15T08:00:00.000Z',
        lastUpdateTime: new Date().toISOString(),
        sensors: [
          { name: 'Уровень топлива', status: 'ok' },
          { name: 'Температура', status: 'ok' },
          { name: 'Подтоварная вода', status: 'ok' }
        ],
        linkedPumps: [],
        notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
        thresholds: {
          criticalTemp: { min: -10, max: 50 },
          maxWaterLevel: 10,
          notifications: { critical: true, warning: true, info: false }
        }
      },
      {
        id: `demo_tank_${tradingPointId}_2`,
        name: 'Резервуар №2', 
        fuelType: 'АИ-95',
        currentLevelLiters: 6200,
        capacityLiters: 8000,
        bookBalance: 6200,
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        temperature: 24,
        waterLevelMm: 1,
        density: 0.750,
        status: 'active',
        location: `Торговая точка ${tradingPointId}`,
        installationDate: '2024-01-15T08:00:00.000Z',
        lastUpdateTime: new Date().toISOString(),
        sensors: [
          { name: 'Уровень топлива', status: 'ok' },
          { name: 'Температура', status: 'ok' },
          { name: 'Подтоварная вода', status: 'warning' }
        ],
        linkedPumps: [],
        notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
        thresholds: {
          criticalTemp: { min: -10, max: 50 },
          maxWaterLevel: 10,
          notifications: { critical: true, warning: true, info: false }
        }
      },
      {
        id: `demo_tank_${tradingPointId}_3`,
        name: 'Резервуар №3',
        fuelType: 'Дизельное топливо',
        currentLevelLiters: 1200,
        capacityLiters: 12000,
        bookBalance: 1200,
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        temperature: 18,
        waterLevelMm: 5,
        density: 0.832,
        status: 'warning', // Низкий уровень
        location: `Торговая точка ${tradingPointId}`,
        installationDate: '2024-01-15T08:00:00.000Z',
        lastUpdateTime: new Date().toISOString(),
        sensors: [
          { name: 'Уровень топлива', status: 'error' },
          { name: 'Температура', status: 'ok' },
          { name: 'Подтоварная вода', status: 'warning' }
        ],
        linkedPumps: [],
        notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
        thresholds: {
          criticalTemp: { min: -10, max: 50 },
          maxWaterLevel: 10,
          notifications: { critical: true, warning: true, info: false }
        }
      }
    ];

    demoTanks.forEach(tank => {
      console.log(`🎭 [DEMO] Создан демо-резервуар: ${tank.name} | ${tank.fuelType} | ${tank.currentLevelLiters}/${tank.capacityLiters}л | ${tank.status}`);
    });
    
    return demoTanks;
  }

  /**
   * 🔄 СИНХРОНИЗАЦИЯ РЕЗЕРВУАРОВ ИЗ API В БАЗУ ДАННЫХ
   * Получает данные из API и сохраняет их в локальную базу Supabase
   */
  async syncTanksFromApi(tradingPointId: string): Promise<{
    created: Tank[];
    updated: Tank[];
    errors: string[];
  }> {
    console.log(`🔄 [TANKS SYNC] Запускаем синхронизацию резервуаров из API для ТП: ${tradingPointId}`);
    
    try {
      // Получаем данные из API
      const apiTanks = await this.getTanksFromApi(tradingPointId);
      
      if (apiTanks.length === 0) {
        console.log('⚠️ [TANKS SYNC] API не вернул данных о резервуарах');
        return {
          created: [],
          updated: [],
          errors: ['API не вернул данных о резервуарах']
        };
      }

      console.log(`📡 [TANKS SYNC] Получено ${apiTanks.length} резервуаров из API, синхронизируем с базой...`);

      // Импортируем сервис для работы с базой данных
      const { tanksService } = await import('./tanksServiceSupabase');
      
      const created: Tank[] = [];
      const updated: Tank[] = [];
      const errors: string[] = [];

      // Синхронизируем каждый резервуар
      for (const tank of apiTanks) {
        try {
          // Проверяем, есть ли уже такой резервуар в базе
          const existingTanks = await tanksService.getTanks(tradingPointId);
          const existingTank = existingTanks.find(t => 
            t.name === tank.name || 
            t.id === tank.id ||
            (t.name.includes(tank.name.match(/№(\d+)/)?.[1] || '') && tank.name.includes(t.name.match(/№(\d+)/)?.[1] || ''))
          );

          if (existingTank) {
            // Обновляем существующий резервуар
            console.log(`🔄 [TANKS SYNC] Обновляем существующий резервуар: ${tank.name}`);
            
            const updatedTank = {
              ...existingTank,
              ...tank,
              id: existingTank.id, // Сохраняем оригинальный ID из базы
              lastUpdateTime: new Date().toISOString()
            };
            
            const updateResult = await tanksService.updateTank(existingTank.id, updatedTank);
            if (updateResult) {
              updated.push(updatedTank);
              console.log(`✅ [TANKS SYNC] Резервуар обновлен: ${tank.name}`);
            } else {
              errors.push(`Не удалось обновить резервуар: ${tank.name}`);
            }
          } else {
            // Создаем новый резервуар
            console.log(`➕ [TANKS SYNC] Создаем новый резервуар: ${tank.name}`);
            
            const newTank = {
              ...tank,
              trading_point_id: tradingPointId,
              created_at: new Date().toISOString(),
              lastUpdateTime: new Date().toISOString()
            };
            
            const createResult = await tanksService.createTank(newTank);
            if (createResult) {
              created.push(newTank);
              console.log(`✅ [TANKS SYNC] Резервуар создан: ${tank.name}`);
            } else {
              errors.push(`Не удалось создать резервуар: ${tank.name}`);
            }
          }
        } catch (tankError) {
          const errorMsg = `Ошибка синхронизации резервуара ${tank.name}: ${tankError instanceof Error ? tankError.message : 'Неизвестная ошибка'}`;
          console.error(`❌ [TANKS SYNC] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`🏁 [TANKS SYNC] Синхронизация завершена: создано ${created.length}, обновлено ${updated.length}, ошибок ${errors.length}`);
      
      return {
        created,
        updated,
        errors
      };

    } catch (error) {
      const errorMsg = `Критическая ошибка синхронизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
      console.error(`❌ [TANKS SYNC] ${errorMsg}`);
      
      return {
        created: [],
        updated: [],
        errors: [errorMsg]
      };
    }
  }

  /**
   * 🧪 Тестирование соединения с API резервуаров
   */
  async testApiConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🧪 [TANKS API] Тестируем подключение к API резервуаров...');
      
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.enabled) {
        return {
          success: false,
          message: 'Торговая сеть отключена в настройках'
        };
      }

      if (!config.endpoints.tanks) {
        return {
          success: false,
          message: 'Эндпоинт для резервуаров не настроен'
        };
      }

      // Пробуем сделать тестовый запрос
      const response = await httpClient.get<TanksApiResponse>(config.endpoints.tanks, {
        destination: 'external-api',
        queryParams: {
          system: '1', // Тестовый ID - используем правильное имя параметра
          station: '1'
        }
      });

      if (response.success) {
        return {
          success: true,
          message: `Подключение к API успешно. Статус: ${response.status}. Резервуаров: ${Array.isArray(response.data) ? response.data.length : 0}`,
          data: response.data
        };
      } else {
        return {
          success: false,
          message: `Ошибка API: ${response.error}`
        };
      }
      
    } catch (error: any) {
      console.error('❌ [TANKS API] Ошибка тестирования подключения:', error);
      return {
        success: false,
        message: `Ошибка подключения: ${error.message}`
      };
    }
  }
}

// Экспортируем singleton
export const tanksApiIntegrationService = new TanksApiIntegrationService();