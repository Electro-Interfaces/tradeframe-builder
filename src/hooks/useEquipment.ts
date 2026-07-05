/**
 * Хук для работы с терминальным оборудованием
 * Управляет загрузкой данных и состоянием оборудования
 */

import { useState, useEffect, useCallback } from 'react';
import { equipmentService } from '@/services/equipmentService';
import { useToast } from '@/hooks/use-toast';
import type { TerminalInfo, TerminalEquipmentItem } from '@/types/equipment';
import type { Tank } from '@/types/tanks';
import { stsApiService } from '@/services/sts';

interface UseEquipmentOptions {
  networkId?: string;
  tradingPointId?: string;
  /** Объект станции из SelectionContext — если передан, пропускаем дублирующий запрос к БД */
  station?: { external_id?: string; name?: string } | null;
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
  const { networkId, tradingPointId, station, autoLoad = true, showToasts = true } = options;
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
    // Очищаем данные предыдущей станции сразу — не показываем устаревшие данные
    setTerminalInfo(null);
    setEquipment([]);
    setTanks([]);

    try {
      // Получаем external_id станции: из переданного объекта или парсим из tradingPointId
      // Формат tradingPointId: "networkCode-azs-stationCode"
      let stationExternalId: string | undefined;
      let stationName: string | undefined;

      if (station?.external_id) {
        // Быстрый путь: данные уже есть из SelectionContext
        stationExternalId = station.external_id;
        stationName = station.name;
      } else {
        // Fallback: парсим из строки tradingPointId
        const parts = tradingPointId.split('-azs-');
        if (parts.length === 2 && parts[1]) {
          stationExternalId = parts[1];
          stationName = `АЗС №${parts[1]}`;
        }
      }

      if (!stationExternalId) {
        // Тихо игнорируем - не критично
        setTerminalInfo(null);
        setEquipment([]);
        setTanks([]);
        setLoading(false);
        return;
      }

      const contextParams = {
        networkId: networkId,
        tradingPointId: stationExternalId
      };

      // ✅ ОПТИМИЗАЦИЯ: Параллельная загрузка данных вместо последовательной
      // Загружаем данные параллельно, чтобы ошибка в одном не ломала другой
      const [terminalInfoResult, tanksResult] = await Promise.allSettled([
        stsApiService.getTerminalInfo(contextParams),
        stsApiService.getTanks(contextParams)
      ]);

      // Обрабатываем результат загрузки терминала
      if (terminalInfoResult.status === 'fulfilled') {
        const terminalInfoData = terminalInfoResult.value;
        setTerminalInfo(terminalInfoData);
        // Передаем название станции из селектора для отображения в карточке
        const equipmentItems = equipmentService.mapTerminalInfoToEquipment(terminalInfoData, stationName);
        setEquipment(equipmentItems);
      } else {
        // Failed to load terminal info
        setTerminalInfo(null);
        setEquipment([]);
      }

      // Обрабатываем результат загрузки резервуаров
      if (tanksResult.status === 'fulfilled') {
        setTanks(tanksResult.value);
      } else {
        // Failed to load tanks
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
  }, [networkId, tradingPointId, station, showToasts, toast]);

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
