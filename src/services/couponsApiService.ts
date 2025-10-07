/**
 * Сервис для работы с реальным API купонов
 * Endpoint: https://pos.autooplata.ru/tms/v1/coupons
 */

import {
  CouponsApiResponse,
  CouponsApiParams,
  CouponSystemResponse,
  CouponWithAge,
  CouponsStationGroup,
  CouponsStats,
  CouponsSearchResult,
  CouponsFilter,
  CouponsApiError,
  CouponsAlert,
  CouponPriority
} from '../types/coupons';

const API_BASE_URL = 'https://pos.autooplata.ru/tms';

interface CouponsApiConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  timeout: number;
  token?: string;
  tokenExpiry?: number;
}

class CouponsApiService {
  private config: CouponsApiConfig | null = null;
  private refreshAttempts = 0;
  private readonly MAX_REFRESH_ATTEMPTS = 3;

  constructor() {
    this.loadConfig();
  }

  /**
   * Загрузка конфигурации API
   */
  private loadConfig() {
    try {
      // Попробуем загрузить конфигурацию STS API
      const stsConfig = localStorage.getItem('sts-api-config');
      if (stsConfig) {
        const parsedConfig = JSON.parse(stsConfig);
        this.config = {
          url: parsedConfig.url || API_BASE_URL,
          username: parsedConfig.username || '',
          password: parsedConfig.password || '',
          enabled: parsedConfig.enabled || false,
          timeout: parsedConfig.timeout || 30000,
          token: parsedConfig.token,
          tokenExpiry: parsedConfig.tokenExpiry
        };
      } else {
        console.warn('⚠️ Coupons API: Конфигурация STS API не найдена');
        this.config = {
          url: API_BASE_URL,
          username: '',
          password: '',
          enabled: false,
          timeout: 30000
        };
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации Coupons API:', error);
    }
  }

  /**
   * Обновление токена при необходимости
   */
  private async refreshTokenIfNeeded(forceRefresh = false): Promise<boolean> {
    if (!this.config?.enabled || !this.config.username || !this.config.password) {
      console.warn('⚠️ Coupons API: Конфигурация не настроена');
      return false;
    }

    const now = Date.now();
    const tokenExists = !!this.config.token;
    const tokenExpired = this.config.tokenExpiry ? this.config.tokenExpiry < now : true;

    // Проверяем, нужно ли обновить токен
    if (!tokenExists || tokenExpired || forceRefresh) {
      if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
        console.error('❌ Coupons API: Превышено максимальное количество попыток обновления токена');
        return false;
      }

      this.refreshAttempts++;

      try {
        const response = await fetch(`${this.config.url}/v1/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.config.username,
            password: this.config.password
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (response.ok) {
          const tokenResponse = await response.text();
          const cleanToken = tokenResponse.replace(/"/g, '');
          const newExpiry = Date.now() + (20 * 60 * 1000); // 20 минут

          this.config.token = cleanToken;
          this.config.tokenExpiry = newExpiry;

          // Сбрасываем счетчик при успешном обновлении
          this.refreshAttempts = 0;

          return true;
        } else {
          const errorText = await response.text();
          console.error(`❌ Coupons API: Ошибка авторизации ${response.status}:`, errorText);
          return false;
        }
      } catch (error) {
        console.error('❌ Coupons API: Ошибка при обновлении токена:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Получение купонов с API
   */
  async getCoupons(params: CouponsApiParams): Promise<CouponsApiResponse> {
    try {
      // Обновляем токен если нужно
      const tokenValid = await this.refreshTokenIfNeeded();
      if (!tokenValid) {
        throw new Error('Не удалось получить действительный токен для API купонов');
      }

      const url = new URL(`${this.config!.url}/v1/coupons`);

      // Добавляем обязательный параметр system
      url.searchParams.append('system', params.system.toString());

      // Добавляем опциональные параметры
      if (params.station) {
        url.searchParams.append('station', params.station.toString());
      }
      // Добавляем параметры дат для фильтрации
      if (params.dt_beg) {
        // Конвертируем дату в формат YYYY-MM-DD HH:MM:SS для API
        const dtBeg = params.dt_beg.includes('T')
          ? new Date(params.dt_beg).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
          : `${params.dt_beg} 00:00:00`;
        url.searchParams.append('dt_beg', dtBeg);
      }
      if (params.dt_end) {
        // Конвертируем дату в формат YYYY-MM-DD HH:MM:SS для API
        const dtEnd = params.dt_end.includes('T')
          ? new Date(params.dt_end).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
          : `${params.dt_end} 23:59:59`;
        url.searchParams.append('dt_end', dtEnd);
      }


      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.config!.token}`,
      };

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config!.timeout),
      });

