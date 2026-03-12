/**
 * Хук для загрузки и управления сменными отчетами
 */

import { useState, useEffect, useMemo } from 'react';
import { shiftReportsV2Service } from '@/services/shiftReportsV2Service';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import { getSystemId } from '@/config/stsConfig';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useSelection } from '@/contexts/SelectionContext';
import type { ShiftListItem, ShiftFilters } from '@/types/shift-reports-v2';

interface UseShiftReportsOptions {
  tradingPoint: any | null;
  networkId: string | null;
  network?: any | null; // Объект сети для получения external_id
  networkIds?: string[]; // Мультиселект сетей (UUID)
  networks?: any[]; // Объекты всех выбранных сетей
  isAllTradingPoints: boolean;
  filters: ShiftFilters;
}

export function useShiftReports({ tradingPoint, networkId, network, networkIds, networks, isAllTradingPoints, filters }: UseShiftReportsOptions) {
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useNewAuth();
  const { selectedTradingPoints } = useSelection();

  // Получаем system ID из external_id сети (null если сеть не выбрана)
  const systemId = getSystemId(network) ?? undefined;

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
      // Без system ID нельзя делать запросы к STS
      if (!systemId && !(networks && networks.length > 0)) {
        setShifts([]);
        return;
      }

      // Если выбраны "Все торговые точки" - загружаем для всех выбранных сетей
      const effectiveNetworkIds = networkIds?.length ? networkIds : (networkId ? [networkId] : []);
      if (isAllTradingPoints && effectiveNetworkIds.length > 0) {
        try {
          setLoading(true);
          setError(null);

          // Строим маппинг networkId → systemId для STS вызовов
          const networkSystemIds = new Map<string, number>();
          (networks || []).forEach(n => {
            const sId = getSystemId(n);
            if (sId) networkSystemIds.set(n.id, sId);
          });

          // Загружаем все торговые точки из всех выбранных сетей
          const { tradingPointsService } = await import('@/services/tradingPointsService');
          type TpWithSystem = any & { _systemId: number };
          const allPointsRaw = await Promise.all(
            effectiveNetworkIds.map(async (nId) => {
              const sysId = networkSystemIds.get(nId) || systemId;
              const pts = await tradingPointsService.getByNetworkId(nId).catch(() => []);
              return pts.map((p: any): TpWithSystem => ({ ...p, _systemId: sysId }));
            })
          );
          let tradingPoints: TpWithSystem[] = allPointsRaw.flat();

          // Фильтрация по мультиселекту
          if (selectedTradingPoints.length > 0) {
            tradingPoints = tradingPoints.filter(tp => selectedTradingPoints.includes(tp.id));
          }

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
              system: (tp as any)._systemId || systemId,
              station: stationNumber,
            };
            // Примечание: dt_beg/dt_end не передаем, т.к. API /v1/shifts их игнорирует
            // Фильтрация по датам выполняется на клиенте в filteredShifts

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

        // Формируем параметры запроса
        const requestParams: any = {
          system: systemId,
          station: stationNumber,
        };
        // Примечание: dt_beg/dt_end не передаем, т.к. API /v1/shifts их игнорирует
        // Фильтрация по датам выполняется на клиенте в filteredShifts

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
  }, [tradingPoint, networkId, networkIds, isAllTradingPoints, allowedStationNumbers, systemId, selectedTradingPoints]);
  // Примечание: filters.dateFrom/dateTo убраны из зависимостей, т.к. фильтрация по датам
  // выполняется на клиенте в filteredShifts, а не на сервере

  // Фильтрация и сортировка смен
  // ВАЖНО: API /v1/shifts игнорирует параметры dt_beg/dt_end, поэтому фильтруем на клиенте
  const filteredShifts = useMemo(() => {
    let filtered = shiftReportsV2Service.filterShifts(shifts, {
      status: filters.status !== 'all' ? filters.status : undefined,
      shiftNumber: filters.shiftNumber,
    });

    // Фильтрация по датам (клиентская, т.к. API не поддерживает)
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      dateFrom.setHours(0, 0, 0, 0);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt);
        return shiftDate >= dateFrom;
      });
    }
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt);
        return shiftDate <= dateTo;
      });
    }

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
  }, [shifts, filters.status, filters.shiftNumber, filters.dateFrom, filters.dateTo, allowedStationNumbers]);

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
