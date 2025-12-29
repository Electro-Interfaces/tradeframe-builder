/**
 * Хук для загрузки и управления сменными отчетами
 */

import { useState, useEffect, useMemo } from 'react';
import { shiftReportsV2Service } from '@/services/shiftReportsV2Service';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import { getSystemId } from '@/config/stsConfig';
import { useNewAuth } from '@/contexts/NewAuthContext';
import type { ShiftListItem, ShiftFilters } from '@/types/shift-reports-v2';

interface UseShiftReportsOptions {
  tradingPoint: any | null;
  networkId: string | null;
  network?: any | null; // Объект сети для получения external_id
  isAllTradingPoints: boolean;
  filters: ShiftFilters;
}

export function useShiftReports({ tradingPoint, networkId, network, isAllTradingPoints, filters }: UseShiftReportsOptions) {
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useNewAuth();

  // Получаем system ID из external_id сети
  const systemId = getSystemId(network);

  // Вычисляем разрешенные номера станций из scopeValues ролей пользователя
  const allowedStationNumbers = useMemo(() => {
    if (!user?.roles) return null;

    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если scopeValues пустой - полный доступ
    if (userScopeValues.length === 0) return null;

    // Извлекаем номера станций из scopeValues формата "{networkCode}-azs-{stationNumber}"
    const stationNumbers = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        stationNumbers.add(parts[1]);
      }
    });

    return stationNumbers.size > 0 ? stationNumbers : null;
  }, [user?.roles]);

  // Загрузка смен
  useEffect(() => {
    const loadShifts = async () => {
      // Если выбраны "Все торговые точки" - загружаем для всей сети
      if (isAllTradingPoints && networkId) {
        try {
          setLoading(true);
          setError(null);

          // Загружаем все торговые точки сети
          const tradingPointsService = (await import('@/services/tradingPointsService')).default;
          let tradingPoints = await tradingPointsService.getByNetworkId(networkId);

          // Фильтрация по разрешенным станциям (RBAC)
          if (allowedStationNumbers) {
            tradingPoints = tradingPoints.filter(tp => {
              const stationNum = extractStationNumber(tp);
              return stationNum && allowedStationNumbers.has(String(stationNum));
            });
          }

          // Загружаем смены для всех станций параллельно
          const allShiftsPromises = tradingPoints.map(async (tp) => {
            const stationNumber = extractStationNumber(tp);
            if (!stationNumber) return [];

            const requestParams: any = {
              system: systemId,
              station: stationNumber,
            };

            if (filters.dateFrom) {
              requestParams.dt_beg = new Date(filters.dateFrom).toISOString();
            }
            if (filters.dateTo) {
              requestParams.dt_end = new Date(filters.dateTo).toISOString();
            }

            try {
              return await shiftReportsV2Service.getShifts(requestParams, tp.name);
            } catch (err) {
              console.error(`Ошибка загрузки смен для ${tp.name}:`, err);
              return [];
            }
          });

          const allShiftsArrays = await Promise.all(allShiftsPromises);
          const allShifts = allShiftsArrays.flat();

          setShifts(allShifts);
        } catch (err: any) {
          const errorMessage = err.message || 'Ошибка загрузки смен';
          setError(errorMessage);
          setShifts([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Если выбрана конкретная торговая точка
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

        // Формируем параметры с датами из фильтров
        const requestParams: any = {
          system: systemId,
          station: stationNumber,
        };

        // Добавляем даты в запрос, если они заданы в фильтрах
        if (filters.dateFrom) {
          requestParams.dt_beg = new Date(filters.dateFrom).toISOString();
        }
        if (filters.dateTo) {
          requestParams.dt_end = new Date(filters.dateTo).toISOString();
        }

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
  }, [tradingPoint, networkId, isAllTradingPoints, filters.dateFrom, filters.dateTo, allowedStationNumbers, systemId]);

  // Фильтрация и сортировка смен (даты уже отфильтрованы на сервере)
  const filteredShifts = useMemo(() => {
    let filtered = shiftReportsV2Service.filterShifts(shifts, {
      status: filters.status !== 'all' ? filters.status : undefined,
      shiftNumber: filters.shiftNumber,
    });

    // Фильтрация по разрешенным станциям (RBAC) - дополнительная защита
    if (allowedStationNumbers) {
      filtered = filtered.filter(shift => {
        const stationNum = String(shift.station || '');
        return allowedStationNumbers.has(stationNum);
      });
    }

    // Сортировка: самые свежие наверху (по дате открытия, DESC)
    filtered.sort((a, b) => {
      const dateA = new Date(a.openedAt).getTime();
      const dateB = new Date(b.openedAt).getTime();
      return dateB - dateA; // DESC - новые сверху
    });

    return filtered;
  }, [shifts, filters.status, filters.shiftNumber, allowedStationNumbers]);

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
