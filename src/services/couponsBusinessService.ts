/**
 * Coupons Business Service - Бизнес-логика для работы с купонами
 * Функции расчета, группировки, статистики и анализа
 */

import {
  Coupon,
  CouponWithAge,
  CouponsStationGroup,
  CouponsStats,
  CouponsSearchResult,
  CouponsFilter,
  CouponsAlert,
  CouponPriority,
  CouponsMonitoringSettings,
  CouponsApiResponse
} from '@/types/coupons';

// Настройки мониторинга по умолчанию
const DEFAULT_MONITORING_SETTINGS: CouponsMonitoringSettings = {
  oldCouponThresholdDays: 7,
  criticalCouponThresholdDays: 30,
  largeAmountThreshold: 1000,
  enableNotifications: true
};

class CouponsBusinessService {
  private monitoringSettings: CouponsMonitoringSettings;

  constructor(settings?: Partial<CouponsMonitoringSettings>) {
    this.monitoringSettings = { ...DEFAULT_MONITORING_SETTINGS, ...settings };
  }

  /**
   * Обогащение купона расчетными данными (возраст, приоритет)
   */
  enrichCouponWithAge(coupon: Coupon): CouponWithAge {
    const now = new Date();
    const couponDate = new Date(coupon.dt_beg);

    // Расчет возраста в миллисекундах
    const ageInMs = now.getTime() - couponDate.getTime();
    const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
    const ageInDays = Math.floor(ageInHours / 24);

    // Определение состояния возраста
    const isOld = ageInDays > this.monitoringSettings.oldCouponThresholdDays;
    const isCritical = ageInDays > this.monitoringSettings.criticalCouponThresholdDays;

    // Определение приоритета
    let priority: CouponPriority = 'normal';
    if (isCritical || coupon.rest > this.monitoringSettings.largeAmountThreshold) {
      priority = 'critical';
    } else if (isOld || coupon.rest > this.monitoringSettings.largeAmountThreshold / 2) {
      priority = 'attention';
    }

    return {
      ...coupon,
      ageInDays,
      ageInHours,
      isOld,
      isCritical,
      priority
    };
  }

  /**
   * Группировка купонов по станциям
   */
  groupCouponsByStation(apiResponse: CouponsApiResponse): CouponsStationGroup[] {
    return apiResponse.map(systemData => {
      // Обогащаем каждый купон расчетными данными
      const enrichedCoupons = systemData.coupons.map(coupon => this.enrichCouponWithAge(coupon));

      // Расчет агрегированной статистики по станции
      const activeCoupons = enrichedCoupons.filter(c => c.state === 'Активен');
      const totalDebt = activeCoupons.reduce((sum, c) => sum + c.rest, 0);
      const oldCoupons = enrichedCoupons.filter(c => c.isOld);
      const criticalCoupons = enrichedCoupons.filter(c => c.isCritical);

      return {
        systemId: systemData.system,
        stationId: systemData.number,
        stationName: `Станция ${systemData.number}`, // TODO: получать из справочника станций
        totalDebt,
        activeCouponsCount: activeCoupons.length,
        totalCouponsCount: enrichedCoupons.length,
        oldCouponsCount: oldCoupons.length,
        criticalCouponsCount: criticalCoupons.length,
        coupons: enrichedCoupons
      };
    });
  }

  /**
   * Расчет общей статистики по купонам
   */
  calculateStats(groups: CouponsStationGroup[]): CouponsStats {
    const allCoupons = groups.flatMap(group => group.coupons);

    const activeCoupons = allCoupons.filter(c => c.state === 'Активен');
    const redeemedCoupons = allCoupons.filter(c => c.state === 'Погашен');

    const totalAmount = allCoupons.reduce((sum, c) => sum + c.summ_total, 0);
    const usedAmount = allCoupons.reduce((sum, c) => sum + c.summ_used, 0);
    const totalDebt = activeCoupons.reduce((sum, c) => sum + c.rest, 0);

    const averageRest = activeCoupons.length > 0
      ? totalDebt / activeCoupons.length
      : 0;

    const oldCoupons = allCoupons.filter(c => c.isOld);
    const criticalCoupons = allCoupons.filter(c => c.isCritical);

    return {
      totalCoupons: allCoupons.length,
      activeCoupons: activeCoupons.length,
      redeemedCoupons: redeemedCoupons.length,
      totalDebt,
      totalAmount,
      usedAmount,
      averageRest,
      oldCouponsCount: oldCoupons.length,
      criticalCouponsCount: criticalCoupons.length
    };
  }