      if (!response.ok) {
        // Логируем детали ошибки
        const errorText = await response.text();
        console.error(`❌ Coupons API Error ${response.status}:`, {
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });

        // Если токен истек, попробуем обновить его и повторить запрос
        if (response.status === 401 && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
          const tokenRefreshed = await this.refreshTokenIfNeeded(true);
          if (tokenRefreshed) {
            // Повторяем запрос с новым токеном
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${this.config!.token}`,
            };

            const retryResponse = await fetch(url.toString(), {
              method: 'GET',
              headers: retryHeaders,
              signal: AbortSignal.timeout(this.config!.timeout),
            });

            if (retryResponse.ok) {
              const data: CouponsApiResponse = await retryResponse.json();
              return data;
            } else {
              const retryErrorText = await retryResponse.text();
              console.error(`❌ Coupons API Retry Error ${retryResponse.status}:`, retryErrorText);
            }
          }
        }

        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: CouponsApiResponse = await response.json();

      return data;

    } catch (error) {
      console.error('❌ Ошибка загрузки купонов:', error);
      throw this.createApiError('FETCH_ERROR', 'Ошибка загрузки данных с сервера', error);
    }
  }

  /**
   * Обработка данных купонов с добавлением расчетных полей
   */
  processRawCoupons(apiResponse: CouponsApiResponse): CouponsSearchResult {
    const groups: CouponsStationGroup[] = [];
    let totalStats: CouponsStats = this.getEmptyStats();

    apiResponse.forEach(stationData => {
      const couponsWithAge = this.addAgeCalculations(stationData.coupons);

      // Создаем группу для станции
      const group: CouponsStationGroup = {
        systemId: stationData.system,
        stationId: stationData.number,
        stationName: `Станция ${stationData.number}`,
        totalDebt: this.calculateTotalDebt(couponsWithAge),
        activeCouponsCount: stationData.total.active,
        totalCouponsCount: stationData.coupons.length,
        oldCouponsCount: couponsWithAge.filter(c => c.isOld).length,
        criticalCouponsCount: couponsWithAge.filter(c => c.isCritical).length,
        coupons: couponsWithAge
      };

      groups.push(group);

      // Обновляем общую статистику
      totalStats = this.mergeStats(totalStats, this.calculateStationStats(couponsWithAge, stationData.total));
    });

    return {
      groups,
      stats: totalStats,
      totalFound: totalStats.totalCoupons,
      appliedFilters: { system: apiResponse[0]?.system || 0 }
    };
  }

  /**
   * Добавление расчетных полей к купонам
   */
  private addAgeCalculations(coupons: any[]): CouponWithAge[] {
    const now = new Date();

    return coupons.map(coupon => {
      const createdAt = new Date(coupon.dt);
      const ageInMs = now.getTime() - createdAt.getTime();
      const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
      const ageInDays = Math.floor(ageInHours / 24);

      const isOld = ageInDays > 7;
      const isCritical = ageInDays > 30;
      const isActive = coupon.state.id === 0;
      const isRedeemed = coupon.state.id === 2;
      const isExpired = ageInDays > 90; // Считаем истекшими через 90 дней

      let priority: CouponPriority = 'normal';
      if (isCritical) priority = 'critical';
      else if (isOld) priority = 'attention';

      return {
        ...coupon,
        ageInDays,
        ageInHours,
        isOld,
        isCritical,
        priority,
        isActive,
        isRedeemed,
        isExpired
      };
    });
  }

  /**
   * Расчет общего долга (остатков по купонам)
   */
  private calculateTotalDebt(coupons: CouponWithAge[]): number {
    return coupons
      .filter(c => c.isActive) // Только активные купоны
      .reduce((sum, coupon) => sum + coupon.rest_summ, 0);
  }

  /**
   * Расчет статистики для станции
   */
  private calculateStationStats(coupons: CouponWithAge[], totals: any): CouponsStats {
    // Базовые расчеты
    const expiredCoupons = coupons.filter(c => c.isOld && c.isActive);
    const totalFuelDelivered = coupons.reduce((sum, c) => sum + c.qty_used, 0);
    const expiredFuelLoss = expiredCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
    const utilizationRate = coupons.length > 0 ? (coupons.filter(c => c.qty_used > 0).length / coupons.length) * 100 : 0;

    const stats: CouponsStats = {
      totalCoupons: coupons.length,
      activeCoupons: totals.active,
      redeemedCoupons: totals.redeem,
      totalDebt: this.calculateTotalDebt(coupons),
      totalAmount: coupons.reduce((sum, c) => sum + c.summ_total, 0),
      usedAmount: coupons.reduce((sum, c) => sum + c.summ_used, 0),
      averageRest: 0,
      oldCouponsCount: coupons.filter(c => c.isOld).length,
      criticalCouponsCount: coupons.filter(c => c.isCritical).length,
      // Новые аналитические поля
      expiredCoupons: expiredCoupons.length,
      expiredAmount: expiredCoupons.reduce((sum, c) => sum + c.rest_summ, 0),
      totalFuelDelivered,
      expiredFuelLoss,
      utilizationRate
    };

    // Расчет среднего остатка
    const activeCoupons = coupons.filter(c => c.isActive);
    if (activeCoupons.length > 0) {
      stats.averageRest = stats.totalDebt / activeCoupons.length;
    }

    return stats;
  }

  /**
   * Объединение статистик
   */
  private mergeStats(total: CouponsStats, station: CouponsStats): CouponsStats {
    const merged = {
      totalCoupons: total.totalCoupons + station.totalCoupons,
      activeCoupons: total.activeCoupons + station.activeCoupons,
      redeemedCoupons: total.redeemedCoupons + station.redeemedCoupons,
      totalDebt: total.totalDebt + station.totalDebt,
      totalAmount: total.totalAmount + station.totalAmount,
      usedAmount: total.usedAmount + station.usedAmount,
      averageRest: 0, // Будет пересчитан после
      oldCouponsCount: total.oldCouponsCount + station.oldCouponsCount,
      criticalCouponsCount: total.criticalCouponsCount + station.criticalCouponsCount,
      // Новые поля
      expiredCoupons: total.expiredCoupons + station.expiredCoupons,
      expiredAmount: total.expiredAmount + station.expiredAmount,
      totalFuelDelivered: total.totalFuelDelivered + station.totalFuelDelivered,
      expiredFuelLoss: total.expiredFuelLoss + station.expiredFuelLoss,
      utilizationRate: 0 // Будет пересчитан
    };

    // Пересчитываем процент использования
    if (merged.totalCoupons > 0) {
      merged.utilizationRate = ((merged.totalCoupons - merged.activeCoupons) / merged.totalCoupons) * 100;
    }

    return merged;
  }

  /**
   * Фильтрация купонов
   */
  filterCoupons(result: CouponsSearchResult, filters: CouponsFilter): CouponsSearchResult {
    const filteredGroups = result.groups.map(group => {
      let filteredCoupons = [...group.coupons];

      // Фильтр по станции
      if (filters.station && group.stationId !== filters.station) {
        return { ...group, coupons: [] };
      }

      // Фильтр по статусу
      if (filters.state) {
        filteredCoupons = filteredCoupons.filter(coupon =>
          coupon.state.name === filters.state
        );
      }

      // Фильтр по дате
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredCoupons = filteredCoupons.filter(coupon =>
          new Date(coupon.dt) >= fromDate
        );
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filteredCoupons = filteredCoupons.filter(coupon =>
          new Date(coupon.dt) <= toDate
        );
      }

      // Поиск по номеру
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCoupons = filteredCoupons.filter(coupon =>
          coupon.number.toLowerCase().includes(searchTerm)
        );
      }

      // Фильтр по сумме остатка
      if (filters.minAmount !== undefined) {
        filteredCoupons = filteredCoupons.filter(coupon =>
          coupon.rest_summ >= filters.minAmount!
        );
      }

      if (filters.maxAmount !== undefined) {
        filteredCoupons = filteredCoupons.filter(coupon =>
          coupon.rest_summ <= filters.maxAmount!
        );
      }

      // Фильтр по возрасту
      if (filters.ageFilter && filters.ageFilter !== 'all') {
        const now = new Date();
        filteredCoupons = filteredCoupons.filter(coupon => {
          const couponDate = new Date(coupon.dt);
          const daysDiff = Math.floor((now.getTime() - couponDate.getTime()) / (1000 * 60 * 60 * 24));

          switch (filters.ageFilter) {
            case 'today':
              return daysDiff === 0;
            case 'week':
              return daysDiff <= 7;
            case 'month':
              return daysDiff <= 30;
            case 'old':
              return daysDiff > 7;
            default:
              return true;
          }
        });
      }

      return {
        ...group,
        coupons: filteredCoupons,
        totalCouponsCount: filteredCoupons.length,
        activeCouponsCount: filteredCoupons.filter(c => c.isActive).length,
        totalDebt: this.calculateTotalDebt(filteredCoupons),
        oldCouponsCount: filteredCoupons.filter(c => c.isOld).length,
        criticalCouponsCount: filteredCoupons.filter(c => c.isCritical).length
      };
    }).filter(group => group.coupons.length > 0);

    // Пересчитываем общую статистику
    const newStats = filteredGroups.reduce((total, group) => {
      const groupStats = this.calculateStationStats(group.coupons, {
        active: group.activeCouponsCount,
        redeem: group.coupons.filter(c => c.isRedeemed).length
      });
      return this.mergeStats(total, groupStats);
    }, this.getEmptyStats());

    return {
      groups: filteredGroups,
      stats: newStats,
      totalFound: newStats.totalCoupons,
      appliedFilters: filters
    };
  }

  /**
   * Получение алертов о проблемных купонах
   */
  getAlerts(result: CouponsSearchResult): CouponsAlert[] {
    const alerts: CouponsAlert[] = [];
    const allCoupons = result.groups.flatMap(g => g.coupons);

    // Алерт о старых купонах (>7 дней)
    const oldCoupons = allCoupons.filter(c => c.isOld && c.isActive);
    if (oldCoupons.length > 0) {
      alerts.push({
        type: 'old',
        severity: 'warning',
        title: 'Старые купоны',
        description: `Обнаружено ${oldCoupons.length} купонов старше 7 дней`,
        count: oldCoupons.length,
        totalAmount: oldCoupons.reduce((sum, c) => sum + c.rest_summ, 0),
        coupons: oldCoupons
      });
    }

    // Алерт о критических купонах (>30 дней)
    const criticalCoupons = allCoupons.filter(c => c.isCritical && c.isActive);
    if (criticalCoupons.length > 0) {
      alerts.push({
        type: 'critical',
        severity: 'error',
        title: 'Критические купоны',
        description: `Обнаружено ${criticalCoupons.length} купонов старше 30 дней`,
        count: criticalCoupons.length,
        totalAmount: criticalCoupons.reduce((sum, c) => sum + c.rest_summ, 0),
        coupons: criticalCoupons
      });
    }

    // Алерт о купонах с большими суммами
    const largeCoupons = allCoupons.filter(c => c.rest_summ > 1000 && c.isActive);
    if (largeCoupons.length > 0) {
      alerts.push({
        type: 'large_amount',
        severity: 'warning',
        title: 'Крупные суммы',
        description: `Обнаружено ${largeCoupons.length} купонов с остатком >1000 руб.`,
        count: largeCoupons.length,
        totalAmount: largeCoupons.reduce((sum, c) => sum + c.rest_summ, 0),
        coupons: largeCoupons
      });
    }

    return alerts;
  }

  /**
   * Создание ошибки API
   */
  private createApiError(code: string, message: string, details?: any): CouponsApiError {
    return { code, message, details };
  }

  /**
   * Пустая статистика
   */
  private getEmptyStats(): CouponsStats {
    return {
      totalCoupons: 0,
      activeCoupons: 0,
      redeemedCoupons: 0,
      totalDebt: 0,
      totalAmount: 0,
      usedAmount: 0,
      averageRest: 0,
      oldCouponsCount: 0,
      criticalCouponsCount: 0,
      // Новые поля
      expiredCoupons: 0,
      expiredAmount: 0,
      totalFuelDelivered: 0,
      expiredFuelLoss: 0,
      utilizationRate: 0
    };
  }
}

export const couponsApiService = new CouponsApiService();
export default couponsApiService;