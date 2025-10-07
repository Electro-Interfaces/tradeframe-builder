/**
 * Хук для работы с резервуарами
 * Инкапсулирует всю логику загрузки данных
 */

import { useState, useEffect } from 'react';
import { tanksService } from '@/services/tanksService';
import type { Tank } from '@/types/tanks';
import { toast } from '@/hooks/use-toast';

interface UseTanksOptions {
  networkId?: string;
  tradingPointId?: string;
  autoLoad?: boolean;
  showToasts?: boolean;
}

interface UseTanksReturn {
  tanks: Tank[];
  loading: boolean;
  error: Error | null;
  loadTanks: () => Promise<void>;
  refreshTanks: () => Promise<void>;
}

/**
 * Хук для загрузки и управления данными резервуаров
 */
export function useTanks(options: UseTanksOptions = {}): UseTanksReturn {
  const {
    networkId,
    tradingPointId,
    autoLoad = true,
    showToasts = true
  } = options;

  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Загрузить резервуары
   */
  const loadTanks = async () => {
    // Проверка обязательных параметров
    if (!networkId || !tradingPointId) {
      const err = new Error('Не указаны сеть или торговая точка');
      setError(err);
      setTanks([]);
      return;
    }

    if (tradingPointId === 'all') {
      const err = new Error('Выберите конкретную торговую точку');
      setError(err);
      setTanks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await tanksService.getTanks(networkId, tradingPointId);
      setTanks(data);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Неизвестная ошибка');
      setError(error);
      setTanks([]);

      if (showToasts) {
        toast({
          title: 'Ошибка загрузки резервуаров',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обновить данные резервуаров
   */
  const refreshTanks = async () => {
    await loadTanks();

    if (showToasts && !error) {
      toast({
        title: 'Данные обновлены',
        description: 'Информация о резервуарах успешно обновлена',
      });
    }
  };

  // Автоматическая загрузка при изменении параметров
  useEffect(() => {
    if (autoLoad && networkId && tradingPointId && tradingPointId !== 'all') {
      loadTanks();
    }
  }, [networkId, tradingPointId, autoLoad]);

  return {
    tanks,
    loading,
    error,
    loadTanks,
    refreshTanks
  };
}