  /**
   * Применение фильтров к купонам
   */
  applyFilters(groups: CouponsStationGroup[], filters: CouponsFilter): CouponsStationGroup[] {
    return groups.map(group => {
      let filteredCoupons = [...group.coupons];

      // Фильтр по статусу
      if (filters.state) {
        filteredCoupons = filteredCoupons.filter(c => c.state === filters.state);
      }

      // Фильтр по дате создания
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredCoupons = filteredCoupons.filter(c => new Date(c.dt_beg) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filteredCoupons = filteredCoupons.filter(c => new Date(c.dt_beg) <= toDate);
      }

      // Поиск по номеру купона
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCoupons = filteredCoupons.filter(c =>
          c.number.toLowerCase().includes(searchTerm)
        );
      }

      // Фильтр по сумме остатка
      if (filters.minAmount !== undefined) {
        filteredCoupons = filteredCoupons.filter(c => c.rest >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        filteredCoupons = filteredCoupons.filter(c => c.rest <= filters.maxAmount!);
      }

      // Фильтр по возрасту
      if (filters.ageFilter && filters.ageFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        switch (filters.ageFilter) {
          case 'today':
            filteredCoupons = filteredCoupons.filter(c => new Date(c.dt_beg) >= today);
            break;
          case 'week':
            filteredCoupons = filteredCoupons.filter(c => new Date(c.dt_beg) >= weekAgo);
            break;
          case 'month':
            filteredCoupons = filteredCoupons.filter(c => new Date(c.dt_beg) >= monthAgo);
            break;
          case 'old':
            filteredCoupons = filteredCoupons.filter(c => c.isOld);
            break;
        }
      }

      // Пересчитываем статистику группы
      const activeCoupons = filteredCoupons.filter(c => c.state === 'Активен');
      const totalDebt = activeCoupons.reduce((sum, c) => sum + c.rest, 0);

      return {
        ...group,
        coupons: filteredCoupons,
        totalDebt,
        activeCouponsCount: activeCoupons.length,
        totalCouponsCount: filteredCoupons.length,
        oldCouponsCount: filteredCoupons.filter(c => c.isOld).length,
        criticalCouponsCount: filteredCoupons.filter(c => c.isCritical).length
      };
    }).filter(group => group.coupons.length > 0); // Убираем группы без купонов
  }

  /**
   * Выполнение поиска с фильтрами
   */
  searchCoupons(apiResponse: CouponsApiResponse, filters: CouponsFilter): CouponsSearchResult {
    // Группируем купоны
    const allGroups = this.groupCouponsByStation(apiResponse);

    // Применяем фильтры
    const filteredGroups = this.applyFilters(allGroups, filters);

    // Рассчитываем статистику
    const stats = this.calculateStats(filteredGroups);

    // Считаем общее количество найденных купонов
    const totalFound = filteredGroups.reduce((sum, group) => sum + group.coupons.length, 0);

    return {
      groups: filteredGroups,
      stats,
      totalFound,
      appliedFilters: filters
    };
  }

