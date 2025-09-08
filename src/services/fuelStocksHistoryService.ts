/**
 * Сервис исторических данных остатков топлива в резервуарах
 * Генерирует данные за август 2025 года с шагом 4 часа
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { tanksService, Tank } from './tanksService';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { errorLogService } from './errorLogService';
import { httpClient } from './universalHttpClient';

export interface FuelStockSnapshot {
  id: string;
  tankId: number;
  tankName: string;
  fuelType: string;
  tradingPointId: string;
  timestamp: string;
  currentLevelLiters: number;
  capacityLiters: number;
  levelPercent: number;
  temperature: number;
  waterLevelMm: number;
  density: number;
  status: 'active' | 'maintenance' | 'offline';
  // Дополнительные метрики
  consumptionRate: number; // Скорость расхода л/час
  fillRate: number; // Скорость заправки л/час
  operationMode: 'normal' | 'filling' | 'draining' | 'maintenance';
}

// Генератор исторических данных
class FuelStocksHistoryGenerator {
  private async getApiUrl() {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    return connection?.url || '';
  }
  private readonly AUGUST_2025_START = new Date('2025-08-01T00:00:00Z');
  private readonly AUGUST_2025_END = new Date('2025-08-31T23:59:59Z');
  private readonly SNAPSHOT_INTERVAL_HOURS = 4; // Каждые 4 часа
  
  // Параметры для реалистичного моделирования
  private readonly CONSUMPTION_PATTERNS = {
    'АИ-92': { baseRate: 150, peakMultiplier: 2.5, nightMultiplier: 0.3 },
    'АИ-95': { baseRate: 200, peakMultiplier: 2.8, nightMultiplier: 0.4 },
    'АИ-98': { baseRate: 80, peakMultiplier: 2.2, nightMultiplier: 0.2 },
    'АИ-100': { baseRate: 40, peakMultiplier: 1.8, nightMultiplier: 0.1 },
    'ДТ': { baseRate: 300, peakMultiplier: 3.2, nightMultiplier: 0.5 }
  };

  private readonly REFILL_SCHEDULE = [
    { hour: 6, probability: 0.8 }, // Утренние поставки (высокая вероятность)
    { hour: 14, probability: 0.6 }, // Дневные поставки
    { hour: 22, probability: 0.3 }  // Вечерние поставки
  ];

  private readonly TEMPERATURE_VARIATION = {
    base: 15, // Базовая температура августа
    dailyRange: 8, // Дневная амплитуда
    randomVariation: 2 // Случайные колебания
  };

  /**
   * Генерирует полный набор исторических данных за август 2025
   */
  async generateAugustHistory(): Promise<FuelStockSnapshot[]> {
    // Получаем все резервуары
    const tanks = await tanksService.getTanks();
    const snapshots: FuelStockSnapshot[] = [];
    
    // Генерируем снимки для каждого резервуара
    for (const tank of tanks) {
      const tankSnapshots = this.generateTankHistory(tank);
      snapshots.push(...tankSnapshots);
    }
    
    // Сортируем по времени
    snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return snapshots;
  }

  /**
   * Генерирует историю для одного резервуара
   */
  private generateTankHistory(tank: Tank): FuelStockSnapshot[] {
    const snapshots: FuelStockSnapshot[] = [];
    const currentTime = new Date(this.AUGUST_2025_START);
    
    // Состояние резервуара (начинаем с текущих значений)
    let currentLevel = tank.currentLevelLiters;
    let waterLevel = tank.waterLevelMm;
    let status = tank.status;
    
    // Генерируем снимки каждые 4 часа
    while (currentTime <= this.AUGUST_2025_END) {
      const snapshot = this.generateSnapshot(
        tank,
        new Date(currentTime),
        currentLevel,
        waterLevel,
        status
      );
      
      snapshots.push(snapshot);
      
      // Обновляем состояние для следующего снимка
      const nextState = this.calculateNextState(tank, currentTime, currentLevel, waterLevel, status);
      currentLevel = nextState.level;
      waterLevel = nextState.waterLevel;
      status = nextState.status;
      
      // Переходим к следующему интервалу
      currentTime.setHours(currentTime.getHours() + this.SNAPSHOT_INTERVAL_HOURS);
    }
    
    return snapshots;
  }

  /**
   * Создает снимок состояния резервуара в конкретный момент времени
   */
  private generateSnapshot(
    tank: Tank,
    timestamp: Date,
    currentLevel: number,
    waterLevel: number,
    status: 'active' | 'maintenance' | 'offline'
  ): FuelStockSnapshot {
    const temperature = this.calculateTemperature(timestamp);
    const levelPercent = Math.round((currentLevel / tank.capacityLiters) * 100 * 100) / 100;
    
    // Определяем режим работы
    const operationMode = this.determineOperationMode(timestamp, currentLevel, tank.capacityLiters);
    
    // Рассчитываем скорости
    const rates = this.calculateRates(tank.fuelType, timestamp, operationMode);
    
    return {
      id: `snapshot_${tank.id}_${timestamp.getTime()}`,
      tankId: tank.id,
      tankName: tank.name,
      fuelType: tank.fuelType,
      tradingPointId: tank.trading_point_id,
      timestamp: timestamp.toISOString(),
      currentLevelLiters: Math.round(currentLevel),
      capacityLiters: tank.capacityLiters,
      levelPercent,
      temperature: Math.round(temperature * 10) / 10,
      waterLevelMm: Math.round(waterLevel * 10) / 10,
      density: this.calculateDensity(tank.density, temperature),
      status,
      consumptionRate: rates.consumption,
      fillRate: rates.fill,
      operationMode
    };
  }

  /**
   * Рассчитывает следующее состояние резервуара
   */
  private calculateNextState(
    tank: Tank,
    currentTime: Date,
    currentLevel: number,
    currentWaterLevel: number,
    currentStatus: 'active' | 'maintenance' | 'offline'
  ): { level: number; waterLevel: number; status: 'active' | 'maintenance' | 'offline' } {
    
    // Проверяем запланированное обслуживание (случайно 1% шанс)
    let status = currentStatus;
    if (Math.random() < 0.01 && status === 'active') {
      status = 'maintenance';
    } else if (status === 'maintenance' && Math.random() < 0.7) {
      status = 'active'; // 70% шанс завершить обслуживание
    }

    if (status === 'offline' || status === 'maintenance') {
      // В режиме обслуживания уровень не меняется
      return { level: currentLevel, waterLevel: currentWaterLevel, status };
    }

    // Рассчитываем потребление за 4 часа
    const consumptionPerHour = this.calculateConsumption(tank.fuelType, currentTime);
    let newLevel = currentLevel - (consumptionPerHour * this.SNAPSHOT_INTERVAL_HOURS);
    
    // Проверяем необходимость заправки
    const refillTrigger = tank.capacityLiters * (tank.minLevelPercent / 100);
    const isRefillTime = this.shouldRefill(currentTime, newLevel, refillTrigger);
    
    if (isRefillTime) {
      // Заправляем до 80-95% от максимума
      const targetFillPercent = 0.8 + Math.random() * 0.15;
      const refillAmount = (tank.capacityLiters * targetFillPercent) - newLevel;
      newLevel += Math.max(0, refillAmount);
    }
    
    // Ограничиваем уровень границами резервуара
    newLevel = Math.max(0, Math.min(newLevel, tank.capacityLiters));
    
    // Медленное изменение уровня воды (очень медленно)
    const waterLevelChange = (Math.random() - 0.5) * 0.1; // ±0.05мм за 4 часа
    let newWaterLevel = currentWaterLevel + waterLevelChange;
    newWaterLevel = Math.max(0, Math.min(newWaterLevel, 10)); // 0-10мм максимум
    
    return {
      level: newLevel,
      waterLevel: newWaterLevel,
      status
    };
  }

  /**
   * Рассчитывает температуру в зависимости от времени дня и случайных факторов
   */
  private calculateTemperature(timestamp: Date): number {
    const hour = timestamp.getHours();
    const dayOfMonth = timestamp.getDate();
    
    // Базовая температура августа с учетом времени суток
    const dailyCycle = Math.sin((hour - 6) * Math.PI / 12) * this.TEMPERATURE_VARIATION.dailyRange / 2;
    const monthlyVariation = Math.sin((dayOfMonth / 31) * Math.PI) * 2; // Небольшая вариация по дням месяца
    const randomNoise = (Math.random() - 0.5) * this.TEMPERATURE_VARIATION.randomVariation;
    
    return this.TEMPERATURE_VARIATION.base + dailyCycle + monthlyVariation + randomNoise;
  }

  /**
   * Рассчитывает потребление топлива в зависимости от типа и времени
   */
  private calculateConsumption(fuelType: string, timestamp: Date): number {
    const pattern = this.CONSUMPTION_PATTERNS[fuelType as keyof typeof this.CONSUMPTION_PATTERNS];
    if (!pattern) return 50; // Default consumption
    
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    let multiplier = 1;
    
    // Время суток
    if (hour >= 7 && hour <= 9) multiplier *= pattern.peakMultiplier * 1.2; // Утренний пик
    else if (hour >= 17 && hour <= 19) multiplier *= pattern.peakMultiplier; // Вечерний пик
    else if (hour >= 22 || hour <= 6) multiplier *= pattern.nightMultiplier; // Ночь
    
    // День недели (выходные - меньше потребления)
    if (dayOfWeek === 0 || dayOfWeek === 6) multiplier *= 0.7;
    
    // Случайная вариация ±20%
    const randomFactor = 0.8 + Math.random() * 0.4;
    
    return pattern.baseRate * multiplier * randomFactor;
  }

  /**
   * Определяет необходимость заправки
   */
  private shouldRefill(timestamp: Date, currentLevel: number, triggerLevel: number): boolean {
    if (currentLevel > triggerLevel) return false;
    
    const hour = timestamp.getHours();
    const refillSlot = this.REFILL_SCHEDULE.find(slot => Math.abs(slot.hour - hour) <= 1);
    
    if (!refillSlot) return false;
    
    return Math.random() < refillSlot.probability;
  }

  /**
   * Определяет режим работы резервуара
   */
  private determineOperationMode(
    timestamp: Date,
    currentLevel: number,
    capacity: number
  ): 'normal' | 'filling' | 'draining' | 'maintenance' {
    const hour = timestamp.getHours();
    const levelPercent = currentLevel / capacity;
    
    // Если заправка вероятна
    const refillSlot = this.REFILL_SCHEDULE.find(slot => Math.abs(slot.hour - hour) <= 1);
    if (refillSlot && levelPercent < 0.4 && Math.random() < 0.3) {
      return 'filling';
    }
    
    // Высокое потребление в пиковые часы
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 'draining';
    }
    
    return 'normal';
  }

  /**
   * Рассчитывает скорости потребления и заправки
   */
  private calculateRates(
    fuelType: string,
    timestamp: Date,
    operationMode: 'normal' | 'filling' | 'draining' | 'maintenance'
  ): { consumption: number; fill: number } {
    const baseConsumption = this.calculateConsumption(fuelType, timestamp);
    
    let consumption = baseConsumption;
    let fill = 0;
    
    switch (operationMode) {
      case 'filling':
        fill = 2000 + Math.random() * 1000; // 2000-3000 л/час при заправке
        consumption *= 0.3; // Меньше потребления во время заправки
        break;
      case 'draining':
        consumption *= 1.5; // Повышенное потребление
        break;
      case 'maintenance':
        consumption = 0;
        fill = 0;
        break;
      default:
        // normal - используем базовые значения
        break;
    }
    
    return {
      consumption: Math.round(consumption),
      fill: Math.round(fill)
    };
  }

  /**
   * Рассчитывает плотность с учетом температуры
   */
  private calculateDensity(baseDensity: number, temperature: number): number {
    // Коэффициент температурного расширения для нефтепродуктов
    const thermalExpansionCoeff = 0.001; // примерно 0.1% на градус
    const temperatureDiff = temperature - 15; // 15°C - стандартная температура
    
    const densityCorrection = baseDensity * thermalExpansionCoeff * temperatureDiff;
    const correctedDensity = baseDensity - densityCorrection;
    
    return Math.round(correctedDensity * 1000) / 1000; // Округление до 3 знаков
  }
}

