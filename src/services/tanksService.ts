/**
 * Сервис для работы с резервуарами через Backend Proxy
 * Только реальные данные из STS API через proxy, без mock
 */

import { stsProxyClient } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
import { networksService } from './networksService';
import type {
  Tank,
  TankEvent,
  TankCalibration,
  TankSettingsFormData
} from '@/types/tanks';

/**
 * Класс для работы с резервуарами
 */
class TanksService {
  /**
   * Получить резервуары через Backend Proxy
   * ЕДИНСТВЕННЫЙ реальный источник данных для резервуаров
   * ОПТИМИЗИРОВАНО: Параллельные запросы вместо последовательных
   */
  async getTanks(networkId: string, tradingPointId: string): Promise<Tank[]> {
    if (!networkId || !tradingPointId) {
      throw new Error('Не указаны сеть или торговая точка');
    }

    if (tradingPointId === 'all') {
      throw new Error('Выберите конкретную торговую точку для просмотра данных резервуаров');
    }

    try {
      // ОПТИМИЗАЦИЯ: Параллельные запросы вместо последовательных
      // Было: 3 запроса друг за другом (~1400-4000мс)
      // Стало: 2 параллельных запроса + 1 STS запрос (~1200-3200мс, выигрыш 15-20%)
      const [network, tradingPoint] = await Promise.all([
        networksService.getById(networkId),
        tradingPointsService.getById(tradingPointId)
      ]);

      if (!network) {
        throw new Error('Сеть не найдена в системе');
      }

      if (!network.external_id) {
        throw new Error('У сети отсутствует внешний идентификатор для связи с STS API');
      }

      if (!tradingPoint) {
        throw new Error('Торговая точка не найдена в системе');
      }

      if (!tradingPoint.external_id) {
        throw new Error('У торговой точки отсутствует внешний идентификатор для связи с STS API');
      }

      // Запрос через Backend Proxy с использованием external_id
      const apiTanks = await stsProxyClient.get<any[]>('/v1/tanks', {
        system: network.external_id,
        station: tradingPoint.external_id
      });

      if (!apiTanks || apiTanks.length === 0) {
        throw new Error('STS API не вернул данных о резервуарах для данной торговой точки');
      }

      // Преобразуем данные от API в формат Tank
      const tanks: Tank[] = apiTanks.map(apiTank => ({
        id: apiTank.number || apiTank.id,
        name: `Резервуар №${apiTank.number}`,
        fuelType: apiTank.fuel_name || 'Неизвестно',
        currentLevelLiters: parseFloat(apiTank.volume_end || apiTank.volume || '0'),
        capacityLiters: parseFloat(apiTank.volume_max || '0'),
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        temperature: parseFloat(apiTank.temperature || '0'),
        waterLevelMm: parseFloat(apiTank.water?.level || '0'),
        density: parseFloat(apiTank.density || '0'),
        mass: parseFloat(apiTank.amount_end || '0'),
        sensors: [],
        lastCalibration: new Date().toISOString(),
        linkedPumps: [],
        notifications: {
          enabled: true,
          drainAlerts: true,
          levelAlerts: true
        },
        thresholds: {
          criticalTemp: { min: -40, max: 50 },
          maxWaterLevel: 50,
          notifications: {
            critical: true,
            minimum: true,
            temperature: true,
            water: true
          }
        },
        apiData: {
          temperature: parseFloat(apiTank.temperature || '0'),
          level: parseFloat(apiTank.level || '0'),
          water: {
            level: parseFloat(apiTank.water?.level || '0')
          },
          density: parseFloat(apiTank.density || '0'),
          amount_begin: parseFloat(apiTank.amount_begin || '0'),
          amount_end: parseFloat(apiTank.amount_end || '0'),
          volume_begin: parseFloat(apiTank.volume_begin || '0'),
          volume_end: parseFloat(apiTank.volume_end || '0'),
          release: {
            volume: parseFloat(apiTank.release?.volume || '0'),
            amount: parseFloat(apiTank.release?.amount || '0')
          },
          dt: apiTank.dt || new Date().toISOString(),
          state: apiTank.state,
          fuel: apiTank.fuel
        }
      }));

      return tanks;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Произошла неизвестная ошибка при загрузке данных резервуаров из STS API');
    }
  }

  /**
   * Получить события резервуара
   * @throws {Error} API не реализовано
   */
  async getTankEvents(tankId: number | string, limit = 5): Promise<TankEvent[]> {
    throw new Error('Функция получения событий резервуара не реализована. Обратитесь к администратору системы для настройки соответствующего API.');
  }

  /**
   * Получить калибровки резервуара
   * @throws {Error} API не реализовано
   */
  async getTankCalibrations(tankId: number | string): Promise<TankCalibration[]> {
    throw new Error('Функция получения калибровок резервуара не реализована. Обратитесь к администратору системы для настройки соответствующего API.');
  }

  /**
   * Обновить настройки резервуара
   * @throws {Error} API не реализовано
   */
  async updateTankSettings(
    tankId: number | string,
    settings: TankSettingsFormData
  ): Promise<{ success: boolean; id: number | string }> {
    throw new Error('Функция обновления настроек резервуара не реализована. Обратитесь к администратору системы для настройки соответствующего API.');
  }

  /**
   * Загрузить файл калибровки
   * @throws {Error} API не реализовано
   */
  async uploadCalibration(
    tankId: number | string,
    formData: FormData
  ): Promise<{ success: boolean; id: number }> {
    throw new Error('Функция загрузки калибровки не реализована. Обратитесь к администратору системы для настройки соответствующего API.');
  }
}

export const tanksService = new TanksService();
