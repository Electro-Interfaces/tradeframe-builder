import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelection } from "@/contexts/SelectionContext";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { stsApiService } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
import { useToast } from "@/hooks/use-toast";
import { todayString, monthsAgoString } from "@/utils/dateUtils";

export function useNetworkOverviewData() {
  const { selectedNetwork, selectedTradingPoint, selectedStation, isAllTradingPoints, isInitialized, selectedTradingPoints } = useSelection();
  const { user } = useNewAuth();
  const { toast } = useToast();

  // Состояния фильтров (локальный часовой пояс)
  const [dateFrom, setDateFrom] = useState(() => monthsAgoString(1));
  const [dateTo, setDateTo] = useState(() => todayString());
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Состояния данных
  const [transactions, setTransactions] = useState<any[]>([]);
  const [prevPeriodTransactions, setPrevPeriodTransactions] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [terminalInfo, setTerminalInfo] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Состояния для pull-to-refresh
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'canRefresh' | 'refreshing'>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTouchRef = useRef<{ y: number; time: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const dailySalesCardRef = useRef<HTMLDivElement | null>(null);
  const heatmapCardRef = useRef<HTMLDivElement | null>(null);
  const activityCardRef = useRef<HTMLDivElement | null>(null);
  const comparisonCardRef = useRef<HTMLDivElement | null>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;
  const INDICATOR_APPEAR_THRESHOLD = 30;

  // AbortController для отмены предыдущих запросов
  const abortControllerRef = useRef<AbortController | null>(null);

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;
  const canShowData = selectedNetwork && (selectedTradingPoint === 'all' || selectedTradingPoint || !selectedTradingPoint);

  // Вычисляем разрешенные номера станций из scopeValues пользователя
  const allowedStationNumbers = useMemo(() => {
    if (!user?.roles) return null;

    const userScopeValues: string[] = [];
    user.roles.forEach((role: any) => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    if (userScopeValues.length === 0) {
      return null;
    }

    const stationNumbers = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        stationNumbers.add(parts[1]);
      }
    });

    return stationNumbers.size > 0 ? stationNumbers : null;
  }, [user?.roles]);

  // Функция загрузки транзакций
  const loadTransactions = useCallback(async (signal?: AbortSignal) => {
    if (!selectedNetwork?.external_id) {
      return;
    }

    setLoading(true);
    try {
      setTransactions([]);
      setPrevPeriodTransactions([]);
      setTanks([]);
      setTerminalInfo(null);
      setPrices([]);

      const contextParams: { networkId: string; tradingPointId?: string } = {
        networkId: selectedNetwork.external_id,
      };

      if (selectedTradingPoint && selectedTradingPoint !== 'all' && selectedStation?.external_id) {
        contextParams.tradingPointId = selectedStation.external_id;
      }

      const stsTransactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        0,
        contextParams
      );

      // Фильтруем транзакции по мультиселекту
      let filteredStsTransactions = stsTransactions;
      if (isAllTradingPoints && selectedTradingPoints.length > 0 && selectedNetwork?.id) {
        try {
          const networkPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
          if (selectedTradingPoints.length < networkPoints.length) {
            const selectedExternalIds = new Set(
              networkPoints
                .filter(p => selectedTradingPoints.includes(p.id))
                .map(p => p.external_id)
                .filter(Boolean)
            );
            filteredStsTransactions = stsTransactions.filter(t =>
              selectedExternalIds.has(String(t.stationNumber))
            );
          }
        } catch { /* ignore, show all */ }
      }

      setTransactions(filteredStsTransactions);

      // Загружаем транзакции предыдущего периода
      try {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        const periodMs = toDate.getTime() - fromDate.getTime();
        const prevTo = new Date(fromDate.getTime() - 86400000);
        const prevFrom = new Date(prevTo.getTime() - periodMs);
        const prevFromStr = prevFrom.toISOString().split('T')[0];
        const prevToStr = prevTo.toISOString().split('T')[0];
        const prevTransactions = await stsApiService.getTransactions(
          prevFromStr,
          prevToStr,
          0,
          contextParams
        );
        // Фильтруем предыдущий период тем же набором станций
        if (isAllTradingPoints && selectedTradingPoints.length > 0 && selectedNetwork?.id) {
          try {
            const networkPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
            if (selectedTradingPoints.length < networkPoints.length) {
              const selectedExternalIds = new Set(
                networkPoints
                  .filter(p => selectedTradingPoints.includes(p.id))
                  .map(p => p.external_id)
                  .filter(Boolean)
              );
              setPrevPeriodTransactions(prevTransactions.filter(t =>
                selectedExternalIds.has(String(t.stationNumber))
              ));
            } else {
              setPrevPeriodTransactions(prevTransactions);
            }
          } catch {
            setPrevPeriodTransactions(prevTransactions);
          }
        } else {
          setPrevPeriodTransactions(prevTransactions);
        }
      } catch {
        setPrevPeriodTransactions([]);
      }

      // Загружаем дополнительные данные
      let additionalDataLoaded: string[] = [];
      try {
        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const tanksData = await stsApiService.getTanks(contextParams);
            setTanks(tanksData);
            if (tanksData.length > 0) additionalDataLoaded.push(`${tanksData.length} резервуаров`);
          } catch (tanksError) {
            // Не удалось загрузить резервуары
          }
        }

        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const terminalData = await stsApiService.getTerminalInfo(contextParams);
            setTerminalInfo(terminalData);
            if (terminalData) additionalDataLoaded.push('данные терминала');
          } catch (terminalError) {
            // Не удалось загрузить информацию о терминале
          }
        }

        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const pricesData = await stsApiService.getPrices(contextParams);
            setPrices(pricesData);
            if (pricesData.length > 0) additionalDataLoaded.push(`${pricesData.length} цен`);
          } catch (pricesError) {
            // Не удалось загрузить цены
          }
        }

      } catch (additionalDataError) {
        // Не прерываем выполнение
      }

      const additionalText = additionalDataLoaded.length > 0 ? `, ${additionalDataLoaded.join(', ')}` : '';

    } catch (error: any) {
      if (signal?.aborted) return;
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [selectedNetwork?.external_id, selectedNetwork?.id, selectedTradingPoint, selectedStation?.external_id, selectedTradingPoints, isAllTradingPoints, dateFrom, dateTo]);

  // Инициализация компонента
  useEffect(() => {
    const isConfigured = stsApiService.isConfigured();
    setStsApiConfigured(isConfigured);

    if (!isInitialized) return;
    setInitializing(false);

    if (!selectedNetwork?.external_id || !isConfigured) return;

    if (selectedTradingPoint && selectedTradingPoint !== 'all' && !selectedStation?.external_id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadTransactions(controller.signal);

    return () => {
      controller.abort();
    };
  }, [isInitialized, selectedNetwork?.external_id, selectedTradingPoint, selectedStation?.external_id, dateFrom, dateTo, loadTransactions]);

  // Ручное обновление с отменой предыдущего запроса
  const handleManualRefresh = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadTransactions(controller.signal);
  }, [loadTransactions]);

  const handleRefreshData = async () => {
    if (selectedNetwork) {
      handleManualRefresh();
    }
  };

  // Cleanup RAF при размонтировании компонента
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    // Selection context
    selectedNetwork,
    selectedTradingPoint,
    selectedStation,
    isAllTradingPoints,
    user,

    // Filters
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtersOpen,
    setFiltersOpen,

    // Data states
    transactions,
    prevPeriodTransactions,
    tanks,
    terminalInfo,
    prices,
    loading,
    stsApiConfigured,
    setStsApiConfigured,
    initializing,
    setInitializing,
    exportingPdf,
    setExportingPdf,

    // Pull-to-refresh
    pullState,
    setPullState,
    pullDistance,
    setPullDistance,
    scrollContainerRef,
    startTouchRef,
    rafId,
    PULL_THRESHOLD,
    MAX_PULL_DISTANCE,
    INDICATOR_APPEAR_THRESHOLD,

    // Refs
    dailySalesCardRef,
    heatmapCardRef,
    activityCardRef,
    comparisonCardRef,

    // Derived
    isNetworkOnly,
    isTradingPointSelected,
    canShowData,
    allowedStationNumbers,

    // Actions
    loadTransactions,
    handleManualRefresh,
    handleRefreshData,
    toast,
  };
}
