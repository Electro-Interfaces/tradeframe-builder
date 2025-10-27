/**
 * Хук для управления состоянием и загрузкой данных остатков топлива
 */

import { useState, useEffect } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { getInventoryFromShiftReports, aggregateByFuel, type TankInventory, type FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

export const useFuelInventory = (dateFrom: string, dateTo: string) => {
  const { selectedNetwork, selectedStation } = useSelection();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<TankInventory[]>([]);
  const [fuelSummaries, setFuelSummaries] = useState<FuelInventorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = async () => {
    if (!selectedNetwork) {
      setError('Не выбрана торговая сеть');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryFromShiftReports({
        system: parseInt(selectedNetwork.external_id),
        networkId: selectedNetwork.id,
        station: selectedStation ? parseInt(selectedStation.external_id) : undefined,
        dt_beg: formatDateForApi(dateFrom, false),
        dt_end: formatDateForApi(dateTo, true)
      });

      setInventory(data);
      const summaries = aggregateByFuel(data);
      setFuelSummaries(summaries);

      if (data.length === 0) {
        setError('Нет данных об остатках топлива');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки остатков';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedNetwork, selectedStation]);

  return {
    loading,
    inventory,
    fuelSummaries,
    error,
    loadInventory
  };
};