// Экземпляр генератора
const historyGenerator = new FuelStocksHistoryGenerator();

// HTTP API Methods
const httpApiMethods = {
  /**
   * HTTP запрос к API
   */
  async apiRequest(endpoint: string, options: any = {}): Promise<any> {
    const response = await httpClient.request(endpoint, {
      destination: 'supabase',
      ...options
    });
    
    if (!response.success) {
      throw {
        status: response.status,
        statusText: 'Request failed',
        message: response.error || 'API request failed',
        details: response.data
      };
    }
    
    return response.data;
  },

  /**
   * Получить заголовки авторизации
   */
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return {};
  },

  /**
   * Получить исторические данные через API
   */
  async getHistoricalDataFromAPI(
    startDate?: string,
    endDate?: string,
    tankId?: string,
    tradingPointId?: string
  ): Promise<FuelStockSnapshot[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (tankId) params.append('tankId', tankId);
    if (tradingPointId) params.append('tradingPointId', tradingPointId);
    params.append('limit', '1000');

    const response = await httpApiMethods.apiRequest(`/fuel-stock-snapshots?${params}`);
    
    // Трансформируем API данные в формат UI
    return (response.data || []).map((apiSnapshot: any) => ({
      id: apiSnapshot.id,
      tankId: parseInt(apiSnapshot.tank_id),
      tankName: apiSnapshot.tanks?.name || `Tank ${apiSnapshot.tank_id}`,
      fuelType: apiSnapshot.fuel_types?.name || 'Unknown',
      tradingPointId: apiSnapshot.trading_point_id,
      timestamp: apiSnapshot.snapshot_time,
      currentLevelLiters: apiSnapshot.current_level_liters,
      capacityLiters: apiSnapshot.capacity_liters,
      levelPercent: apiSnapshot.level_percent || 0,
      temperature: apiSnapshot.temperature || 15,
      waterLevelMm: apiSnapshot.water_level_mm || 0,
      density: apiSnapshot.density || 750,
      status: apiSnapshot.tank_status || 'active',
      consumptionRate: apiSnapshot.consumption_rate || 0,
      fillRate: apiSnapshot.fill_rate || 0,
      operationMode: apiSnapshot.operation_mode || 'normal'
    }));
  },

  /**
   * Создать снимки через API (batch)
   */
  async createSnapshotsBatch(snapshots: FuelStockSnapshot[]): Promise<boolean> {
    const apiSnapshots = snapshots.map(snapshot => ({
      tank_id: snapshot.tankId.toString(),
      trading_point_id: snapshot.tradingPointId,
      fuel_type_id: 'fuel_type_1', // TODO: получать из snapshot.fuelType
      snapshot_time: snapshot.timestamp,
      current_level_liters: snapshot.currentLevelLiters,
      capacity_liters: snapshot.capacityLiters,
      temperature: snapshot.temperature,
      water_level_mm: snapshot.waterLevelMm,
      density: snapshot.density,
      tank_status: snapshot.status,
      operation_mode: snapshot.operationMode,
      consumption_rate: snapshot.consumptionRate,
      fill_rate: snapshot.fillRate,
      data_source: 'generated' as const,
      metadata: {}
    }));

    const response = await httpApiMethods.apiRequest('/fuel-stock-snapshots/batch', {
      method: 'POST',
      body: JSON.stringify({ snapshots: apiSnapshots })
    });

    return response.success;
  }
};

