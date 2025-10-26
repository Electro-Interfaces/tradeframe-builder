/**
 * Сервис для работы с реальным API купонов через Backend Proxy
 * Endpoint: /api/sts/v1/coupons
 */

import { stsProxyClient } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
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

class CouponsApiService {
  /**
   * Получение купонов с API через Backend Proxy
   */
  async getCoupons(params: CouponsApiParams): Promise<CouponsApiResponse> {
    try {
      // Формируем параметры для Backend Proxy
      const queryParams: Record<string, any> = {
        system: params.system.toString(),
      };

      if (params.station) {
        queryParams.station = params.station.toString();
      }

      // Добавляем параметры дат для фильтрации
      if (params.dt_beg) {
        // Конвертируем дату в формат YYYY-MM-DD HH:MM:SS для API
        const dtBeg = params.dt_beg.includes('T')
          ? new Date(params.dt_beg).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
          : `${params.dt_beg} 00:00:00`;
        queryParams.dt_beg = dtBeg;
      }
      if (params.dt_end) {
        // Конвертируем дату в формат YYYY-MM-DD HH:MM:SS для API
        const dtEnd = params.dt_end.includes('T')
          ? new Date(params.dt_end).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
          : `${params.dt_end} 23:59:59`;
        queryParams.dt_end = dtEnd;
      }

      return stsProxyClient.get<CouponsApiResponse>('/v1/coupons', queryParams);
    } catch (error) {
      console.error('❌ Ошибка загрузки купонов:', error);
      throw this.createApiError('FETCH_ERROR', 'Ошибка загрузки данных с сервера', error);
    }
  }

  /**
   * Обработка данных купонов с добавлением расчетных полей
   */
  async processRawCoupons(apiResponse: CouponsApiResponse, stationName?: string): Promise<CouponsSearchResult> {
    const groups: CouponsStationGroup[] = [];
    let totalStats: CouponsStats = this.getEmptyStats();

    // Загружаем все торговые точки один раз для получения названий
    const allTradingPoints = await tradingPointsService.getAll();

    apiResponse.forEach(stationData => {
      // Пытаемся найти название станции по external_id
      let displayStationName = stationName;

      if (!displayStationName) {
        const tradingPoint = allTradingPoints.find(
          tp => tp.external_id === String(stationData.number)
        );
        displayStationName = tradingPoint?.name || `ТТ ${stationData.number}`;
      }

      const couponsWithAge = this.addAgeCalculations(stationData.coupons, displayStationName, stationData.number);

      // Создаем группу для станции
      const group: CouponsStationGroup = {
        systemId: stationData.system,
        stationId: stationData.number,
        stationName: displayStationName,
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
  private addAgeCalculations(coupons: any[], stationName: string, stationCode: number): CouponWithAge[] {
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
        isExpired,
        stationName,
        stationCode
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