import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Activity, AlertTriangle, Loader2, FileText, FileSpreadsheet, RefreshCw, Filter } from "lucide-react";
import KPIFuelCard from "@/components/operations/KPIFuelCard";
import KPIPaymentCard from "@/components/operations/KPIPaymentCard";
import { VirtualizedOperationsTable } from "@/components/operations/VirtualizedOperationsTable";
import PivotTable, { PIVOT_DIMENSIONS } from "@/components/pivot/PivotTable";
import { buildPivotTree, type PivotSortBy } from "@/utils/pivotTree";
import { exportToExcel, exportToPdf, exportPivotToExcel } from "@/services/operationsExportService";
import { normalizePaymentMethod } from "@/utils/paymentUtils";
import { couponsApiService } from "@/services/couponsApiService";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";
import { todayString, daysAgoString } from "@/utils/dateUtils";
import { useOperationsFilters } from "@/hooks/useOperationsFilters";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  fetchOverview,
  fetchOperations,
  fetchPivot,
  mapServerRowToOperation,
  triggerSync,
  type OverviewResponse,
  type OverviewFuelPayment,
  type PivotResponse,
} from "@/services/analyticsService";
import { parseOperationsSearch } from "@/utils/operationsSearchParser";
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from "@/components/common/filterPanel";

// Сумма ячеек кросс-разреза «топливо × оплата» по предикату
function sumCross(cross: OverviewFuelPayment[], match: (c: OverviewFuelPayment) => boolean) {
  let volume = 0, revenue = 0, count = 0;
  for (const c of cross) {
    if (!match(c)) continue;
    volume += c.volume; revenue += c.revenue; count += c.operations;
  }
  return { volume, revenue, count };
}

