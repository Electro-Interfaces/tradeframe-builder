/**
 * Хук для загрузки данных обзора сети
 */

import { useState, useEffect } from 'react';
import { stsApiService, Transaction } from '@/services/stsApi';
import { tradingPointsService } from '@/services/tradingPointsService';
import { useToast } from '@/hooks/use-toast';

interface UseNetworkDataOptions {
  selectedNetwork: any;
  selectedTradingPoint: string | null;
  dateFrom: string;
  dateTo: string;
}

export function useNetworkData({
  selectedNetwork,
  selectedTradingPoint,
  dateFrom,
  dateTo
}: UseNetworkDataOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [terminalInfo, setTerminalInfo] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();

  const loadTransactions = async () => {
    if (!selectedNetwork?.external_id) {
      toast({
        title: "Ошибка",
        description: "Выберите сеть с настроенным external_id",
        variant: "destructive",
      });
      return;
    }

    if (!stsApiService.isConfigured()) {
      toast({
        title: "Ошибка",
        description: "STS API не настроен. Перейдите в Настройки → API СТС",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Очищаем предыдущие данные
      setTransactions([]);
      setTanks([]);
      setTerminalInfo(null);
      setPrices([]);

      // Обновление токена перед запросом
      try {
        const tokenRefreshed = await stsApiService.forceRefreshToken();

        if (!tokenRefreshed) {
          throw new Error('Ошибка авторизации в STS API. Проверьте настройки логина/пароля.');
        }
      } catch (authError) {
        toast({
          title: "Ошибка авторизации",
          description: "Не удалось авторизоваться в STS API. Проверьте логин/пароль в настройках.",
          variant: "destructive",
        });
        throw authError;
      }

      // Формируем параметры контекста
      let contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: undefined as string | undefined
      };

      // Если выбрана конкретная торговая точка
      if (selectedTradingPoint && selectedTradingPoint !== 'all') {
        try {
          const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
          if (tradingPointObject) {
            contextParams.tradingPointId = tradingPointObject.external_id || '1';
          }
        } catch (error) {
          // Игнорируем ошибки загрузки торговой точки
        }
      }

      // Загружаем транзакции
      const stsTransactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        200,
        contextParams
      );

      setTransactions(stsTransactions);

      // Загружаем дополнительные данные
      const additionalDataLoaded: string[] = [];
      try {
        // Резервуары
        const tanksData = await stsApiService.getTanks(contextParams);
        setTanks(tanksData);
        if (tanksData.length > 0) additionalDataLoaded.push(`${tanksData.length} резервуаров`);

        // Информация о терминале (только для конкретной точки)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== '1') {
          try {
            const terminalData = await stsApiService.getTerminalInfo(contextParams);
            setTerminalInfo(terminalData);
            if (terminalData) additionalDataLoaded.push('данные терминала');
          } catch (terminalError) {
            // Игнорируем ошибку
          }
        }

        // Цены (только для конкретной точки)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== '1') {
          try {
            const pricesData = await stsApiService.getPrices(contextParams);
            setPrices(pricesData);
            if (pricesData.length > 0) additionalDataLoaded.push(`${pricesData.length} цен`);
          } catch (pricesError) {
            // Игнорируем ошибку
          }
        }
      } catch (additionalDataError) {
        // Не прерываем выполнение, основные данные уже загружены
      }
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Инициализация
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const isConfigured = stsApiService.isConfigured();
        setStsApiConfigured(isConfigured);

        setInitializing(false);

        // Загружаем данные если выбрана сеть И настроен STS API
        if (selectedNetwork && isConfigured) {
          loadTransactions();
        }
      } catch (error) {
        setInitializing(false);
      }
    };

    const initTimer = setTimeout(checkConfig, 1500);

    return () => clearTimeout(initTimer);
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo]);

  return {
    transactions,
    tanks,
    terminalInfo,
    prices,
    loading,
    stsApiConfigured,
    initializing,
    refresh: loadTransactions
  };
}
