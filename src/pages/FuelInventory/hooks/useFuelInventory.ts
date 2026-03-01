/**
 * Хук для управления состоянием и загрузкой данных остатков топлива
 * Использует React Query для кэширования
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelection } from '@/contexts/SelectionContext';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { getInventoryFromServer, getInventoryFromShiftReports, aggregateByFuel, type TankInventory, type FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

export const useFuelInventory = (dateFrom: string, dateTo: string) => {
  const { selectedNetwork, selectedStation } = useSelection();
  const { user } = useNewAuth();

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

  // Состояние прогресса загрузки смен
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

  // Создаем ключ запроса на основе всех параметров
  const queryKey = useMemo(() => {
    // Преобразуем Set в массив для стабильного ключа кэша
    const allowedStationsArray = allowedStationNumbers ? Array.from(allowedStationNumbers).sort() : null;
    return [
      'fuelInventory',
      selectedNetwork?.id,
      selectedStation?.id,
      dateFrom,
      dateTo,
      allowedStationsArray
    ];
  }, [selectedNetwork?.id, selectedStation?.id, dateFrom, dateTo, allowedStationNumbers]);

  // React Query для загрузки данных с кэшированием
  const {
    data: inventory = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch: loadInventory
  } = useQuery<TankInventory[], Error>({
    queryKey,
    queryFn: async () => {
      if (!selectedNetwork) {
        throw new Error('Не выбрана торговая сеть');
      }

      const params = {
        system: parseInt(selectedNetwork.external_id),
        networkId: selectedNetwork.id,
        station: selectedStation ? parseInt(selectedStation.external_id) : undefined,
        dt_beg: formatDateForApi(dateFrom, false),
        dt_end: formatDateForApi(dateTo, true),
        allowedStations: allowedStationNumbers,
      };

      let data: TankInventory[];

      try {
        // Серверная агрегация — один POST вместо ~200+ round-trips
        data = await getInventoryFromServer(params);
      } catch (serverErr) {
        // Fallback на клиентскую агрегацию
        // Server aggregation failed, falling back to client-side
        setLoadingProgress({ loaded: 0, total: 0 });

        try {
          data = await getInventoryFromShiftReports({
            ...params,
            onProgress: (loaded, total) => {
              setLoadingProgress({ loaded, total });
            }
          });
          setLoadingProgress({ loaded: 0, total: 0 });
        } catch (clientErr) {
          setLoadingProgress({ loaded: 0, total: 0 });
          throw clientErr;
        }
      }

      if (data.length === 0) {
        throw new Error('Нет данных об остатках топлива');
      }

      return data;
    },
    enabled: !!selectedNetwork,
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут - хранение в кэше
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Используем isFetching для отображения индикатора (работает и для refetch)
  const loading = isLoading || isFetching;

  // Агрегируем данные по видам топлива (мемоизируем для производительности)
  const fuelSummaries: FuelInventorySummary[] = useMemo(() => {
    return aggregateByFuel(inventory);
  }, [inventory]);

  const error = queryError?.message || null;

  return {
    loading,
    inventory,
    fuelSummaries,
    error,
    loadInventory,
    loadingProgress
  };
};
