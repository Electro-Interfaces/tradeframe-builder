/**
 * Сервис для работы с резервуарами через Backend Proxy
 * Только реальные данные из STS API через proxy, без mock
 */

import { stsProxyClient } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
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
   */
  async getTanks(networkId: string, tradingPointId: string): Promise<Tank[]> {
    if (!networkId || !tradingPointId) {
      throw new Error('Не указаны сеть или торговая точка');
    }

    if (tradingPointId === 'all') {
      throw new Error('Выберите конкретную торговую точку для просмотра данных резервуаров');
    }

    try {
      // Получаем полные данные торговой точки для external_id
      const tradingPoint = await tradingPointsService.getById(tradingPointId);

      if (!tradingPoint) {
        throw new Error('Торговая точка не найдена в системе');
      }

      if (!tradingPoint.external_id) {
        throw new Error('У торговой точки отсутствует внешний идентификатор для связи с STS API');
      }

      // Запрос через Backend Proxy
      const tanks = await stsProxyClient.get<Tank[]>('/v1/tanks', {
        system: networkId,
        station: tradingPoint.external_id
      });

      if (!tanks || tanks.length === 0) {
        throw new Error('STS API не вернул данных о резервуарах для данной торговой точки');
      }

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
