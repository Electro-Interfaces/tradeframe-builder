/**
 * Сервис для интеграции данных резервуаров из торгового API
 * Загружает данные остатков и маппирует в внутреннюю модель Tank
 */

import { tradingNetworkConfigService } from './tradingNetworkConfigService';
import { Tank } from './tanksService';

// Интерфейс данных из торгового API
interface TradingApiTank {
  number: number;
  fuel: number;
  fuel_name: string;
  state: number;
  volume_begin?: string | null;
  volume_end: string;
  volume_max: string;
  volume_free: string;
  volume: string;
  amount_begin?: string | null;
  amount_end: string;
  level: string;
  water: {
    volume: string;
    amount: string;
    level: string;
  };
  temperature: string;
  density: string;
  release: {
    volume: string;
    amount: string;
  };
  dt: string; // timestamp последнего обновления
}

// Маппинг типов топлива из API в названия
const fuelTypeMapping: Record<number, string> = {
  1: 'АИ-80',
  2: 'АИ-92', 
  3: 'АИ-95',
  4: 'АИ-98',
  5: 'Дизельное топливо',
  6: 'Газ',
  7: 'Керосин'
};

// Маппинг состояний резервуаров
const tankStateMapping: Record<number, 'active' | 'maintenance' | 'offline'> = {
  1: 'active',
  2: 'maintenance', 
  0: 'offline'
};

class TanksTradingApiService {
  
  /**
   * Загрузить данные резервуаров из торгового API
   */
  async loadTanksFromApi(stationId?: string): Promise<TradingApiTank[]> {
    try {
      console.log('🏭 Загружаем данные резервуаров из торгового API...');
      
      const data = await tradingNetworkConfigService.getTanksData(stationId);
      
      console.log(`✅ Получено ${data.length} резервуаров из API:`, data);
      
      return data as TradingApiTank[];
      
    } catch (error) {
      console.error('❌ Ошибка загрузки данных резервуаров из API:', error);
      throw new Error(`Не удалось загрузить данные резервуаров: ${error.message}`);
    }
  }

  /**
   * Преобразовать данные API в модель Tank
   */
  mapApiDataToTank(apiTank: TradingApiTank, existingTank?: Tank): Tank {
    const fuelTypeName = fuelTypeMapping[apiTank.fuel] || `Топливо #${apiTank.fuel}`;
    
    // Преобразуем строковые числа в числа - ПРИОРИТЕТ: volume, затем volume_end
    const volume = parseFloat(apiTank.volume || apiTank.volume_end) || 0;
    const volumeMax = parseFloat(apiTank.volume_max) || 0;
    const temperature = parseFloat(apiTank.temperature) || 0;
    const density = parseFloat(apiTank.density) || 0;
    const waterLevel = parseFloat(apiTank.water?.level || '0') || 0;
    
    console.log(`🔧 Маппинг резервуара ${apiTank.number}:
      - volume="${apiTank.volume}" (основной), volume_end="${apiTank.volume_end}" (конечный)
      - ВЫБРАН объем: ${volume}л (${apiTank.volume ? 'из volume' : 'из volume_end'})
      - volume_max="${apiTank.volume_max}" → максимальная емкость: ${volumeMax}л
      - заполнение: ${volumeMax > 0 ? ((volume / volumeMax) * 100).toFixed(1) : 0}%`);
    
    // Создаем базовую модель резервуара
    const mappedTank: Tank = {
      // Используем существующий ID или создаем новый на основе номера
      id: existingTank?.id || `tank-${apiTank.number}`,
      name: existingTank?.name || `Резервуар №${apiTank.number}`,
      fuelType: fuelTypeName,
      
      // Основные объемы и уровни (из API)
      currentLevelLiters: volume,
      bookBalance: parseFloat(apiTank.amount_end) || 0,
      capacityLiters: volumeMax,
      temperature,
      density,
      waterLevelMm: waterLevel,
      
      // Статус резервуара
      status: tankStateMapping[apiTank.state] || 'offline',
      
      // Пороговые значения - используем существующие или устанавливаем по умолчанию
      minLevelPercent: existingTank?.minLevelPercent || 20,
      criticalLevelPercent: existingTank?.criticalLevelPercent || 10,
      
      // Служебная информация
      location: existingTank?.location || `Станция ${apiTank.number}`,
      installationDate: existingTank?.installationDate || '2020-01-01',
      lastCalibration: existingTank?.lastCalibration,
      supplier: existingTank?.supplier,
      
      // Датчики - определяем состояние на основе данных API
      sensors: [
        { 
          name: 'Уровень', 
          status: apiTank.state === 1 ? 'ok' : 'error' 
        },
        { 
          name: 'Температура', 
          status: (temperature > -20 && temperature < 50) ? 'ok' : 'error' 
        }
      ],
      
      // Связанные ТРК - используем существующие или пустые
      linkedPumps: existingTank?.linkedPumps || [],
      
      // Уведомления - используем существующие или по умолчанию
      notifications: existingTank?.notifications || {
        enabled: true,
        drainAlerts: true,
        levelAlerts: true
      },
      
      // Пороги - используем существующие или по умолчанию
      thresholds: existingTank?.thresholds || {
        criticalTemp: { min: -10, max: 40 },
        maxWaterLevel: 10,
        notifications: {
          critical: true,
          warning: true,
          info: false
        }
      }
    };
    
    console.log(`🔄 Маппинг резервуара №${apiTank.number}:`, {
      fuel: fuelTypeName,
      volume: `${volume}л / ${volumeMax}л`,
      temperature: `${temperature}°C`,
      status: mappedTank.status
    });
    
    return mappedTank;
  }

