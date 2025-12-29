/**
 * Хук для загрузки и управления данными дашборда
 *
 * Использует React Query для кэширования и автоматического обновления
 */

import { useQuery } from '@tanstack/react-query';
import { shiftDashboardService } from '@/services/shiftDashboardService';
import type { DashboardParams, DashboardData, PeriodSelection } from '@/types/shift-dashboard';
import type { ShiftDetails } from '@/types/shift-reports-v2';

interface UseShiftDashboardOptions {
  /** Код системы */
  system: number;

  /** Код торговой точки (опционально) */
  station?: number;

  /** Массив кодов торговых точек */
  stations?: number[];

  /** Маппинг кодов станций на их названия */
  stationNames?: Record<number, string>;

  /** Выбор периода */
  period: PeriodSelection;

  /** Фильтр по номерам смен (пустой = все смены) */
  selectedShifts?: number[];

  /** Включить запрос */
  enabled?: boolean;
}

interface UseShiftDashboardReturn {
  /** Данные дашборда */
  data: DashboardData | undefined;

  /** Флаг загрузки */
  isLoading: boolean;

  /** Флаг начальной загрузки */
  isFetching: boolean;

  /** Ошибка загрузки */
  error: Error | null;

  /** Повторить запрос */
  refetch: () => void;

  /** Время последнего обновления */
  lastUpdated: Date | null;
}

/**
 * Хук для загрузки данных дашборда
 */
export function useShiftDashboard(options: UseShiftDashboardOptions): UseShiftDashboardReturn {
  const { system, station, stations, stationNames, period, selectedShifts, enabled = true } = options;

  // Формируем ключ запроса (v5 - добавлен фильтр смен)
  const queryKey = [
    'shift-dashboard-v5',
    system,
    station,
    stations?.join(','),
    period.dateFrom,
    period.dateTo,
    period.compareEnabled,
    period.compareDateFrom,
    period.compareDateTo,
    selectedShifts?.join(',') || 'all',
  ];

  // Выполняем запрос
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery<DashboardData, Error>({
    queryKey,
    queryFn: async () => {
      const params: DashboardParams = {
        system,
        station,
        stations,
        stationNames,
        period,
      };

      const result = await shiftDashboardService.getDashboardData(params);

      // Если указан фильтр смен - фильтруем и пересчитываем KPI
      if (selectedShifts && selectedShifts.length > 0 && result.shifts) {
        const filteredShifts = result.shifts.filter(s => selectedShifts.includes(s.shiftNumber));

        // Пересчитываем KPI на основе отфильтрованных смен
        const filteredKpis = shiftDashboardService.calculateKPIs(
          filteredShifts,
          result.kpis.cashout,
          result.kpis.cashFlow
        );

        // Пересчитываем графики
        const filteredCharts = shiftDashboardService.prepareChartData(filteredShifts, period);

        // Пересчитываем детализацию
        const filteredDetails = shiftDashboardService.prepareDetailsData(filteredShifts);

        return {
          ...result,
          shifts: filteredShifts,
          kpis: filteredKpis,
          charts: filteredCharts,
          details: filteredDetails,
          meta: {
            ...result.meta,
            shiftsLoaded: filteredShifts.length,
            shiftsFiltered: true,
            totalShifts: result.shifts.length,
            allShifts: result.shifts, // Все смены для списка фильтра
          },
        };
      }

      // Добавляем allShifts для списка фильтра
      return {
        ...result,
        meta: {
          ...result.meta,
          allShifts: result.shifts,
        },
      };
    },
    enabled: enabled && system > 0 && (!!station || (stations && stations.length > 0)),
    staleTime: 0, // Данные всегда считаются устаревшими - обновляем при каждом изменении периода
    gcTime: 30 * 60 * 1000, // 30 минут - время хранения в кэше
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isFetching,
    error: error || null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}

/**
 * Хук для получения данных конкретной смены для drill-down
 */
export function useShiftDetail(
  shifts: ShiftDetails[] | undefined,
  shiftId: string | null
): ShiftDetails | null {
  if (!shifts || !shiftId) return null;
  return shifts.find(s => s.id === shiftId) || null;
}

/**
 * Хук для сортировки и фильтрации данных детализации
 */
interface UseDashboardDetailsOptions<T> {
  /** Исходные данные */
  data: T[];

  /** Поле для сортировки */
  sortBy: keyof T;

  /** Направление сортировки */
  sortDirection: 'asc' | 'desc';

  /** Функция фильтрации */
  filterFn?: (item: T) => boolean;
}

export function useDashboardDetails<T>(options: UseDashboardDetailsOptions<T>): T[] {
  const { data, sortBy, sortDirection, filterFn } = options;

  let result = [...data];

  // Применяем фильтр
  if (filterFn) {
    result = result.filter(filterFn);
  }

  // Применяем сортировку
  result.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  return result;
}

export default useShiftDashboard;
