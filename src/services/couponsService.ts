/**
 * Coupons Service - Сервис для работы с купонами (сдача топливом)
 * API: /v1/coupons
 */

import {
  Coupon,
  CouponSystemResponse,
  CouponsApiResponse,
  CouponsApiParams,
  CouponsApiError,
  CouponsLoadingState
} from '@/types/coupons';

// Класс для работы с API купонов
class CouponsApiService {
  private baseUrl: string;

  constructor() {
    // Получаем URL из настроек STS API (аналогично другим сервисам)
    this.baseUrl = this.getApiBaseUrl();
  }

  /**
   * Получить базовый URL API из localStorage настроек STS
   */
  private getApiBaseUrl(): string {
    try {
      const stsConfig = localStorage.getItem('sts-api-config');
      if (stsConfig) {
        const config = JSON.parse(stsConfig);
        return config.url || 'https://pos.autooplata.ru/tms';
      }
    } catch (error) {
      console.error('Ошибка получения URL API:', error);
    }

    // Fallback URL по умолчанию
    return 'https://pos.autooplata.ru/tms';
  }

  /**
   * Получить JWT токен из настроек STS API
   */
  private getAuthToken(): string | null {
    try {
      const stsConfig = localStorage.getItem('sts-api-config');
      if (stsConfig) {
        const config = JSON.parse(stsConfig);
        return config.token || null;
      }
    } catch (error) {
      console.error('Ошибка получения токена:', error);
    }

    return null;
  }

  /**
   * Проверить валидность токена (не истек ли)
   */
  private isTokenValid(): boolean {
    try {
      const stsConfig = localStorage.getItem('sts-api-config');
      if (stsConfig) {
        const config = JSON.parse(stsConfig);
        const tokenExpiry = config.tokenExpiry;

        if (tokenExpiry && Date.now() < tokenExpiry) {
          return true;
        }
      }
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
    }

    return false;
  }

  /**
   * Обновление JWT токена при необходимости
   */
  private async refreshTokenIfNeeded(forceRefresh = false): Promise<boolean> {
    try {
      const stsConfig = localStorage.getItem('sts-api-config');
      if (!stsConfig) {
        console.error('🎫 Coupons API: Конфигурация STS API не найдена');
        return false;
      }

      const config = JSON.parse(stsConfig);
      const now = Date.now();
      const tokenExists = !!config.token;
      const tokenExpired = config.tokenExpiry ? config.tokenExpiry < now : true;

      // Проверяем, нужно ли обновить токен
      if (!tokenExists || tokenExpired || forceRefresh) {
        console.log('🎫 Coupons API: Обновляем JWT токен...');

        const response = await fetch(`${config.url || this.baseUrl}/v1/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: config.username || 'UserApi',
            password: config.password || 'lHQfLZHzB3tn'
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const tokenResponse = await response.text();
          const cleanToken = tokenResponse.replace(/"/g, '');
          const newExpiry = Date.now() + (20 * 60 * 1000); // 20 минут

          config.token = cleanToken;
          config.tokenExpiry = newExpiry;

          // Сохраняем обновленную конфигурацию
          localStorage.setItem('sts-api-config', JSON.stringify(config));

          console.log('🎫 Coupons API: JWT токен успешно обновлен');
          return true;
        } else {
          const errorText = await response.text();
          console.error(`🎫 Coupons API: Ошибка авторизации HTTP ${response.status}:`, errorText);
          return false;
        }
      }

      return true; // Токен валиден
    } catch (error) {
      console.error('🎫 Coupons API: Ошибка обновления токена:', error);
      return false;
    }
  }

  /**
   * Выполнить HTTP запрос к API
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: RequestInit = {}
  ): Promise<T> {
    // Сначала обновляем токен при необходимости
    const tokenRefreshed = await this.refreshTokenIfNeeded();
    if (!tokenRefreshed) {
      throw new Error('Не удалось обновить JWT токен. Проверьте настройки API CTC.');
    }

    // Получаем свежий токен
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('JWT токен недоступен после обновления.');
    }

    // Формируем URL с параметрами
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    // Заголовки запроса
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers as Record<string, string>
    };

    try {
      console.log('🎫 Coupons API Request:', {
        url: url.toString(),
        method: options.method || 'GET',
        headers: { ...headers, Authorization: 'Bearer ***' }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        ...options
      });

      if (!response.ok) {
        // Если получили 401, пробуем обновить токен и повторить запрос
        if (response.status === 401) {
          console.log('🎫 Coupons API: Получен 401, обновляем токен и повторяем запрос...');

          const tokenRefreshed = await this.refreshTokenIfNeeded(true);
          if (tokenRefreshed) {
            // Получаем обновленный токен и повторяем запрос
            const newToken = this.getAuthToken();
            if (newToken) {
              const retryHeaders = {
                ...headers,
                'Authorization': `Bearer ${newToken}`
              };

              const retryResponse = await fetch(url.toString(), {
                method: 'GET',
                headers: retryHeaders,
                ...options
              });

              if (retryResponse.ok) {
                const data = await retryResponse.json();
                console.log('🎫 Coupons API: Повторный запрос успешен после обновления токена');
                return data;
              }
            }
          }
        }

        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();

      console.log('🎫 Coupons API Response:', {
        status: response.status,
        dataType: Array.isArray(data) ? `array[${data.length}]` : typeof data,
        sample: Array.isArray(data) && data.length > 0 ? data[0] : data
      });

      return data;
    } catch (error) {
      console.error('🎫 Coupons API Error:', error);
      throw error;
    }
  }

  /**
   * Получить список купонов
   * @param params Параметры запроса
   * @returns Массив систем с купонами
   */
  async getCoupons(params: CouponsApiParams): Promise<CouponsApiResponse> {
    // Валидация обязательных параметров
    if (!params.system) {
      throw new Error('Параметр system является обязательным');
    }

    // Временно убираем фильтрацию по датам для тестирования
    const apiParams = {
      system: params.system,
      ...(params.station && { station: params.station })
    };

    // TODO: Восстановить фильтрацию по датам когда исправят SQL запрос на сервере
    // if (apiParams.dt_beg) {
    //   apiParams.dt_beg = `${apiParams.dt_beg} 00:00:00`;
    // }
    // if (apiParams.dt_end) {
    //   apiParams.dt_end = `${apiParams.dt_end} 23:59:59`;
    // }

    console.log('🎫 Получение купонов с параметрами:', apiParams);

    const data = await this.makeRequest<CouponsApiResponse>('/v1/coupons', apiParams);

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

    console.log('🎫 Получено купонов:', {
      систем: data.length,
      общий_купонов: data.reduce((sum, sys) => sum + sys.coupons.length, 0)
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
      console.log('🧪 Тестирование API купонов...');

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