  /**
   * Загрузить и преобразовать все резервуары
   */
  async loadAndMapTanks(existingTanks: Tank[] = [], stationId?: string): Promise<Tank[]> {
    try {
      const apiTanks = await this.loadTanksFromApi(stationId);
      
      console.log(`🔍 RAW данные из API (${apiTanks.length} резервуаров):`);
      apiTanks.forEach((tank, index) => {
        console.log(`  Резервуар ${tank.number}: ${tank.fuel_name}, объем: ${tank.volume_end || tank.volume}л, температура: ${tank.temperature}°C`);
      });
      
      const mappedTanks = apiTanks.map((apiTank, index) => {
        // Пытаемся найти существующий резервуар для сохранения настроек
        const existingTank = existingTanks.find(tank => 
          tank.id === `tank-${apiTank.number}` || 
          tank.name === `Резервуар №${apiTank.number}`
        );
        
        const mappedTank = this.mapApiDataToTank(apiTank, existingTank);
        console.log(`🔄 Мапплен резервуар [${index}]: ${mappedTank.name} → ${mappedTank.fuelType}, ${mappedTank.currentLevelLiters}л`);
        return mappedTank;
      });
      
      console.log(`✅ Успешно загружено и замаплено ${mappedTanks.length} резервуаров`);
      
      return mappedTanks;
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке и маппинге резервуаров:', error);
      throw error;
    }
  }

  /**
   * Получить статистику по резервуарам
   */
  getTanksStatistics(tanks: Tank[]) {
    const total = tanks.length;
    const active = tanks.filter(t => t.status === 'active').length;
    const maintenance = tanks.filter(t => t.status === 'maintenance').length;
    const offline = tanks.filter(t => t.status === 'offline').length;
    
    const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacityLiters, 0);
    const totalVolume = tanks.reduce((sum, tank) => sum + tank.currentLevelLiters, 0);
    const utilizationPercent = totalCapacity > 0 ? (totalVolume / totalCapacity * 100) : 0;
    
    // Резервуары с критически низким уровнем
    const criticalLevel = tanks.filter(tank => {
      const currentPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
      return currentPercent <= tank.criticalLevelPercent;
    });
    
    return {
      total,
      active,
      maintenance, 
      offline,
      totalCapacity,
      totalVolume,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      criticalLevel: criticalLevel.length,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Экспортируем singleton
export const tanksTradingApiService = new TanksTradingApiService();