/**
 * Хук для управления пороговыми значениями торговой точки
 * Централизованная логика загрузки и сохранения порогов
 */

import { useState, useEffect, useCallback } from 'react';
import { tradingPointsService } from '@/services/tradingPointsService';
import type { TradingPoint, BillAcceptorThresholds, FuelLevelThresholds } from '@/types/tradingpoint';

interface UseThresholdsOptions {
  tradingPointId?: string;
}

interface UseThresholdsReturn {
  billAcceptorThresholds?: BillAcceptorThresholds;
  fuelLevelThresholds?: FuelLevelThresholds;
  loading: boolean;
  error: Error | null;
  saveBillAcceptorThresholds: (thresholds: BillAcceptorThresholds) => Promise<void>;
  saveFuelLevelThresholds: (thresholds: FuelLevelThresholds) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Хук для работы с пороговыми значениями торговой точки
 */
export function useThresholds(options: UseThresholdsOptions = {}): UseThresholdsReturn {
  const { tradingPointId } = options;
  
  const [billAcceptorThresholds, setBillAcceptorThresholds] = useState<BillAcceptorThresholds | undefined>();
  const [fuelLevelThresholds, setFuelLevelThresholds] = useState<FuelLevelThresholds | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Загрузка данных торговой точки
   */
  const loadThresholds = useCallback(async () => {
    // Нет торговой точки или выбраны "Все торговые точки"
    if (!tradingPointId || tradingPointId === 'all') {
      setBillAcceptorThresholds(undefined);
      setFuelLevelThresholds(undefined);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tradingPoint = await tradingPointsService.getById(tradingPointId);
      setBillAcceptorThresholds(tradingPoint?.billAcceptorThresholds);
      setFuelLevelThresholds(tradingPoint?.fuelLevelThresholds);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка загрузки пороговых значений');
      setError(error);
      setBillAcceptorThresholds(undefined);
      setFuelLevelThresholds(undefined);
    } finally {
      setLoading(false);
    }
  }, [tradingPointId]);

  /**
   * Сохранение порогов купюроприемника
   */
  const saveBillAcceptorThresholds = useCallback(async (thresholds: BillAcceptorThresholds) => {
    if (!tradingPointId) {
      throw new Error('Не выбрана торговая точка');
    }

    try {
      await tradingPointsService.updateBillAcceptorThresholds(tradingPointId, thresholds);
      setBillAcceptorThresholds(thresholds);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка сохранения порогов купюроприемника');
      throw error;
    }
  }, [tradingPointId]);

  /**
   * Сохранение порогов топлива
   */
  const saveFuelLevelThresholds = useCallback(async (thresholds: FuelLevelThresholds) => {
    if (!tradingPointId) {
      throw new Error('Не выбрана торговая точка');
    }

    try {
      await tradingPointsService.updateFuelLevelThresholds(tradingPointId, thresholds);
      setFuelLevelThresholds(thresholds);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка сохранения порогов топлива');
      throw error;
    }
  }, [tradingPointId]);

  /**
   * Перезагрузка данных
   */
  const reload = useCallback(async () => {
    await loadThresholds();
  }, [loadThresholds]);

  // Автоматическая загрузка при изменении tradingPointId
  useEffect(() => {
    loadThresholds();
  }, [loadThresholds]);

  return {
    billAcceptorThresholds,
    fuelLevelThresholds,
    loading,
    error,
    saveBillAcceptorThresholds,
    saveFuelLevelThresholds,
    reload
  };
}