// Основной сервис для работы с историческими данными
export const fuelStocksHistoryService = {
  /**
   * Получить исторические данные остатков топлива
   */
  async getHistoricalData(
    startDate?: string,
    endDate?: string,
    tankId?: number,
    tradingPointId?: string
  ): Promise<FuelStockSnapshot[]> {
    try {
      // Если не mock режим, используем API
      if (!(await apiConfigServiceDB.isMockMode())) {
        return await httpApiMethods.getHistoricalDataFromAPI(
          startDate,
          endDate,
          tankId?.toString(),
          tradingPointId
        );
      }
    } catch (error) {
      console.error('❌ КРИТИЧНО: Ошибка загрузки исторических данных остатков топлива из API:', error);
      
      // Логируем критическую ошибку в базу данных
      await errorLogService.logCriticalError(
        'fuelStocksHistoryService',
        'getHistoricalData',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { 
            startDate,
            endDate,
            tankId,
            tradingPointId,
            service: 'fuelStocksHistoryService'
          }
        }
      );
      
      throw new Error(`Не удалось загрузить данные об остатках топлива: ${error.message}`);
    }
    
    // Фильтруем по параметрам
    let filteredData = snapshots;
    
    if (startDate) {
      const start = new Date(startDate);
      filteredData = filteredData.filter(s => new Date(s.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filteredData = filteredData.filter(s => new Date(s.timestamp) <= end);
    }
    
    if (tankId) {
      filteredData = filteredData.filter(s => s.tankId === tankId);
    }
    
    if (tradingPointId) {
      filteredData = filteredData.filter(s => s.tradingPointId === tradingPointId);
    }
    
    return filteredData;
  },

  /**
   * Получить остатки на конкретную дату и время
   */
  async getSnapshotAtDateTime(dateTime: string): Promise<FuelStockSnapshot[]> {
    const targetTime = new Date(dateTime);
    const allData = await this.getHistoricalData();
    
    // Находим ближайшие по времени записи для каждого резервуара
    const tankSnapshots = new Map<number, FuelStockSnapshot>();
    
    for (const snapshot of allData) {
      const snapshotTime = new Date(snapshot.timestamp);
      const timeDiff = Math.abs(targetTime.getTime() - snapshotTime.getTime());
      
      const existing = tankSnapshots.get(snapshot.tankId);
      if (!existing) {
        tankSnapshots.set(snapshot.tankId, snapshot);
      } else {
        const existingDiff = Math.abs(targetTime.getTime() - new Date(existing.timestamp).getTime());
        if (timeDiff < existingDiff) {
          tankSnapshots.set(snapshot.tankId, snapshot);
        }
      }
    }
    
    return Array.from(tankSnapshots.values()).sort((a, b) => a.tankId - b.tankId);
  },

  /**
   * Получить данные для графика по резервуару
   */
  async getTankChart(tankId: number, startDate?: string, endDate?: string): Promise<FuelStockSnapshot[]> {
    const data = await this.getHistoricalData(startDate, endDate, tankId);
    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  /**
   * Получить сводку по периоду
   */
  async getPeriodSummary(startDate: string, endDate: string): Promise<{
    totalSnapshots: number;
    tanksCount: number;
    averageLevel: number;
    totalCapacity: number;
    averageTemperature: number;
  }> {
    const data = await this.getHistoricalData(startDate, endDate);
    
    if (data.length === 0) {
      return {
        totalSnapshots: 0,
        tanksCount: 0,
        averageLevel: 0,
        totalCapacity: 0,
        averageTemperature: 0
      };
    }
    
    const uniqueTanks = new Set(data.map(s => s.tankId));
    const totalLevel = data.reduce((sum, s) => sum + s.currentLevelLiters, 0);
    const totalCapacity = data.reduce((sum, s) => sum + s.capacityLiters, 0);
    const totalTemp = data.reduce((sum, s) => sum + s.temperature, 0);
    
    return {
      totalSnapshots: data.length,
      tanksCount: uniqueTanks.size,
      averageLevel: Math.round(totalLevel / data.length),
      totalCapacity: Math.round(totalCapacity / data.length),
      averageTemperature: Math.round((totalTemp / data.length) * 10) / 10
    };
  },

  /**
   * Очистить кеш исторических данных (для перегенерации)
   */
  clearCache(): void {
    PersistentStorage.remove('fuelStocksHistory_august2025');
    console.log('🗑️ Кеш исторических данных остатков топлива очищен');
  },

  /**
   * Получить статистику по генерации данных
   */
  getGenerationInfo(): {
    period: string;
    intervalHours: number;
    snapshotsPerDay: number;
    totalDays: number;
    expectedSnapshots: number;
  } {
    return {
      period: 'Август 2025',
      intervalHours: 4,
      snapshotsPerDay: 6,
      totalDays: 31,
      expectedSnapshots: 31 * 6 * 18 // 31 день × 6 снимков в день × ~18 резервуаров
    };
  }
};