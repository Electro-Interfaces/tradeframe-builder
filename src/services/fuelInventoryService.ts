/**
 * Сервис для работы с остатками топлива по всей сети
 */

import { stsProxyRequest } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
import type { TankHistoryRecord } from '@/types/tanks';

/**
 * Параметры для получения остатков
 */
export interface InventoryParams {
  system: number;           // external_id сети для STS API
  networkId: string;        // UUID сети для получения списка ТТ
  station?: number;         // external_id ТТ (опционально)
  dt_beg?: string;
  dt_end?: string;
}

/**
 * Агрегированные остатки по виду топлива
 */
export interface FuelInventorySummary {
  fuelCode: number;
  fuelName: string;
  totalVolumeActual: number;    // Фактический остаток (с датчиков)
  totalVolumeBook: number;       // Книжный остаток
  totalCapacity: number;         // Общая вместимость
  totalFree: number;             // Свободный объем
  tankCount: number;             // Количество резервуаров
  averageTemperature: number;    // Средняя температура
  averageDensity: number;        // Средняя плотность
  waterLevelTotal: number;       // Суммарный уровень воды
}

/**
 * Остатки по резервуару
 */
export interface TankInventory {
  station: number;
  stationName?: string;
  tankNumber: number;
  fuelCode: number;
  fuelName: string;
  volumeActual: number;          // Фактический остаток
  volumeBook: number;            // Книжный остаток
  volumeBegin: number;           // Остаток на начало смены
  capacity: number;              // Вместимость
  freeVolume: number;            // Свободный объем
  fillPercent: number;           // Процент заполнения
  temperature: number;
  density: number;
  waterLevel: number;
  lastUpdate: string;            // Время последнего обновления
}

/**
 * История остатков для графика динамики
 */
export interface InventoryHistory {
  timestamp: string;
  fuelCode: number;
  fuelName: string;
  totalVolume: number;
  stationData: {
    station: number;
    volume: number;
  }[];
}

/**
 * Получить текущие остатки по всем резервуарам сети
 */
export async function getNetworkInventory(params: InventoryParams): Promise<TankInventory[]> {
  let allHistory: Array<TankHistoryRecord & { stationId: number; stationName?: string }> = [];

  // Если указана конкретная станция - получаем данные только по ней
  if (params.station) {
    const queryParams: Record<string, any> = {
      system: params.system,
      station: params.station
    };

    if (params.dt_beg && params.dt_end) {
      queryParams.dt_beg = params.dt_beg;
      queryParams.dt_end = params.dt_end;
    }

    const history = await stsProxyRequest<TankHistoryRecord[]>('/v1/tank_history', {
      method: 'GET',
      params: queryParams
    });

    allHistory = history.map(record => ({
      ...record,
      stationId: params.station!
    }));
  } else {
    // Получаем список всех ТТ сети
    const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);
    console.log(`📍 Найдено ТТ в сети: ${tradingPoints.length}`, tradingPoints.map(p => ({ id: p.external_id, name: p.name })));

    // Запрашиваем данные для каждой ТТ параллельно
    const requests = tradingPoints.map(async (point) => {
      if (!point.external_id) {
        console.warn(`⚠️ ТТ без external_id:`, point.name);
        return [];
      }

      const queryParams: Record<string, any> = {
        system: params.system,
        station: parseInt(point.external_id)
      };

      if (params.dt_beg && params.dt_end) {
        queryParams.dt_beg = params.dt_beg;
        queryParams.dt_end = params.dt_end;
      }

      try {
        const history = await stsProxyRequest<TankHistoryRecord[]>('/v1/tank_history', {
          method: 'GET',
          params: queryParams
        });

        console.log(`✅ ТТ ${point.external_id} (${point.name}): получено ${history.length} записей`);

        return history.map(record => ({
          ...record,
          stationId: parseInt(point.external_id!),
          stationName: point.name
        }));
      } catch (error) {
        console.error(`❌ Ошибка загрузки данных для ТТ ${point.external_id} (${point.name}):`, error);
        return [];
      }
    });

    const results = await Promise.all(requests);
    allHistory = results.flat();
    console.log(`📊 Всего записей истории после объединения: ${allHistory.length}`);
  }

  // Группируем по резервуарам (station + tankNumber) и берем последнюю запись
  const tankMap = new Map<string, typeof allHistory[0]>();

  allHistory.forEach(record => {
    const key = `${record.stationId}_${record.number}`;
    const existing = tankMap.get(key);

    if (!existing || new Date(record.dt) > new Date(existing.dt)) {
      tankMap.set(key, record);
    }
  });

  console.log(`🗂️ Уникальных резервуаров после группировки: ${tankMap.size}`);

  // Преобразуем в TankInventory
  let inventory: TankInventory[] = [];

  try {
    inventory = Array.from(tankMap.values()).map(record => ({
      station: record.stationId,
      stationName: record.stationName,
      tankNumber: record.number,
      fuelCode: record.fuel,
      fuelName: record.fuel_name,
      volumeActual: parseFloat(record.volume),
      volumeBook: parseFloat(record.volume_end),
      volumeBegin: parseFloat(record.volume_begin),
      capacity: parseFloat(record.volume_max),
      freeVolume: parseFloat(record.volume_free),
      fillPercent: (parseFloat(record.volume) / parseFloat(record.volume_max)) * 100,
      temperature: parseFloat(record.temperature),
      density: parseFloat(record.density),
      waterLevel: record.water?.level ? parseFloat(record.water.level) : 0,
      lastUpdate: record.dt
    }));

    console.log(`✅ Итого резервуаров в результате: ${inventory.length}`);
    if (inventory.length > 0) {
      console.log('📝 Пример первого резервуара:', inventory[0]);
    }
  } catch (error) {
    console.error('❌ Ошибка при преобразовании данных:', error);
    console.log('🔍 Первая запись для отладки:', Array.from(tankMap.values())[0]);
    throw error;
  }

  return inventory;
}

