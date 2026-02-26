/**
 * Сервис для работы со сменными отчетами (версия 2)
 *
 * Использует STS API для получения данных о сменах
 * и преобразует их в UI-friendly формат
 */

import { shiftsService } from './shiftsService';
import { ShiftReportAdapter } from './adapters/shiftReportAdapter';
import { ShiftReportAdapterV2 } from './adapters/shiftReportAdapterV2';
import type {
  ShiftListItem,
  ShiftDetails,
  GetShiftsParams,
  GetShiftDetailsParams,
  ShiftKPIMetrics,
} from '@/types/shift-reports-v2';

/**
 * Сервис для работы со сменными отчетами V2
 */
class ShiftReportsV2Service {
  /**
   * Получить список смен
   *
   * @param params - Параметры запроса
   * @param stationName - Название торговой точки (опционально)
   * @returns Список смен в UI формате
   */
  async getShifts(
    params: GetShiftsParams,
    stationName?: string
  ): Promise<ShiftListItem[]> {

    try {
      // Получаем данные из API
      const response = await shiftsService.getShifts(params);


      // Если нет смен - возвращаем пустой массив
      if (!response || response.length === 0) {
        return [];
      }

      // Преобразуем смены в UI формат без запроса деталей
      // Детали будут загружаться по требованию при клике на смену
      // Фильтрация по датам происходит на уровне API запроса
      const shiftsListItems = response.map((shift) => {
        return this.createFallbackListItem(shift, params, stationName);
      });

      return shiftsListItems;
    } catch (error) {
      console.error('❌ ShiftReportsV2Service: Ошибка получения смен', error);
      throw error;
    }
  }

  /**
   * Создает элемент списка из данных /v1/shifts
   */
  private createFallbackListItem(
    shift: any,
    params: GetShiftsParams,
    stationName?: string
  ): ShiftListItem {
    // Определяем статус: если dt_close есть - закрыта, иначе - открыта
    const status = shift.dt_close ? 'closed' : 'open';

    return {
      id: `${params.system}-${params.station}-${shift.shift}`,
      shiftNumber: shift.shift,
      openedAt: shift.dt_open || new Date().toISOString(),
      closedAt: shift.dt_close || null,
      status,
      operator: 'Не загружено', // Данные доступны только в детальном отчете
      posNumber: 0,
      shift: shift.shift,

      // Финансовые данные недоступны в списке смен
      // Будут загружены при открытии детальной информации
      totalRevenue: 0,
      totalVolume: 0,
      transactionCount: 0,

      cashRevenue: 0,
      cardRevenue: 0,
      sbpRevenue: 0,
      fuelCardRevenue: 0,
      corporateCardRevenue: 0,
      otherRevenue: 0,

      hasDiscrepancies: false,
      averageCheck: 0,

      stationCode: params.station || params.system,
      stationName,
      station: params.station, // Добавляем station для корректной работы модального окна
    };
  }

  /**
   * Получить детальную информацию о смене
   *
   * @param params - Параметры запроса
   * @param stationName - Название торговой точки (опционально)
   * @returns Детальная информация о смене
   */
  async getShiftDetails(
    params: GetShiftDetailsParams,
    stationName?: string,
    preloadedShiftInfo?: any
  ): Promise<ShiftDetails> {

    try {
      // Используем переданную информацию о смене или загружаем из API
      let shiftInfo = preloadedShiftInfo;
      if (!shiftInfo) {
        const shifts = await shiftsService.getShifts({
          system: params.system,
          station: params.station
        });
        shiftInfo = shifts.find(s => s.shift === params.shift);
      }

      // Получаем СЫРЫЕ детальные данные из API (используем getShiftReportRaw)
      const response = await shiftsService.getShiftReportRaw(params);

      // Преобразуем в UI формат используя новый адаптер (V2)
      return ShiftReportAdapterV2.toDetails(response, params.shift, params.system, params.station, stationName, shiftInfo);
    } catch (error) {
      console.error('❌ ShiftReportsV2Service: Ошибка получения деталей смены', error);
      throw error;
    }
  }

  /**
   * Вычислить KPI метрики по списку смен
   *
   * @param shifts - Список смен
   * @returns KPI метрики
   */
  calculateKPIMetrics(shifts: ShiftListItem[]): ShiftKPIMetrics {
    if (!shifts || shifts.length === 0) {
      return {
        totalRevenue: 0,
        totalVolume: 0,
        shiftsCount: 0,
        averageCheck: 0,
        totalTransactions: 0,
        averageRevenuePerShift: 0,
      };
    }

    const totalRevenue = shifts.reduce((sum, shift) => sum + shift.totalRevenue, 0);
    const totalVolume = shifts.reduce((sum, shift) => sum + shift.totalVolume, 0);
    const totalTransactions = shifts.reduce((sum, shift) => sum + shift.transactionCount, 0);
    const shiftsCount = shifts.length;

    return {
      totalRevenue,
      totalVolume,
      shiftsCount,
      averageCheck: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      totalTransactions,
      averageRevenuePerShift: shiftsCount > 0 ? totalRevenue / shiftsCount : 0,
    };
  }

  /**
   * Фильтровать смены по критериям
   *
   * @param shifts - Список смен
   * @param filters - Критерии фильтрации
   * @returns Отфильтрованный список
   */
  filterShifts(shifts: ShiftListItem[], filters: {
    status?: string;
    operator?: string;
    shiftNumber?: number;
    posNumber?: number;
  }): ShiftListItem[] {
    let filtered = [...shifts];

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(shift => shift.status === filters.status);
    }

    if (filters.operator) {
      const searchTerm = filters.operator.toLowerCase();
      filtered = filtered.filter(shift =>
        shift.operator.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.shiftNumber) {
      filtered = filtered.filter(shift => shift.shiftNumber === filters.shiftNumber);
    }

    if (filters.posNumber) {
      filtered = filtered.filter(shift => shift.posNumber === filters.posNumber);
    }

    return filtered;
  }

  /**
   * Сортировать смены
   *
   * @param shifts - Список смен
   * @param sortBy - Поле для сортировки
   * @param direction - Направление сортировки
   * @returns Отсортированный список
   */
  sortShifts(
    shifts: ShiftListItem[],
    sortBy: keyof ShiftListItem,
    direction: 'asc' | 'desc' = 'desc'
  ): ShiftListItem[] {
    const sorted = [...shifts].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return sorted;
  }

}

// Экспортируем singleton instance
export const shiftReportsV2Service = new ShiftReportsV2Service();
export default shiftReportsV2Service;