  /**
   * Генерация алертов о проблемных купонах
   */
  generateAlerts(groups: CouponsStationGroup[]): CouponsAlert[] {
    const alerts: CouponsAlert[] = [];
    const allCoupons = groups.flatMap(group => group.coupons);

    // Алерт о старых купонах
    const oldCoupons = allCoupons.filter(c => c.isOld && !c.isCritical && c.state === 'Активен');
    if (oldCoupons.length > 0) {
      const totalAmount = oldCoupons.reduce((sum, c) => sum + c.rest, 0);
      alerts.push({
        type: 'old',
        severity: 'warning',
        title: 'Старые купоны',
        description: `Обнаружено ${oldCoupons.length} купонов старше ${this.monitoringSettings.oldCouponThresholdDays} дней`,
        count: oldCoupons.length,
        totalAmount,
        coupons: oldCoupons
      });
    }

    // Алерт о критических купонах
    const criticalCoupons = allCoupons.filter(c => c.isCritical && c.state === 'Активен');
    if (criticalCoupons.length > 0) {
      const totalAmount = criticalCoupons.reduce((sum, c) => sum + c.rest, 0);
      alerts.push({
        type: 'critical',
        severity: 'error',
        title: 'Критические купоны',
        description: `Обнаружено ${criticalCoupons.length} купонов старше ${this.monitoringSettings.criticalCouponThresholdDays} дней`,
        count: criticalCoupons.length,
        totalAmount,
        coupons: criticalCoupons
      });
    }

    // Алерт о купонах с большими суммами
    const largeCoupons = allCoupons.filter(c =>
      c.rest > this.monitoringSettings.largeAmountThreshold && c.state === 'Активен'
    );
    if (largeCoupons.length > 0) {
      const totalAmount = largeCoupons.reduce((sum, c) => sum + c.rest, 0);
      alerts.push({
        type: 'large_amount',
        severity: 'warning',
        title: 'Крупные суммы',
        description: `Обнаружено ${largeCoupons.length} купонов с остатком свыше ${this.monitoringSettings.largeAmountThreshold} руб.`,
        count: largeCoupons.length,
        totalAmount,
        coupons: largeCoupons
      });
    }

    return alerts.sort((a, b) => {
      // Сортируем по серьезности (error первые) и количеству
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return b.count - a.count;
    });
  }

  /**
   * Поиск купона по номеру во всех группах
   */
  findCouponInGroups(groups: CouponsStationGroup[], couponNumber: string): CouponWithAge | null {
    for (const group of groups) {
      const coupon = group.coupons.find(c => c.number === couponNumber);
      if (coupon) {
        return coupon;
      }
    }
    return null;
  }

  /**
   * Получение топ-N станций по задолженности
   */
  getTopStationsByDebt(groups: CouponsStationGroup[], limit: number = 5): CouponsStationGroup[] {
    return [...groups]
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, limit);
  }

  /**
   * Получение топ-N купонов по остатку
   */
  getTopCouponsByRest(groups: CouponsStationGroup[], limit: number = 10): CouponWithAge[] {
    const allCoupons = groups.flatMap(group => group.coupons);
    return allCoupons
      .filter(c => c.state === 'Активен')
      .sort((a, b) => b.rest - a.rest)
      .slice(0, limit);
  }

  /**
   * Обновление настроек мониторинга
   */
  updateMonitoringSettings(settings: Partial<CouponsMonitoringSettings>): void {
    this.monitoringSettings = { ...this.monitoringSettings, ...settings };
  }

  /**
   * Получение текущих настроек мониторинга
   */
  getMonitoringSettings(): CouponsMonitoringSettings {
    return { ...this.monitoringSettings };
  }

  /**
   * Экспорт купонов в CSV формат (простая реализация)
   */
  exportToCsv(coupons: CouponWithAge[]): string {
    const headers = [
      'Номер купона',
      'Дата выдачи',
      'POS',
      'Смена',
      'Операция',
      'Сумма общая',
      'Использовано',
      'Остаток',
      'Статус',
      'Возраст (дни)',
      'Приоритет'
    ];

    const rows = coupons.map(coupon => [
      coupon.number,
      coupon.dt_beg,
      coupon.pos.toString(),
      coupon.shift.toString(),
      coupon.opernum.toString(),
      coupon.summ_total.toString(),
      coupon.summ_used.toString(),
      coupon.rest.toString(),
      coupon.state,
      coupon.ageInDays.toString(),
      coupon.priority
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Создаем единственный экземпляр сервиса
export const couponsBusinessService = new CouponsBusinessService();

// Экспортируем класс для создания дополнительных экземпляров
export { CouponsBusinessService };