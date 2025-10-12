/**
 * Coupons Service - Сервис для работы с купонами через Backend Proxy
 * API: /api/sts/v1/coupons
 */

import { stsProxyClient } from './stsProxyClient';
import {
  Coupon,
  CouponSystemResponse,
  CouponsApiResponse,
  CouponsApiParams,
  CouponsApiError,
  CouponsLoadingState
} from '@/types/coupons';

// Класс для работы с API купонов через Backend Proxy
class CouponsApiService {
  /**
   * Получить список купонов через Backend Proxy
   * @param params Параметры запроса
   * @returns Массив систем с купонами
   */
  async getCoupons(params: CouponsApiParams): Promise<CouponsApiResponse> {
    // Валидация обязательных параметров
    if (!params.system) {
      throw new Error('Параметр system является обязательным');
    }

    // Формируем параметры для Backend Proxy
    const apiParams: Record<string, any> = {
      system: params.system,
      ...(params.station && { station: params.station })
    };

    // TODO: Восстановить фильтрацию по датам когда исправят SQL запрос на сервере
    // if (params.dt_beg) {
    //   apiParams.dt_beg = `${params.dt_beg} 00:00:00`;
    // }
    // if (params.dt_end) {
    //   apiParams.dt_end = `${params.dt_end} 23:59:59`;
    // }

    const data = await stsProxyClient.get<CouponsApiResponse>('/v1/coupons', apiParams);

    // Валидация структуры ответа
    if (!Array.isArray(data)) {
      throw new Error('Неверная структура ответа API: ожидался массив');
    }

    // Проверяем структуру каждого элемента
    data.forEach((systemData, index) => {
      if (typeof systemData.system !== 'number' || typeof systemData.number !== 'number') {
        throw new Error(`Неверная структура элемента ${index}: отсутствуют system или number`);
      }

      if (!Array.isArray(systemData.coupons)) {
        throw new Error(`Неверная структура элемента ${index}: coupons должен быть массивом`);
      }
    });

    return data;
  }

  /**
   * Поиск купона по номеру
   * @param couponNumber Номер купона
   * @param systemId ID системы
   * @returns Найденный купон или null
   */
  async findCouponByNumber(couponNumber: string, systemId: number): Promise<Coupon | null> {
    const params: CouponsApiParams = { system: systemId };
    const data = await this.getCoupons(params);

    // Ищем купон во всех системах и станциях
    for (const systemData of data) {
      for (const coupon of systemData.coupons) {
        if (coupon.number === couponNumber) {
          return coupon;
        }
      }
    }

    return null;
  }

  /**
   * Получить купоны по станции
   * @param systemId ID системы
   * @param stationId ID станции
   * @param dateFrom Дата начала (опционально)
   * @param dateTo Дата окончания (опционально)
   * @returns Купоны конкретной станции
   */
  async getCouponsByStation(
    systemId: number,
    stationId: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Coupon[]> {
    const params: CouponsApiParams = {
      system: systemId,
      station: stationId,
      ...(dateFrom && { dt_beg: dateFrom }),
      ...(dateTo && { dt_end: dateTo })
    };

    const data = await this.getCoupons(params);

    // Возвращаем все купоны из всех найденных станций
    return data.reduce((allCoupons: Coupon[], systemData) => {
      return allCoupons.concat(systemData.coupons);
    }, []);
  }

  /**
   * Тестовый запрос для проверки API
   * @param systemId ID системы для теста
   * @returns Результат теста
   */
  async testApiConnection(systemId: number = 15): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {

      const startTime = Date.now();
      const data = await this.getCoupons({ system: systemId });
      const responseTime = Date.now() - startTime;

      const totalCoupons = data.reduce((sum, sys) => sum + sys.coupons.length, 0);

      return {
        success: true,
        message: `API работает. Получено ${totalCoupons} купонов за ${responseTime}мс`,
        data: {
          systems: data.length,
          totalCoupons,
          responseTime,
          sample: data[0] || null
        }
      };
    } catch (error: any) {
      console.error('🧪 Ошибка тестирования API:', error);

      return {
        success: false,
        message: 'Ошибка подключения к API',
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }
}

// Создаем единственный экземпляр сервиса
export const couponsApiService = new CouponsApiService();

// Экспортируем класс для возможности создания дополнительных экземпляров
export { CouponsApiService };