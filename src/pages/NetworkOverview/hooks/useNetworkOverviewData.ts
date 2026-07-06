import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import { useSelection } from "@/contexts/SelectionContext";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { stsApiService } from "@/services/sts";
import { getCachedTransactions } from "@/services/transactionsCache";
import { tradingPointsService } from "@/services/tradingPointsService";
import { useToast } from "@/hooks/use-toast";
import { todayString, monthsAgoString } from "@/utils/dateUtils";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";

export function useNetworkOverviewData(enabled: boolean = true) {
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint, selectedStation, isAllTradingPoints, isInitialized, selectedTradingPoints } = useSelection();
  const { selectedExternalIds, selectedNetworks } = useSelectedNetworks();
  const { user } = useNewAuth();
  const { toast } = useToast();

  // Состояния фильтров (локальный часовой пояс)
  const [dateFrom, setDateFrom] = useState(() => monthsAgoString(1));
  const [dateTo, setDateTo] = useState(() => todayString());
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Состояния данных
  const [transactions, setTransactions] = useState<any[]>([]);
  const [prevPeriodTransactions, setPrevPeriodTransactions] = useState<any[]>([]);
  // Кол-во дней, которые STS не отдал (стойкий 500) — для баннера неполноты
  const [missingDays, setMissingDays] = useState(0);
  const [tanks, setTanks] = useState<any[]>([]);
  const [terminalInfo, setTerminalInfo] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Хотя бы раз успешно (не по abort) завершали загрузку сырья — чтобы экспорт
  // знал, что данные готовы, и не запускался на пустом наборе.
  const [hasLoadedRaw, setHasLoadedRaw] = useState(false);
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

  // Загрузка транзакций из STS по всем выбранным сетям.
  // Собираем метку неполноты (__partial) со всех сетей, чтобы показать баннер.
  const fetchTransactionsForNetworks = useCallback(async (
    from: string, to: string, externalIds: string[], tradingPointId?: string
  ) => {
    const results = await Promise.all(
      externalIds.map(networkId => {
        const params: { networkId: string; tradingPointId?: string } = { networkId };
        if (tradingPointId) params.tradingPointId = tradingPointId;
        return getCachedTransactions(from, to, 0, params).catch(() => [] as any[]);
      })
    );
    const flat = results.flat();
    const totalMissingDays = results.reduce((sum, r) => sum + ((r as any).__partial?.days || 0), 0);
    if (totalMissingDays > 0) {
      Object.defineProperty(flat, '__partial', { value: { days: totalMissingDays }, enumerable: false });
    }
    return flat;
  }, []);

  // Фильтрация транзакций по справочнику зарегистрированных станций
  // Всегда фильтруем — STS может возвращать станции, не зарегистрированные в системе
  const filterBySelectedPoints = useCallback(async (txns: any[]) => {
    if (selectedTradingPoints.length === 0 || selectedNetworkIds.length === 0) {
      return txns;
    }
    try {
      const allPoints = (await Promise.all(
        selectedNetworkIds.map(id => tradingPointsService.getByNetworkId(id).catch(() => []))
      )).flat();
      // Фильтруем по выбранным точкам (или по всем известным, если выбраны все)
      const relevantPoints = selectedTradingPoints.length < allPoints.length
        ? allPoints.filter(p => selectedTradingPoints.includes(p.id))
        : allPoints;
      // Собираем ВСЕ STS-номера точки: external_id + external_codes[sts].
      // Станция может иметь несколько STS-кодов (напр. Светогорск: текущий 8
      // + исторический 9008 за июнь) — ловим транзакции по любому из них.
      const allowedExtIds = new Set<string>();
      relevantPoints.forEach(p => {
        if (p.external_id) allowedExtIds.add(String(p.external_id));
        (p.externalCodes || []).forEach((ec: any) => {
          if (ec?.system === 'sts' && ec.code) allowedExtIds.add(String(ec.code));
        });
      });
      return txns.filter(t => allowedExtIds.has(String(t.stationNumber)));
    } catch { /* ignore */ }
    return txns;
  }, [selectedTradingPoints, selectedNetworkIds]);

  // Функция загрузки транзакций
  const loadTransactions = useCallback(async (signal?: AbortSignal) => {
    if (selectedExternalIds.length === 0) {
      return;
    }

    setLoading(true);
    try {
      setTransactions([]);
      setPrevPeriodTransactions([]);
      setMissingDays(0);
      setTanks([]);
      setTerminalInfo(null);
      setPrices([]);

      const tradingPointId = (selectedTradingPoint && selectedTradingPoint !== 'all' && selectedStation?.external_id)
        ? selectedStation.external_id
        : undefined;

      // При выборе конкретной станции опрашиваем только её родную сеть.
      // Иначе для alias-точки (Выборг 2, Первомайская 4 и т.п.) запросы
      // улетят и в БТО (system=15&station=2), и в ГИГ (system=65&station=2 →
      // прокси через findAliasReverse подменит на system=15&station=2),
      // и оба ответа вернут одни и те же транзакции — задвоение.
      const transactionExternalIds = tradingPointId
        ? [
            (selectedStation?.networkId
              ? selectedNetworks.find(n => n.id === selectedStation.networkId)?.external_id
              : null) || selectedExternalIds[0],
          ]
        : selectedExternalIds;

      // Загружаем транзакции по выбранным сетям
      const stsTransactions = await fetchTransactionsForNetworks(dateFrom, dateTo, transactionExternalIds, tradingPointId);
      const filtered = await filterBySelectedPoints(stsTransactions);
      setMissingDays((stsTransactions as any).__partial?.days || 0);
      // startTransition: рендер 100k строк — неотложное обновление; меню и
      // прочий интерактив не замирают, пока React пересчитывает страницу
      startTransition(() => setTransactions(filtered));

      // Основные данные на экране — снимаем спиннер. Сравнение с прошлым
      // периодом и карточки станции догружаются фоном (это ещё столько же
      // походов в STS, ждать их для отрисовки страницы не нужно).
      if (!signal?.aborted) {
        setLoading(false);
      }

      // Предыдущий период
      try {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        const periodMs = toDate.getTime() - fromDate.getTime();
        const prevTo = new Date(fromDate.getTime() - 86400000);
        const prevFrom = new Date(prevTo.getTime() - periodMs);
        const prevFromStr = prevFrom.toISOString().split('T')[0];
        const prevToStr = prevTo.toISOString().split('T')[0];
        const prevTxns = await fetchTransactionsForNetworks(prevFromStr, prevToStr, transactionExternalIds, tradingPointId);
        const prevFiltered = await filterBySelectedPoints(prevTxns);
        startTransition(() => setPrevPeriodTransactions(prevFiltered));
      } catch {
        setPrevPeriodTransactions([]);
      }

      // Дополнительные данные (только для конкретной станции)
      // Определяем правильный external_id сети для этой станции
      if (tradingPointId && tradingPointId !== '1') {
        const stationNetworkExtId = selectedStation?.networkId
          ? selectedNetworks.find(n => n.id === selectedStation.networkId)?.external_id || selectedExternalIds[0]
          : selectedExternalIds[0];
        const stationParams = { networkId: stationNetworkExtId, tradingPointId };
        try {
          const tanksData = await stsApiService.getTanks(stationParams);
          setTanks(tanksData);
        } catch { /* ignore */ }
        try {
          const terminalData = await stsApiService.getTerminalInfo(stationParams);
          setTerminalInfo(terminalData);
        } catch { /* ignore */ }
        try {
          const pricesData = await stsApiService.getPrices(stationParams);
          setPrices(pricesData);
        } catch { /* ignore */ }
      }

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
        setHasLoadedRaw(true);
      }
    }
  }, [selectedExternalIds, selectedNetworks, selectedTradingPoint, selectedStation, selectedTradingPoints, isAllTradingPoints, dateFrom, dateTo, fetchTransactionsForNetworks, filterBySelectedPoints]);

  // Инициализация компонента
  useEffect(() => {
    const isConfigured = stsApiService.isConfigured();
    setStsApiConfigured(isConfigured);

    if (!isInitialized) return;
    setInitializing(false);

    // Ленивая загрузка сырья: пока раздел «Расширенная аналитика»/экспорт не
    // запрошены (enabled=false), тяжёлые транзакции STS не тянем — основной
    // блок «Обзора» рендерится из серверных агрегатов мгновенно.
    if (!enabled) return;

    if (selectedExternalIds.length === 0 || !isConfigured) return;

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
  }, [enabled, isInitialized, selectedExternalIds, selectedTradingPoint, selectedStation?.external_id, dateFrom, dateTo, loadTransactions]);

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
    missingDays,
    tanks,
    terminalInfo,
    prices,
    loading,
    hasLoadedRaw,
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