export default function OperationsTransactionsPageSimple() {
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint, selectedTradingPoints, selectedStation, isAllTradingPoints, isInitialized } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();
  const isMobile = useIsMobile();

  // Справочник точек выбранных сетей — перевод выбранных id точек в номера
  // станций (external_id) для фильтра аналитики (одна или несколько станций).
  const { data: networkPoints = [] } = useQuery({
    queryKey: ['opsPoints', ...[...selectedNetworkIds].sort()],
    queryFn: async () => {
      if (!selectedNetworkIds.length) return [];
      const results = await Promise.all(
        selectedNetworkIds.map((id) => tradingPointsService.getByNetworkId(id).catch(() => []))
      );
      return results.flat();
    },
    enabled: selectedNetworkIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Коды выбранных станций. Все выбраны (или ничего/справочник не готов) →
  // undefined = без фильтра (вся сеть).
  const selectedStationCodes = useMemo<string[] | undefined>(() => {
    if (!networkPoints.length) return undefined;
    if (!selectedTradingPoints?.length || selectedTradingPoints.length >= networkPoints.length) return undefined;
    const codes = networkPoints
      .filter((p: any) => selectedTradingPoints.includes(p.id))
      .map((p: any) => p.external_id)
      .filter(Boolean) as string[];
    return codes.length ? codes : undefined;
  }, [networkPoints, selectedTradingPoints]);
  const stationsKey = selectedStationCodes ? selectedStationCodes.slice().sort().join(',') : '';

  // Управление фильтрами через кастомный хук
  const {
    filters,
    debouncedFilters,
    setSelectedStatus,
    setDateFrom,
    setDateTo,
    setSearchQuery,
    clearFilters,
    handleKpiFuelClick,
    handleKpiPaymentClick
  } = useOperationsFilters();

  const {
    selectedStatus,
    dateFrom,
    dateTo,
    searchQuery,
    selectedKpiFuels,
    selectedKpiPayments
  } = filters;

  const {
    dateFrom: debouncedDateFrom,
    dateTo: debouncedDateTo,
    searchQuery: debouncedSearchQuery
  } = debouncedFilters;

  // Серверная модель: готовые агрегаты периода (overview) +
  // пагинированный список текущей страницы (serverRows / serverTotal).
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [serverRows, setServerRows] = useState<any[]>([]);
  const [serverTotal, setServerTotal] = useState(0);

  // Флаг «первичной» загрузки — оставлен для совместимости JSX-гейтов.
  const [loading] = useState(false);

  // Пагинация (серверная)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 20 : 50;
  const totalPages = Math.max(1, Math.ceil(serverTotal / itemsPerPage));

  // Загрузка серверных данных (тяжёлая — со сменой периода/сети/точки)
  const [loadingFromSTS, setLoadingFromSTS] = useState(false);
  // Транзишн выкладки строк в state: пока он идёт, isPending=true.
  const [isPending, startTransition] = useTransition();
  // Единый флаг занятости — для спиннеров и empty-state
  const isBusy = loading || loadingFromSTS || isPending;
  const [stsError, setStsError] = useState<string | null>(null);

  // Выгрузка ВСЕХ строк периода для экспорта (не только текущей страницы)
  const [exportingAll, setExportingAll] = useState(false);

  // ── Сводная (таб «Сводная») ───────────────────────────────────────────
  // Сервер отдаёт «листья» по НАБОРУ измерений, иерархию собирает браузер —
  // поэтому перестановка порядка группировок не идёт в сеть.
  const [viewMode, setViewMode] = useState<'list' | 'pivot'>(
    () => (localStorage.getItem('ops.viewMode') === 'pivot' ? 'pivot' : 'list')
  );
  const [pivotDims, setPivotDims] = useState<string[]>(() => {
    const saved = localStorage.getItem('ops.pivotDims');
    const parsed = saved ? saved.split(',').filter((k) => PIVOT_DIMENSIONS.some((d) => d.key === k)) : [];
    return parsed.length ? parsed : ['station', 'fuel', 'payment'];
  });
  const [pivotSortBy, setPivotSortBy] = useState<PivotSortBy>('revenue');
  const [pivotData, setPivotData] = useState<PivotResponse | null>(null);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotError, setPivotError] = useState<string | null>(null);
  // Ответы по набору измерений в пределах текущих фильтров (см. useEffect ниже)
  const pivotCacheRef = useRef<Map<string, PivotResponse>>(new Map());
  const pivotCacheKeyRef = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem('ops.viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('ops.pivotDims', pivotDims.join(',')); }, [pivotDims]);

  // Модальное окно деталей операции
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Купон, которым оплачена операция: его номер лежит в card, а дату выдачи
  // знает только STS — подтягиваем при открытии карточки купонной операции.
  const [couponIssuedAt, setCouponIssuedAt] = useState<string | null>(null);

  // Гонки ответов + ключ перезагрузки overview + сигнатура фильтров
  const currentRequestIdRef = useRef(0);
  const lastOverviewKeyRef = useRef<string | null>(null);
  const filterSigRef = useRef<string | null>(null);

  // Список для десктопной таблицы и mobile — это уже текущая страница с сервера
  const filteredOperations = serverRows;
  const paginatedOperations = serverRows;

  // Основная серверная загрузка: агрегаты периода + страница списка
  const loadServerData = async () => {
    const networkIds = selectedNetworkIds;
    if (networkIds.length === 0) {
      setOverview(null);
      setServerRows([]);
      setServerTotal(0);
      lastOverviewKeyRef.current = null;
      return;
    }

    const from = debouncedDateFrom;
    const to = debouncedDateTo;
    const parsed = parseOperationsSearch(debouncedSearchQuery);
    // Приоритет — явный выбор точек в шапке (одна или несколько); иначе станция
    // из строки поиска («азс 6»). undefined = вся сеть.
    const stations = selectedStationCodes ?? (parsed.station ? [parsed.station] : undefined);

    // overview зависит от периода/сети/выбранных станций (KPI-клики/поиск/страница
    // не влияют). stations в ключе — иначе при смене точек KPI не перезапросятся.
    const overviewKey = `${networkIds.join(',')}|${from}|${to}|${stations ? stations.slice().sort().join(',') : ''}`;
    const needOverview = overviewKey !== lastOverviewKeyRef.current;

    const requestId = ++currentRequestIdRef.current;
    if (needOverview) setLoadingFromSTS(true);
    setStsError(null);

    try {
      const [overviewRes, opsRes] = await Promise.all([
        needOverview ? fetchOverview({ networkIds, from, to, stations }) : Promise.resolve(null),
        fetchOperations({
          networkIds,
          from,
          to,
          fuels: selectedKpiFuels.size > 0 ? Array.from(selectedKpiFuels) : undefined,
          payments: selectedKpiPayments.size > 0 ? Array.from(selectedKpiPayments) : undefined,
          stations,
          shift: parsed.shift,
          receipt: parsed.receipt,
          pos: parsed.pos,
          card: parsed.card,
          search: parsed.search,
          page: currentPage,
          pageSize: itemsPerPage,
        }),
      ]);

      if (requestId !== currentRequestIdRef.current) {
        return;
      }

      if (needOverview && overviewRes) {
        setOverview(overviewRes);
        lastOverviewKeyRef.current = overviewKey;
      }
      setServerTotal(opsRes.total);
      const mapped = opsRes.rows.map(mapServerRowToOperation);
      // startTransition: рендер списка не должен замораживать интерактив
      startTransition(() => setServerRows(mapped));
    } catch (error: any) {
      if (requestId !== currentRequestIdRef.current) {
        return;
      }
      const msg = error?.message?.includes('502') || error?.message?.includes('503')
        ? 'Сервер STS временно недоступен. Попробуйте обновить через минуту.'
        : error?.message?.includes('Timeout') || error?.message?.includes('timeout')
        ? 'Превышено время ожидания ответа от сервера STS.'
        : `Ошибка загрузки: ${error?.message || 'Неизвестная ошибка'}`;
      setStsError(msg);
      console.error('Analytics API:', error);
    } finally {
      if (requestId === currentRequestIdRef.current && needOverview) {
        setLoadingFromSTS(false);
      }
    }
  };

  // Выгрузка ВСЕХ строк периода (для экспорта) — постранично по 500
  const collectAllRows = async (): Promise<any[]> => {
    const networkIds = selectedNetworkIds;
    if (networkIds.length === 0) return [];

    const from = debouncedDateFrom;
    const to = debouncedDateTo;
    const parsed = parseOperationsSearch(debouncedSearchQuery);
    const stations = selectedStationCodes ?? (parsed.station ? [parsed.station] : undefined);

    const pageSize = 500;
    const all: any[] = [];
    let page = 1;
    let total = Infinity;

    while (all.length < total) {
      const res = await fetchOperations({
        networkIds,
        from,
        to,
        fuels: selectedKpiFuels.size > 0 ? Array.from(selectedKpiFuels) : undefined,
        payments: selectedKpiPayments.size > 0 ? Array.from(selectedKpiPayments) : undefined,
        stations,
        shift: parsed.shift,
        receipt: parsed.receipt,
        pos: parsed.pos,
        card: parsed.card,
        search: parsed.search,
        page,
        pageSize,
      });
      total = res.total;
      if (!res.rows.length) break;
      res.rows.forEach(r => all.push(mapServerRowToOperation(r)));
      page += 1;
      if (page > 1000) break; // предохранитель от бесконечного цикла
    }
    return all;
  };

  // Подпись выбранных точек для шапки отчётов. Служебное значение 'all' (иногда
  // лежит в localStorage закавыченным) не должно протекать в отчёт как есть.
  const tradingPointLabel = (): string => {
    const raw = String(selectedTradingPoint || '').replace(/^"+|"+$/g, '');
    if (isAllTradingPoints || raw === 'all' || !raw) return 'Все торговые точки';
    if (selectedTradingPoints && selectedTradingPoints.length > 1) {
      const names = selectedTradingPoints
        .map((id) => networkPoints.find((p: any) => p.id === id)?.name)
        .filter(Boolean);
      if (names.length) return names.join(', ');
    }
    return selectedStation?.name || raw;
  };

  // Подпись сетей: в шапке возможен мультивыбор, одна selectedNetwork тогда врёт
  const networkLabel = (): string => {
    if (selectedNetworks && selectedNetworks.length > 1) {
      return selectedNetworks.map((n: any) => n.name).filter(Boolean).join(', ');
    }
    return selectedNetwork?.name || selectedNetworks?.[0]?.name || '—';
  };

  // Подпись значения измерения: код станции → название точки из справочника
  const pivotLabeler = useMemo(() => {
    const names = new Map<string, string>();
    networkPoints.forEach((p: any) => { if (p.external_id) names.set(String(p.external_id), p.name); });
    return (dim: string, value: string | number | null) => {
      if (value == null || value === '') return '— не указано —';
      if (dim === 'station') return names.get(String(value)) || `АЗС ${value}`;
      if (dim === 'hour') return `${String(value).padStart(2, '0')}:00`;
      return String(value);
    };
  }, [networkPoints]);

  // Запрос сводной. В ключе — НАБОР измерений (отсортированный): смена порядка
  // группировок пересобирает дерево локально, без обращения к серверу.
  const pivotDimsKey = useMemo(() => [...pivotDims].sort().join(','), [pivotDims]);
  const pivotFilterKey = [
    selectedNetworkIds.join(','), debouncedDateFrom, debouncedDateTo,
    selectedStationCodes?.slice().sort().join(',') || '',
    Array.from(selectedKpiFuels).sort().join(','),
    Array.from(selectedKpiPayments).sort().join(','),
    debouncedSearchQuery,
  ].join('|');

  useEffect(() => {
    if (viewMode !== 'pivot' || !selectedNetworkIds.length || !pivotDimsKey) return;
    // Кэш живёт в пределах одного набора фильтров: возврат к уже показанному
    // разрезу (например, после снятия и повторного добавления измерения)
    // отрисовывается мгновенно, без повторного запроса.
    if (pivotCacheKeyRef.current !== pivotFilterKey) {
      pivotCacheRef.current.clear();
      pivotCacheKeyRef.current = pivotFilterKey;
    }
    const cached = pivotCacheRef.current.get(pivotDimsKey);
    if (cached) {
      setPivotData(cached);
      setPivotError(null);
      setPivotLoading(false);
      return;
    }

    let cancelled = false;
    const parsed = parseOperationsSearch(debouncedSearchQuery);
    const stations = selectedStationCodes ?? (parsed.station ? [parsed.station] : undefined);
    setPivotLoading(true);
    setPivotError(null);
    fetchPivot({
      networkIds: selectedNetworkIds,
      from: debouncedDateFrom,
      to: debouncedDateTo,
      dims: pivotDimsKey.split(','),
      fuels: selectedKpiFuels.size > 0 ? Array.from(selectedKpiFuels) : undefined,
      payments: selectedKpiPayments.size > 0 ? Array.from(selectedKpiPayments) : undefined,
      stations,
      shift: parsed.shift, receipt: parsed.receipt, pos: parsed.pos,
      card: parsed.card, search: parsed.search,
    })
      .then((res) => {
        if (cancelled) return;
        pivotCacheRef.current.set(pivotDimsKey, res);
        setPivotData(res);
      })
      .catch((e) => { if (!cancelled) { setPivotData(null); setPivotError(e?.message || 'Ошибка загрузки сводной'); } })
      .finally(() => { if (!cancelled) setPivotLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pivotDimsKey, pivotFilterKey]);

  const handleExportPivot = async () => {
    if (exportingAll || !pivotData) return;
    setExportingAll(true);
    try {
      const { nodes, totals } = buildPivotTree(pivotData.rows, pivotData.dims, pivotDims, pivotSortBy, pivotLabeler);
      await exportPivotToExcel({
        nodes,
        totals,
        dims: pivotDims.map((k) => PIVOT_DIMENSIONS.find((d) => d.key === k) || { key: k, label: k }),
        dateFrom, dateTo,
        networkName: networkLabel(),
        tradingPointName: tradingPointLabel(),
        isMobile,
      });
    } finally {
      setExportingAll(false);
    }
  };

  // Обработчики экспорта — выгружаем ВЕСЬ период, не только текущую страницу
  const handleExportToExcel = async () => {
    if (exportingAll) return;
    setExportingAll(true);
    try {
      const rows = await collectAllRows();
      await exportToExcel({
        operations: rows,
        dateFrom,
        dateTo,
        networkName: networkLabel(),
        tradingPointName: tradingPointLabel(),
        isMobile
      });
    } finally {
      setExportingAll(false);
    }
  };

  const handleExportToPdf = async () => {
    if (exportingAll) return;
    setExportingAll(true);
    try {
      const rows = await collectAllRows();
      await exportToPdf({
        operations: rows,
        dateFrom,
        dateTo,
        networkName: networkLabel(),
        tradingPointName: tradingPointLabel(),
        isMobile
      });
    } finally {
      setExportingAll(false);
    }
  };

  // Кнопка «Обновить»: быстрый досинк свежего хвоста, затем перечитываем данные.
  // Полная ручная сверка выбранного периода доступна отдельно на «Обзоре».
  const handleRefresh = async () => {
    const networkIds = selectedNetworkIds;
    if (networkIds.length === 0) return;
    setLoadingFromSTS(true);
    try {
      await triggerSync(networkIds);
    } catch {
      /* если синк не удался — всё равно перечитываем то, что есть */
    }
    // Форсируем перезагрузку и агрегатов (overview), и списка
    lastOverviewKeyRef.current = null;
    await loadServerData();
  };

  // Дата выдачи купона для открытой купонной операции. Купоны живут только в
  // STS, поэтому дёргаем их точечно — по станции операции за 30 дней до неё
  // (срок жизни купона по умолчанию 7 дней, запас на «долгие» купоны).
  useEffect(() => {
    setCouponIssuedAt(null);
    const op = selectedOperation;
    const number = op?.cardNumber && op.cardNumber !== '-' ? String(op.cardNumber) : '';
    if (!isDetailsOpen || !number || !op?.stationNumber) return;
    if (normalizePaymentMethod(op.paymentMethod) !== 'Купон') return;
    // Сеть берём по станции операции, а не из выбора в шапке: при мультисети
    // выбранная сеть может быть не той, которой принадлежит операция.
    const point = networkPoints.find((p: any) => String(p.external_id) === String(op.stationNumber));
    const system = selectedNetworks.find(n => n.id === point?.networkId)?.external_id
      || selectedNetwork?.external_id;
    if (!system) return;

    let cancelled = false;
    const opTime = new Date(op.startTime);
    couponsApiService
      .getCoupons({
        system: Number(system),
        station: Number(op.stationNumber),
        dt_beg: new Date(opTime.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
        dt_end: new Date(opTime.getTime() + 24 * 3600 * 1000).toISOString(),
      })
      .then((res) => {
        if (cancelled || !Array.isArray(res)) return;
        const found = res
          .flatMap((s) => s.coupons || [])
          .find((c) => String(c.number) === number);
        if (found) setCouponIssuedAt(found.dt);
      })
      .catch(() => { /* нет доступа к STS — покажем только номер купона */ });
    return () => { cancelled = true; };
  }, [isDetailsOpen, selectedOperation, selectedNetwork?.external_id, networkPoints, selectedNetworks]);

  // Держим актуальную ссылку на handleRefresh для стабильных слушателей событий
  const handleRefreshRef = useRef(handleRefresh);
  handleRefreshRef.current = handleRefresh;

  // Pull-to-refresh через переиспользуемый хук
  const handleRefreshData = async () => {
    await handleRefreshRef.current();
  };

  const INDICATOR_APPEAR_THRESHOLD = 30;

  const { pullState, pullDistance, scrollContainerRef } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: INDICATOR_APPEAR_THRESHOLD
  });

  // Слушаем кнопку обновления из BottomNav
  useEffect(() => {
    const handler = () => { handleRefreshRef.current(); };
    window.addEventListener('bottomnav-refresh', handler);
    return () => window.removeEventListener('bottomnav-refresh', handler);
  }, []);

  // Единый триггер загрузки. Сигнатура фильтров (без страницы): при её смене —
  // сбрасываем на первую страницу и грузим ровно один раз (без двойных запросов).
  useEffect(() => {
    if (!isInitialized) return;

    const sig = JSON.stringify({
      net: selectedNetworkIds,
      stations: stationsKey,
      all: isAllTradingPoints,
      from: debouncedDateFrom,
      to: debouncedDateTo,
      search: debouncedSearchQuery,
      fuels: Array.from(selectedKpiFuels),
      payments: Array.from(selectedKpiPayments),
      status: selectedStatus,
    });

    if (sig !== filterSigRef.current) {
      filterSigRef.current = sig;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return; // дождёмся ре-рендера со страницей 1 — грузим один раз
      }
    }

    loadServerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInitialized,
    selectedNetworkIds,
    stationsKey,
    isAllTradingPoints,
    debouncedDateFrom,
    debouncedDateTo,
    debouncedSearchQuery,
    selectedKpiFuels,
    selectedKpiPayments,
    selectedStatus,
    currentPage,
    itemsPerPage,
  ]);

  // Сброс всех фильтров (включая KPI)
  const handleKpiResetAll = () => {
    clearFilters();
  };

  // KPI-агрегаты строятся из серверного overview (сводка за период) с
  // ПЕРЕКРЁСТНОЙ фильтрацией через кросс-разрез «топливо × оплата»:
  // выбрали АИ-92 → карточки оплат показывают суммы только по АИ-92, выбрали
  // «Наличные» → карточки топлива только по наличным, «Итого» — по обоим.
  // Всё считается локально, клик по карточке не идёт в сеть.
  // Список карточек всегда полный (из byFuel/byPayment): невыбранное показывает
  // нули, а не исчезает — иначе фильтр было бы нечем снять.
  const cross = overview?.byFuelPayment;

  // По видам топлива (сужены выбранными способами оплаты)
  const fuelKpis = useMemo(() => {
    if (!overview) return [] as { fuel: string; volume: number; revenue: number; count: number }[];
    return overview.byFuel.map(f => {
      // Нет кросс-разреза (старый backend) — прежнее поведение: итоги за период
      if (!cross?.length) return { fuel: f.fuel, volume: f.volume, revenue: f.revenue, count: f.operations };
      const s = sumCross(cross, c => c.fuel === f.fuel && (selectedKpiPayments.size === 0 || selectedKpiPayments.has(c.method)));
      return { fuel: f.fuel, volume: s.volume, revenue: s.revenue, count: s.count };
    });
  }, [overview, cross, selectedKpiPayments]);

  // По способам оплаты (сужены выбранными видами топлива).
  // Порядок — по общей выручке за период, чтобы карточки не прыгали при фильтре.
  const paymentKpiCards = useMemo(() => {
    if (!overview) return [] as { key: string; display: string; count: number; filteredRevenue: number; filteredVolume: number }[];
    return overview.byPayment
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => {
        const s = cross?.length
          ? sumCross(cross, c => c.method === p.method && (selectedKpiFuels.size === 0 || selectedKpiFuels.has(c.fuel)))
          : { volume: p.volume, revenue: p.revenue, count: p.operations };
        return {
          key: p.method,
          display: p.method,
          count: s.count,
          filteredRevenue: s.revenue,
          filteredVolume: s.volume,
        };
      });
  }, [overview, cross, selectedKpiFuels]);

  // Итого по периоду (сужено обоими фильтрами)
  const totalKpis = useMemo(() => {
    if (!overview) return { count: 0, volume: 0, revenue: 0 };
    const hasFilter = selectedKpiFuels.size > 0 || selectedKpiPayments.size > 0;
    if (!cross?.length || !hasFilter) {
      return { count: overview.kpi.operations, volume: overview.kpi.volume, revenue: overview.kpi.revenue };
    }
    const s = sumCross(cross, c =>
      (selectedKpiFuels.size === 0 || selectedKpiFuels.has(c.fuel)) &&
      (selectedKpiPayments.size === 0 || selectedKpiPayments.has(c.method))
    );
    return { count: s.count, volume: s.volume, revenue: s.revenue };
  }, [overview, cross, selectedKpiFuels, selectedKpiPayments]);

  // Показ блока KPI зависит от НАЛИЧИЯ данных за период, а не от результата
  // фильтра — иначе пустое пересечение прячет карточки вместе с кнопкой сброса.
  const hasPeriodData = (overview?.kpi.operations ?? 0) > 0;

  // Списки для селекторов. Сервер по сути отдаёт только завершённые операции.
  const statusTypes = ["Все", "completed"];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary text-foreground">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-secondary text-foreground">Выполняется</Badge>;
      case 'failed':
        return <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">Ошибка</Badge>;
      case 'pending':
        return <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-secondary text-foreground">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCompactStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary text-foreground text-xs px-1 py-0">ОК</Badge>;
      case 'in_progress':
        return <Badge className="bg-secondary text-foreground text-xs px-1 py-0">В работе</Badge>;
      case 'failed':
        return <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 text-xs px-1 py-0">Ошибка</Badge>;
      case 'pending':
        return <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 text-xs px-1 py-0">Ожидает</Badge>;
      case 'cancelled':
        return <Badge className="bg-secondary text-foreground text-xs px-1 py-0">Отмена</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0">{status}</Badge>;
    }
  };

  const formatExact = (value, fractionDigits = 2) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };


  // Loading state пока контекст не инициализирован
  if (!isInitialized) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Инициализация данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 relative overflow-x-hidden ${isMobile ? 'px-2 pt-2' : 'px-4 md:px-6 lg:px-8 pt-6'}`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Стандартный мобильный pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= INDICATOR_APPEAR_THRESHOLD && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{
              transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`,
              opacity: Math.min(1, (pullDistance - INDICATOR_APPEAR_THRESHOLD) / 40)
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm text-foreground px-4 py-2 rounded-full shadow-lg border border-border/50 flex items-center gap-2">
              {pullState === 'refreshing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Обновление...</span>
                </>
              ) : pullState === 'canRefresh' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Отпустите для обновления</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className="w-4 h-4 text-muted-foreground"
                    style={{
                      transform: `rotate(${pullDistance * 2}deg)`
                    }}
                  />
                  <span className="text-sm font-medium">Потяните для обновления</span>
                </>
              )}
            </div>
          </div>
        )}


        {/* Заголовок страницы — Deep Intel */}
        <div className="mb-6 pt-4">
          <div className="flex items-end justify-between gap-4">
            <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>Операции</h1>
            <div className="flex items-center gap-2 shrink-0">
              {viewMode === 'pivot' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPivot}
                  disabled={exportingAll || !pivotData?.rows.length}
                >
                  {exportingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                  Экспорт сводной
                </Button>
              ) : serverTotal > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    disabled={exportingAll}
                  >
                    {exportingAll ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Экспорт
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-xl rounded-lg">
                  <DropdownMenuItem onClick={handleExportToExcel} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Экспорт в Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportToPdf} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium">Экспорт в PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
          </div>
        </div>

        <div className={`${FILTER_PANEL_CLASS} mb-4`}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStatus("Все");
                  setSearchQuery("");
                  setDateFrom(daysAgoString(1));
                  setDateTo(todayString());
                }}
              >
                Очистить фильтры
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isBusy}
              >
                <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">Дата от</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={FILTER_PANEL_CONTROL_CLASS} />
            </div>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">Дата до</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={FILTER_PANEL_CONTROL_CLASS} />
            </div>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="status" className="text-xs text-muted-foreground">Статус</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className={FILTER_PANEL_CONTROL_CLASS}>
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "Все" ? status : ({
                        completed: 'Завершено',
                        in_progress: 'Выполняется',
                        failed: 'Ошибка',
                        pending: 'Ожидание',
                        cancelled: 'Отменено'
                      }[status] || status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="search" className="text-xs text-muted-foreground">Поиск</Label>
              <Input
                id="search"
                type="text"
                placeholder="Поиск (ID операции, смена, карта)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={FILTER_PANEL_CONTROL_CLASS}
              />
            </div>
          </div>
        </div>

        {/* KPI карточки */}
        {!loading && !loadingFromSTS && hasPeriodData && (
          <div className="space-y-4">
            {/* Карточки по видам топлива — одна строка */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Виды топлива</h3>
                <span className="text-xs text-muted-foreground">выберите один или несколько элементов</span>
              </div>
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : ''}`} style={isMobile ? undefined : { gridTemplateColumns: `repeat(${Math.min(fuelKpis.length, 6)}, 1fr)` }}>
                {fuelKpis.map(({ fuel, volume, revenue, count }) => (
                  <KPIFuelCard
                    key={fuel}
                    fuel={fuel}
                    isSelected={selectedKpiFuels.has(fuel)}
                    isMobile={isMobile}
                    volume={volume}
                    cost={revenue}
                    transactionCount={count}
                    onClick={handleKpiFuelClick}
                  />
                ))}
              </div>
            </div>

            {/* Карточки по способам оплаты — топ-4 крупные + остальные мелкие */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Способы оплаты</h3>
                <span className="text-xs text-muted-foreground">выберите один или несколько элементов</span>
              </div>
              {(() => {
                // Основные типы оплаты — всегда в первом ряду, включая «Купон»:
                // купонные отпуски отслеживают отдельно, а мелкой кнопкой они
                // показывали цифры только после клика. Отсутствующие за период
                // рисуем нулями — виден сам факт «купонов не было», и лэйаут не прыгает.
                const primaryTypes = ['Банковские', 'Наличные', 'Онлайн', 'Корп. карты', 'Купон'];
                const topCards = primaryTypes.map(name =>
                  paymentKpiCards.find(c => c.key === name)
                  || { key: name, display: name, count: 0, filteredRevenue: 0, filteredVolume: 0 }
                );
                const topKeys = new Set(topCards.map(c => c.key));
                const restCards = paymentKpiCards.filter(c => !topKeys.has(c.key));

                return (
                  <div className="space-y-3">
                    {/* Основные способы — крупные карточки */}
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
                      {topCards.map(({ key, display, count, filteredRevenue, filteredVolume }) => (
                        <KPIPaymentCard
                          key={key}
                          paymentKey={key}
                          display={display}
                          isSelected={selectedKpiPayments.has(display)}
                          isMobile={isMobile}
                          volume={filteredVolume}
                          cost={filteredRevenue}
                          transactionCount={count}
                          onClick={handleKpiPaymentClick}
                        />
                      ))}
                    </div>
                    {/* Остальные — название, при выборе раскрываются данные */}
                    {restCards.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {restCards.map(({ key, display, count, filteredRevenue, filteredVolume }) => {
                          const isSelected = selectedKpiPayments.has(display);
                          return (
                          <button
                            key={key}
                            onClick={() => handleKpiPaymentClick(key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-secondary text-foreground border border-border shadow-md'
                                : 'bg-secondary text-foreground/80 hover:bg-secondary'
                            }`}
                          >
                            {display}
                            {isSelected && (
                              <span className="ml-1.5 opacity-90">
                                {count} · {formatExact(filteredVolume, 2)} л · {formatExact(filteredRevenue, 2)} ₽
                              </span>
                            )}
                          </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Итоговая карточка */}
            <div className="space-y-2">
              <div className="flex items-center px-2">
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'} mr-4`}>Итого</h3>
                {!isMobile && (
                  <span className="text-sm">
                    {(() => {
                      const selectedFuels = Array.from(selectedKpiFuels);
                      const selectedPayments = Array.from(selectedKpiPayments).map(method =>
                        normalizePaymentMethod(method));

                      const allSelected = [...selectedFuels, ...selectedPayments];

                      if (allSelected.length === 0) {
                        return <span className="text-muted-foreground">не выбрано</span>;
                      } else {
                        return (
                          <span>
                            <span className="text-muted-foreground">выбрано: </span>
                            <span className="text-primary dark:text-primary/70 font-bold">{allSelected.join(', ')}</span>
                          </span>
                        );
                      }
                    })()}
                  </span>
                )}
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {(() => {
                    const { count: totalCount, volume: totalVolume, revenue: totalRevenue } = totalKpis;

                    const hasActiveFilters = selectedKpiFuels.size > 0 || selectedKpiPayments.size > 0;
                    return (
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          hasActiveFilters
                            ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                            : 'bg-card border-border hover:bg-secondary'
                        }`}
                        onClick={hasActiveFilters ? handleKpiResetAll : undefined}
                      >
                        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                          {isMobile ? (
                            <div className="relative">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <p className="text-foreground font-semibold text-xs truncate">Итого</p>
                                  <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-foreground text-xs font-medium">{totalCount}</span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="text-foreground text-xs font-semibold">{formatExact(totalVolume)} л</div>
                                  <div className="text-foreground text-xs font-semibold">{formatExact(totalRevenue)} ₽</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground font-semibold text-base truncate pr-2">Итого</p>
                                <div className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-foreground/80 text-sm">{totalCount}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-foreground text-sm font-semibold">{formatExact(totalVolume)} л</div>
                                <div className="text-foreground text-sm font-semibold">{formatExact(totalRevenue)} ₽</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
              </div>
            </div>
          </div>
        )}

        {/* Ошибка загрузки STS */}
        {stsError && !loadingFromSTS && (
          <Card className="bg-red-950/50 border border-red-800/50 rounded-lg">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-300 text-sm">{stsError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-900/50 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Повторить
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Переключатель представления: плоский список ↔ сводная с группировками */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
          {([['list', 'Список'], ['pivot', 'Сводная']] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                viewMode === mode ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'pivot' && (
          <PivotTable
            leaves={pivotData?.rows || []}
            serverDims={pivotData?.dims || []}
            dims={pivotDims}
            onDimsChange={setPivotDims}
            sortBy={pivotSortBy}
            onSortByChange={setPivotSortBy}
            labeler={pivotLabeler}
            loading={pivotLoading}
            truncated={pivotData?.truncated}
            error={pivotError}
            isMobile={isMobile}
          />
        )}

        {/* Таблица № */}
        {viewMode === 'list' && !loading && !loadingFromSTS && (
          <Card className={`bg-card rounded-xl border border-border ${isMobile ? 'mx-0 mt-1' : ''}`}>
            <CardHeader className={`${isMobile ? 'px-3 py-1.5' : 'pb-2'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
                    <FileText className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    Операции
                  </CardTitle>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                    {isMobile
                      ? <>Показано {paginatedOperations.length} из {serverTotal}{totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}</>
                      : <>Всего операций: {serverTotal}</>
                    }
                  </p>
                </div>


              {/* Пагинация только на мобильном — десктоп использует виртуализированный скролл */}
            </div>
          </CardHeader>
          <CardContent className={isMobile ? 'px-0 pb-3' : 'p-0'}>
            {isMobile ? (
              // Mobile compact table layout
              <div>
                <div className="bg-card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary text-foreground/80 border-b border-border">
                        <th className="px-2 py-2 text-left font-medium">ID</th>
                        <th className="px-2 py-2 text-left font-medium">Топливо</th>
                        <th className="px-2 py-2 text-right font-medium">Кол-во</th>
                        <th className="px-2 py-2 text-right font-medium">Сумма</th>
                        <th className="px-2 py-2 text-center font-medium">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOperations.map((record, index) => (
                        <tr
                          key={record.id}
                          className={`hover:bg-secondary cursor-pointer transition-colors border-b border-border ${index % 2 === 0 ? 'bg-card' : 'bg-secondary'}`}
                          onClick={() => {
                            setSelectedOperation(record);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <span className="text-foreground font-mono text-xs truncate" title={record.id}>
                                {record.id.slice(-8)}
                              </span>
                              <div className="mt-0.5">
                                {getCompactStatusBadge(record.status)}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            {record.fuelType ? (
                              <Badge variant="outline" className="bg-secondary text-foreground border-border">
                                {record.fuelType}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-2 text-foreground text-right font-mono">
                            {record.actualQuantity ? `${formatExact(record.actualQuantity)}л` :
                             record.quantity ? `${formatExact(record.quantity)}л` : '-'}
                          </td>
                          <td className="px-2 py-2 text-foreground text-right font-mono font-bold">
                            {record.actualAmount ? `${formatExact(record.actualAmount)}₽` :
                             record.totalCost ? `${formatExact(record.totalCost)}₽` : '-'}
                          </td>
                          <td className="px-2 py-2 text-center text-foreground text-xs">
                            {(() => {
                              try {
                                const dateStr = record.timestamp || record.createdAt || record.startTime || record.date;
                                if (!dateStr) return '--';
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return '--';
                                return date.toLocaleDateString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit'
                                });
                              } catch (error) {
                                return '--';
                              }
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedOperations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isBusy ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Загрузка операций...</span>
                      </div>
                    ) : (
                      'Нет операций по выбранным фильтрам'
                    )}
                  </div>
                )}

                {isMobile && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}

                    >
                      ←
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}

                    >
                      →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
            // Desktop: Виртуализированная таблица для оптимальной производительности
            <div>
              {filteredOperations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isBusy ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Загрузка операций...</span>
                    </div>
                  ) : (
                    'Нет операций по выбранным фильтрам'
                  )}
                </div>
              ) : (
                <>
                  <VirtualizedOperationsTable
                    operations={filteredOperations}
                    onRowClick={(operation) => {
                      setSelectedOperation(operation);
                      setIsDetailsOpen(true);
                    }}
                  />
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        ←
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Модальное окно с деталями операции */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-sm mx-auto bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">
              Операция #{selectedOperation?.id?.slice(-8)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {selectedNetwork?.name || 'Сеть'}{selectedOperation?.stationNumber ? ` • АЗС ${selectedOperation.stationNumber}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Статус:</span>
                  <div>{getStatusBadge(selectedOperation.status)}</div>
                </div>


                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Время начала:</span>
                  <span className="text-foreground font-mono text-xs">
                    {new Date(selectedOperation.startTime).toLocaleString('ru-RU')}
                  </span>
                </div>


                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Вид топлива:</span>
                  <span className="text-foreground font-medium">{selectedOperation.fuelType || '-'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Количество:</span>
                  <span className="text-foreground font-mono font-bold">
                    {selectedOperation.actualQuantity ? `${selectedOperation.actualQuantity.toFixed(2)} л` :
                     selectedOperation.quantity ? `${selectedOperation.quantity.toFixed(2)} л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Цена за литр:</span>
                  <span className="text-foreground font-mono">
                    {selectedOperation.price ? `${selectedOperation.price.toFixed(2)} ₽/л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border bg-secondary px-2 -mx-2 rounded">
                  <span className="text-foreground/80 font-medium">Общая сумма:</span>
                  <span className="text-foreground font-mono font-bold text-lg">
                    {selectedOperation.actualAmount ? `${selectedOperation.actualAmount.toFixed(2)} ₽` :
                     selectedOperation.totalCost ? `${selectedOperation.totalCost.toFixed(2)} ₽` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Способ оплаты:</span>
                  <span className="text-foreground font-medium">
                    {normalizePaymentMethod(selectedOperation.paymentMethod)}
                  </span>
                </div>

                {normalizePaymentMethod(selectedOperation.paymentMethod) === 'Купон' &&
                 selectedOperation.cardNumber && selectedOperation.cardNumber !== '-' && (
                  <>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Номер купона:</span>
                      <span className="text-foreground font-mono font-bold">{selectedOperation.cardNumber}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Купон выдан:</span>
                      <span className={`font-mono text-xs ${couponIssuedAt ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {couponIssuedAt ? new Date(couponIssuedAt).toLocaleString('ru-RU') : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Купон реализован:</span>
                      <span className="text-foreground font-mono text-xs">
                        {new Date(selectedOperation.startTime).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </>
                )}

                {selectedOperation.posNumber && selectedOperation.posNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер POS:</span>
                    <span className="text-foreground font-mono">{selectedOperation.posNumber}</span>
                  </div>
                )}


                {selectedOperation.nozzleNumber && selectedOperation.nozzleNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер пистолета:</span>
                    <span className="text-foreground font-mono">{selectedOperation.nozzleNumber}</span>
                  </div>
                )}

                {selectedOperation.tankNumber && selectedOperation.tankNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер резервуара:</span>
                    <span className="text-foreground font-mono">{selectedOperation.tankNumber}</span>
                  </div>
                )}

                {selectedOperation.shiftNumber && selectedOperation.shiftNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер смены:</span>
                    <span className="text-foreground font-mono">{selectedOperation.shiftNumber}</span>
                  </div>
                )}

                {selectedOperation.receiptNumber && selectedOperation.receiptNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер чека:</span>
                    <span className="text-foreground font-mono">{selectedOperation.receiptNumber}</span>
                  </div>
                )}

                {selectedOperation.orderedQuantity > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Заказ (литры):</span>
                    <span className="text-foreground font-mono">{selectedOperation.orderedQuantity.toFixed(2)} л</span>
                  </div>
                )}

                {selectedOperation.orderedAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Заказ (сумма):</span>
                    <span className="text-foreground font-mono">{selectedOperation.orderedAmount.toFixed(2)} ₽</span>
                  </div>
                )}

                {selectedOperation.operationType && selectedOperation.operationType !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Тип операции:</span>
                    <span className="text-foreground font-medium">{selectedOperation.operationType}</span>
                  </div>
                )}


                {selectedOperation.isFromStsApi && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Источник данных:</span>
                    <Badge variant="outline" className="bg-primary/10 dark:bg-blue-900 text-primary dark:text-blue-300 border-primary">
                      STS API
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between py-2 text-xs">
                  <span className="text-muted-foreground">ID операции:</span>
                  <span className="text-muted-foreground font-mono">{selectedOperation.id}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
