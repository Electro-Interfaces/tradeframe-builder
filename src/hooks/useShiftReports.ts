/**
 * Хук для загрузки и управления сменными отчетами
 */

import { useState, useEffect, useMemo } from 'react';
import { shiftReportsV2Service } from '@/services/shiftReportsV2Service';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import { STS_SYSTEM_ID } from '@/config/stsConfig';
import type { ShiftListItem, ShiftFilters } from '@/types/shift-reports-v2';

interface UseShiftReportsOptions {
  tradingPoint: any | null;
  filters: ShiftFilters;
}

export function useShiftReports({ tradingPoint, filters }: UseShiftReportsOptions) {
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка смен
  useEffect(() => {
    const loadShifts = async () => {
      if (!tradingPoint) {
        setShifts([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Извлекаем номер станции из торговой точки
        const stationNumber = extractStationNumber(tradingPoint);

        // Если номер станции не найден - показываем ошибку
        if (!stationNumber) {
          const errorMsg = `Для торговой точки "${tradingPoint.name}" не настроен номер станции в STS API.\n\nНеобходимо добавить:\n- external_id с номером станции\n- или код в externalCodes с system='sts'`;
          setError(errorMsg);
          alert(`Ошибка: ${errorMsg}`);
          setShifts([]);
          setLoading(false);
          return;
        }

        const requestParams = {
          system: STS_SYSTEM_ID,
          station: stationNumber,
        };

        const data = await shiftReportsV2Service.getShifts(
          requestParams,
          tradingPoint.name
        );

        setShifts(data);
      } catch (err: any) {
        const errorMessage = err.message || 'Ошибка загрузки смен';
        setError(errorMessage);
        setShifts([]);
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [tradingPoint]);

  // Фильтрация и сортировка смен
  const filteredShifts = useMemo(() => {
    let filtered = shiftReportsV2Service.filterShifts(shifts, {
      status: filters.status !== 'all' ? filters.status : undefined,
      shiftNumber: filters.shiftNumber,
    });

    // Фильтрация по датам на клиенте
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt).setHours(0, 0, 0, 0);
        return shiftDate >= dateFrom;
      });
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt).getTime();
        return shiftDate <= dateTo;
      });
    }

    // Сортировка: самые свежие наверху (по дате открытия, DESC)
    filtered.sort((a, b) => {
      const dateA = new Date(a.openedAt).getTime();
      const dateB = new Date(b.openedAt).getTime();
      return dateB - dateA; // DESC - новые сверху
    });

    return filtered;
  }, [shifts, filters]);

  // Функция обновления данных
  const refresh = () => {
    // Принудительная перезагрузка через изменение состояния
    setShifts([]);
  };

  return {
    shifts,
    filteredShifts,
    loading,
    error,
    refresh
  };
}
