/**
 * Хук для управления состоянием и загрузкой данных остатков топлива
 * Использует React Query для кэширования
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelection } from '@/contexts/SelectionContext';
import { getInventoryFromShiftReports, aggregateByFuel, type TankInventory, type FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

export const useFuelInventory = (dateFrom: string, dateTo: string) => {
  const { selectedNetwork, selectedStation } = useSelection();

  // Создаем ключ запроса на основе всех параметров
  const queryKey = useMemo(() => [
    'fuelInventory',
    selectedNetwork?.id,
    selectedStation?.id,
    dateFrom,
    dateTo
  ], [selectedNetwork?.id, selectedStation?.id, dateFrom, dateTo]);

  // React Query для загрузки данных с кэшированием
  const {
    data: inventory = [],
    isLoading: loading,
    error: queryError,
    refetch: loadInventory
  } = useQuery<TankInventory[], Error>({
    queryKey,
    queryFn: async () => {
      if (!selectedNetwork) {
        throw new Error('Не выбрана торговая сеть');
      }

      const data = await getInventoryFromShiftReports({
        system: parseInt(selectedNetwork.external_id),
        networkId: selectedNetwork.id,
        station: selectedStation ? parseInt(selectedStation.external_id) : undefined,
        dt_beg: formatDateForApi(dateFrom, false),
        dt_end: formatDateForApi(dateTo, true)
      });

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
    loadInventory
  };
};
