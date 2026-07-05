/**
 * Хук для загрузки журнала инкассации
 */

import { useState, useEffect, useCallback } from 'react';
import { stsApiService } from '@/services/sts';
import { tradingPointsService } from '@/services/tradingPointsService';
import type { CashoutRecord, StationCashout } from '@/types/equipment';

interface UseCashoutHistoryOptions {
  networkId?: string;
  tradingPointId?: string;
  autoLoad?: boolean;
}

interface UseCashoutHistoryReturn {
  cashoutRecords: CashoutRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Хук для загрузки журнала инкассации купюроприемника
 */
export function useCashoutHistory(options: UseCashoutHistoryOptions = {}): UseCashoutHistoryReturn {
  const { networkId, tradingPointId, autoLoad = true } = options;

  const [cashoutRecords, setCashoutRecords] = useState<CashoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Загрузка данных об инкассации
   */
  const loadCashoutHistory = useCallback(async () => {
    if (!networkId || !tradingPointId || tradingPointId === 'all') {
      setCashoutRecords([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Получаем торговую точку для external_id
      const tradingPoint = await tradingPointsService.getById(tradingPointId);
      if (!tradingPoint?.external_id) {
        setCashoutRecords([]);
        setLoading(false);
        return;
      }

      const contextParams = {
        networkId: networkId,
        tradingPointId: tradingPoint.external_id
      };

      // Загружаем данные об инкассации
      const data: StationCashout[] = await stsApiService.getCashoutHistory(contextParams);

      // Находим данные для текущей станции
      const stationData = data.find(
        (station) => station.number.toString() === tradingPoint.external_id
      );

      if (stationData && stationData.cashout) {
        setCashoutRecords(stationData.cashout);
      } else {
        setCashoutRecords([]);
      }

      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка загрузки журнала инкассации');

      // Игнорируем ошибки тихо (не критично для работы страницы)
      setCashoutRecords([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [networkId, tradingPointId]);

  /**
   * Обновление данных
   */
  const refresh = useCallback(async () => {
    await loadCashoutHistory();
  }, [loadCashoutHistory]);

  // Автоматическая загрузка при монтировании и изменении параметров
  useEffect(() => {
    if (autoLoad) {
      loadCashoutHistory();
    }
  }, [autoLoad, loadCashoutHistory]);

  return {
    cashoutRecords,
    loading,
    error,
    refresh
  };
}
