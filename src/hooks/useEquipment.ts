/**
 * Хук для работы с терминальным оборудованием
 * Управляет загрузкой данных и состоянием оборудования
 */

import { useState, useEffect, useCallback } from 'react';
import { equipmentService } from '@/services/equipmentService';
import { useToast } from '@/hooks/use-toast';
import type { TerminalInfo, TerminalEquipmentItem } from '@/types/equipment';
import type { Tank } from '@/types/tanks';
import { stsApiService } from '@/services/stsApi';
import { tradingPointsService } from '@/services/tradingPointsService';

interface UseEquipmentOptions {
  networkId?: string;
  tradingPointId?: string;
  autoLoad?: boolean;
  showToasts?: boolean;
}

interface UseEquipmentReturn {
  terminalInfo: TerminalInfo | null;
  equipment: TerminalEquipmentItem[];
  tanks: Tank[];
  loading: boolean;
  error: Error | null;
  loadEquipment: () => Promise<void>;
  refreshEquipment: () => Promise<void>;
  restartTerminal: () => Promise<boolean>;
  restartingTerminal: boolean;
}

/**
 * Хук для загрузки и управления терминальным оборудованием
 */
export function useEquipment(options: UseEquipmentOptions = {}): UseEquipmentReturn {
  const { networkId, tradingPointId, autoLoad = true, showToasts = true } = options;
  const { toast } = useToast();

  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(null);
  const [equipment, setEquipment] = useState<TerminalEquipmentItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [restartingTerminal, setRestartingTerminal] = useState(false);

  /**
   * Загрузка данных оборудования
   */
  const loadEquipment = useCallback(async () => {
    if (!networkId || !tradingPointId || tradingPointId === 'all') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Получаем торговую точку для external_id
      const tradingPoint = await tradingPointsService.getById(tradingPointId);
      if (!tradingPoint?.external_id) {
        // Тихо игнорируем - не критично
        setTerminalInfo(null);
        setEquipment([]);
        setTanks([]);
        setLoading(false);
        return;
      }

      const contextParams = {
        networkId: networkId,
        tradingPointId: tradingPoint.external_id
      };

      // Загружаем данные по отдельности, чтобы ошибка в одном не ломала другой
      let terminalInfoData: TerminalInfo | null = null;
      let tanksData: Tank[] = [];

      // Пытаемся загрузить информацию о терминале
      try {
        terminalInfoData = await stsApiService.getTerminalInfo(contextParams);
        setTerminalInfo(terminalInfoData);

        // Преобразуем данные терминала в формат для отображения
        const equipmentItems = equipmentService.mapTerminalInfoToEquipment(terminalInfoData);
        setEquipment(equipmentItems);
      } catch (terminalError) {
        console.warn('Не удалось загрузить информацию о терминале:', terminalError);
        setTerminalInfo(null);
        setEquipment([]);
      }

      // Пытаемся загрузить резервуары
      try {
        tanksData = await stsApiService.getTanks(contextParams);
        setTanks(tanksData);
      } catch (tanksError) {
        console.warn('Не удалось загрузить резервуары:', tanksError);
        setTanks([]);
      }

      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Неизвестная ошибка при загрузке оборудования');

      // Если API не настроен - тихо игнорируем
      if (error.message.includes('API СТС не настроен')) {
        setTerminalInfo(null);
        setEquipment([]);
        setTanks([]);
        setError(null);
        setLoading(false);
        return;
      }

      setError(error);

      if (showToasts) {
        toast({
          title: 'Ошибка загрузки',
          description: error.message,
          variant: 'destructive'
        });
      }

      // При ошибке очищаем данные
      setTerminalInfo(null);
      setEquipment([]);
      setTanks([]);
    } finally {
      setLoading(false);
    }
  }, [networkId, tradingPointId, showToasts, toast]);

  /**
   * Обновление данных (алиас для loadEquipment)
   */
  const refreshEquipment = useCallback(async () => {
    await loadEquipment();
  }, [loadEquipment]);

  /**
   * Перезагрузка терминала
   */
  const restartTerminal = useCallback(async (): Promise<boolean> => {
    if (!networkId || !tradingPointId) {
      if (showToasts) {
        toast({
          title: 'Ошибка',
          description: 'Для перезагрузки терминала выберите сеть и торговую точку',
          variant: 'destructive'
        });
      }
      return false;
    }

    setRestartingTerminal(true);

    try {
      const result = await equipmentService.restartTerminal(networkId, tradingPointId);

      if (result.success) {
        if (showToasts) {
          toast({
            title: 'Команда отправлена',
            description: result.message,
            variant: 'default'
          });
        }

        // Обновляем данные через 3 секунды
        setTimeout(() => {
          loadEquipment();
        }, 3000);

        return true;
      } else {
        if (showToasts) {
          toast({
            title: 'Ошибка',
            description: result.message || 'Не удалось перезагрузить терминал',
            variant: 'destructive'
          });
        }
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Неизвестная ошибка');

      if (showToasts) {
        toast({
          title: 'Ошибка перезагрузки',
          description: error.message,
          variant: 'destructive'
        });
      }
      return false;
    } finally {
      setRestartingTerminal(false);
    }
  }, [networkId, tradingPointId, showToasts, toast, loadEquipment]);

  // Автоматическая загрузка при изменении параметров
  useEffect(() => {
    if (autoLoad && networkId && tradingPointId && tradingPointId !== 'all') {
      loadEquipment();
    }
  }, [autoLoad, networkId, tradingPointId, loadEquipment]);

  return {
    terminalInfo,
    equipment,
    tanks,
    loading,
    error,
    loadEquipment,
    refreshEquipment,
    restartTerminal,
    restartingTerminal
  };
}