/**
 * Получить агрегированные остатки по видам топлива
 */
export function aggregateByFuel(inventory: TankInventory[]): FuelInventorySummary[] {
  console.log(`📊 aggregateByFuel: получено ${inventory.length} резервуаров`);
  if (inventory.length > 0) {
    console.log('Пример первого резервуара:', inventory[0]);
  }

  const fuelMap = new Map<number, FuelInventorySummary>();

  inventory.forEach(tank => {
    // Пропускаем резервуары с некорректными данными
    if (isNaN(tank.volumeActual) || isNaN(tank.capacity) || tank.capacity === 0) {
      console.warn(`⚠️ Пропуск резервуара с некорректными данными: ТТ ${tank.station}, Р${tank.tankNumber}`);
      return;
    }

    const existing = fuelMap.get(tank.fuelCode);

    if (existing) {
      existing.totalVolumeActual += tank.volumeActual;
      existing.totalVolumeBook += tank.volumeBook || 0;
      existing.totalCapacity += tank.capacity;
      existing.totalFree += tank.freeVolume || 0;
      existing.tankCount += 1;
      existing.averageTemperature += tank.temperature || 0;
      existing.averageDensity += tank.density || 0;
      existing.waterLevelTotal += tank.waterLevel || 0;
    } else {
      fuelMap.set(tank.fuelCode, {
        fuelCode: tank.fuelCode,
        fuelName: tank.fuelName,
        totalVolumeActual: tank.volumeActual,
        totalVolumeBook: tank.volumeBook || 0,
        totalCapacity: tank.capacity,
        totalFree: tank.freeVolume || 0,
        tankCount: 1,
        averageTemperature: tank.temperature || 0,
        averageDensity: tank.density || 0,
        waterLevelTotal: tank.waterLevel || 0
      });
    }
  });

  // Вычисляем средние значения
  const summaries = Array.from(fuelMap.values());
  summaries.forEach(summary => {
    summary.averageTemperature /= summary.tankCount;
    summary.averageDensity /= summary.tankCount;
  });

  console.log(`📊 aggregateByFuel: результат - ${summaries.length} видов топлива`, summaries);

  return summaries;
}

/**
 * Получить динамику остатков за период
 */
export async function getInventoryHistory(
  params: InventoryParams,
  interval: '1h' | '6h' | '1d' = '6h'
): Promise<InventoryHistory[]> {
  // TODO: Реализовать получение истории с агрегацией по времени
  // Пока возвращаем пустой массив
  console.warn('⚠️ getInventoryHistory: not implemented yet');
  return [];
}
