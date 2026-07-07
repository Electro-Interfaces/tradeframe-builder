import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Download, Loader2, RefreshCw, Activity, Filter, ChevronDown, ChevronRight, FileText, FileSpreadsheet, AlertTriangle, BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChartSkeleton, HeatmapSkeleton } from "@/components/ui/chart-skeleton";
import { DailySalesChart } from "@/components/charts/DailySalesChart";
import { FuelPerformanceChart } from "@/components/charts/FuelPerformanceChart";
import { PaymentDistributionChart } from "@/components/charts/PaymentDistributionChart";
import { HourlyActivityChart } from "@/components/charts/HourlyActivityChart";
import { StationRevenueChart } from "@/components/charts/StationRevenueChart";
import { StationFuelSalesChart } from "@/components/charts/StationFuelSalesChart";
import { StationRevenueTrendChart } from "@/components/charts/StationRevenueTrendChart";
import { PeriodComparison } from "@/components/charts/PeriodComparison";
import { AverageCheckTrend } from "@/components/charts/AverageCheckTrend";
import { WeekdayPattern } from "@/components/charts/WeekdayPattern";
import { CashlessShareTrend } from "@/components/charts/CashlessShareTrend";
import { stsApiService } from "@/services/sts";
import { useSelection } from "@/contexts/SelectionContext";
import { classifyPayment } from "@/utils/paymentUtils";
import {
  fetchDetailedAnalytics,
  fetchOverview,
  type DetailedAnalyticsResponse,
  type OverviewResponse,
  type OverviewDay,
} from "@/services/analyticsService";
import { todayString, monthsAgoString } from "@/utils/dateUtils";

import { useNetworkOverviewData } from "./hooks/useNetworkOverviewData";
import { useNetworkOverviewStats } from "./hooks/useNetworkOverviewStats";
import { useNetworkOverviewAnalytics } from "./hooks/useNetworkOverviewAnalytics";
import { exportToExcel, exportDashboardToPdf } from "./components/NetworkOverviewExport";
import { OverviewKPICards } from "./components/OverviewKPICards";
import { OverviewTables } from "./components/OverviewTables";

export function NetworkOverview() {
  const isMobile = useIsMobile();

  // Раскрытие расширенной аналитики (графики на серверных агрегатах) + ленивый
  // экспорт: сырьё STS грузим ТОЛЬКО для экспорта, по явному клику пользователя.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportPending, setExportPending] = useState<null | 'excel' | 'pdf'>(null);
  // Раньше расширенная аналитика тоже тянула сырьё; теперь она на агрегатах,
  // поэтому сырьё нужно исключительно экспорту.
  const rawEnabled = exportPending !== null;

  // Сырьё STS тянется лениво (enabled=rawEnabled). Расширенная аналитика его НЕ трогает.
  const data = useNetworkOverviewData(rawEnabled);

  // Выбранные сети — для серверных агрегатов расширенной аналитики.
  const { selectedNetworkIds } = useSelection();

  // Основной блок — из готовых серверных агрегатов (мгновенно).
  const analytics = useNetworkOverviewAnalytics({
    dateFrom: data.dateFrom,
    dateTo: data.dateTo,
  });

  // Детальная статистика из сырья — для расширенного блока и экспорта.
  const stats = useNetworkOverviewStats({
    transactions: data.transactions,
    dateFrom: data.dateFrom,
    dateTo: data.dateTo,
    allowedStationNumbers: data.allowedStationNumbers,
    selectedNetwork: data.selectedNetwork,
  });

  const {
    selectedNetwork,
    selectedTradingPoint,
    isAllTradingPoints,

    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtersOpen,
    setFiltersOpen,

    transactions,
    prevPeriodTransactions,
    missingDays,
    loading,
    hasLoadedRaw,
    stsApiConfigured,
    setStsApiConfigured,
    initializing,
    setInitializing,
    exportingPdf,
    setExportingPdf,

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

    dailySalesCardRef,
    heatmapCardRef,
    activityCardRef,
    comparisonCardRef,

    handleManualRefresh,
    toast,
  } = data;

  // Показ основного блока — при наличии серверных агрегатов.
  const showMain = !initializing && !!selectedNetwork && analytics.hasData;
  const mainBusy = analytics.loading || analytics.isPending;

  // ── Расширенная аналитика на серверных агрегатах (без сырья STS) ───────────
  // detailed: станция×топливо / станция×день / день×оплата. prevOverview:
  // агрегаты прошлого периода той же длины — для «Сравнения периодов».
  const [detailed, setDetailed] = useState<DetailedAnalyticsResponse | null>(null);
  const [prevOverview, setPrevOverview] = useState<OverviewResponse | null>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const detailedRequestIdRef = useRef(0);

  const loadDetailed = useCallback(async () => {
    if (!selectedNetworkIds || selectedNetworkIds.length === 0) return;
    const reqId = ++detailedRequestIdRef.current;
    setDetailedLoading(true);
    setDetailedError(null);

    // Предыдущий период той же длины: prevTo = dateFrom − 1 день,
    // prevFrom = prevTo − длина периода (совпадает с логикой сырья и подзаголовком
    // «Сравнения периодов»).
    const fromMs = new Date(data.dateFrom).getTime();
    const toMs = new Date(data.dateTo).getTime();
    const periodMs = toMs - fromMs;
    const prevTo = new Date(fromMs - 86400000);
    const prevFrom = new Date(prevTo.getTime() - periodMs);
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    const stations = analytics.selectedStationCodes;
    try {
      const [det, prev] = await Promise.all([
        fetchDetailedAnalytics({ networkIds: selectedNetworkIds, from: data.dateFrom, to: data.dateTo, stations }),
        fetchOverview({ networkIds: selectedNetworkIds, from: prevFromStr, to: prevToStr, stations }).catch(() => null),
      ]);
      if (reqId !== detailedRequestIdRef.current) return;
      setDetailed(det);
      setPrevOverview(prev);
    } catch (e: any) {
      if (reqId !== detailedRequestIdRef.current) return;
      setDetailedError(e?.message || 'Не удалось загрузить детальную аналитику');
      setDetailed(null);
      setPrevOverview(null);
    } finally {
      if (reqId === detailedRequestIdRef.current) setDetailedLoading(false);
    }
  }, [selectedNetworkIds, data.dateFrom, data.dateTo, analytics.selectedStationCodes]);

  // Грузим агрегаты при раскрытии расширенной аналитики и перегружаем при смене
  // периода/сети (loadDetailed меняет идентичность). Пока блок свёрнут — не грузим.
  useEffect(() => {
    if (!showAdvanced) return;
    loadDetailed();
  }, [showAdvanced, loadDetailed]);

  // Дневной агрегат «частных» операций для «Среднего чека» — из byDayPayment.
  // Частные = ВСЕ методы, КРОМЕ исключаемых прежним isRetail: fuel_card /
  // corporate / coupon (тот же classifyPayment, что был в старой версии графика,
  // — список исключений совпадает). Средний чек дня компонент считает как
  // retailRevenue / retailOperations.
  const retailByDay = useMemo<OverviewDay[]>(() => {
    const rows = detailed?.byDayPayment;
    if (!rows || rows.length === 0) return [];
    const pad = (n: number) => String(n).padStart(2, '0');
    const byDay = new Map<string, { operations: number; revenue: number }>();
    for (const r of rows) {
      const cat = classifyPayment(r.method || '');
      if (cat === 'fuel_card' || cat === 'corporate' || cat === 'coupon') continue; // корп/талоны/купоны
      const d = new Date(r.date);
      if (isNaN(d.getTime())) continue;
      // День в локальной зоне — как в остальных графиках страницы.
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const e = byDay.get(key);
      if (e) { e.operations += r.operations; e.revenue += r.revenue; }
      else byDay.set(key, { operations: r.operations, revenue: r.revenue });
    }
    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, operations: v.operations, revenue: v.revenue, volume: 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [detailed]);

  // Функция для вибрации на поддерживаемых устройствах
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(50);
    }
  };

  // Плавное обновление расстояния с throttling через RAF
  const updatePullDistance = (distance: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const clampedDistance = Math.min(distance, MAX_PULL_DISTANCE);
      setPullDistance(clampedDistance);

      if (clampedDistance >= PULL_THRESHOLD && pullState !== 'canRefresh' && pullState !== 'refreshing') {
        setPullState('canRefresh');
        triggerHapticFeedback();
      } else if (clampedDistance < PULL_THRESHOLD && pullState === 'canRefresh') {
        setPullState('pulling');
      }
    });
  };

  const resetPull = () => {
    setPullState('idle');
    setPullDistance(0);
    startTouchRef.current = null;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    startTouchRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
    setPullState('pulling');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !startTouchRef.current || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startTouchRef.current.y;

    if (deltaY > 0 && container.scrollTop === 0) {
      e.preventDefault();

      const elasticity = Math.max(0.5, 1 - (deltaY / MAX_PULL_DISTANCE) * 0.5);
      const adjustedDistance = deltaY * elasticity;

      updatePullDistance(adjustedDistance);
    } else if (deltaY <= 0 || container.scrollTop > 0) {
      resetPull();
    }
  };

  // Обновление: принудительный досинк + перечитать агрегаты (и сырьё, если оно загружено).
  const handleCombinedRefresh = async () => {
    if (!selectedNetwork) return;
    await analytics.refresh();
    if (rawEnabled) handleManualRefresh();
  };

  const handleTouchEnd = async () => {
    if (!isMobile || !startTouchRef.current) return;

    const shouldRefresh = pullState === 'canRefresh';

    if (shouldRefresh) {
      setPullState('refreshing');
      triggerHapticFeedback();

      try {
        await handleCombinedRefresh();
      } finally {
        setTimeout(() => {
          resetPull();
        }, 300);
      }
    } else {
      resetPull();
    }
  };

  // Export runners. Агрегатные показатели берём из адаптера (совпадают с экраном),
  // сырьё (filteredTransactions/сравнение) и связка «оплата×топливо» — из stats.
  const runExportExcel = () => {
    exportToExcel({
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      totalRevenue: analytics.totalRevenue,
      totalVolume: analytics.totalVolume,
      averageCheck: analytics.averageCheck,
      filteredTransactions: stats.filteredTransactions,
      fuelTypeStats: analytics.fuelTypeStats,
      paymentTypeStats: stats.paymentTypeStats,
      paymentFuelBreakdown: stats.paymentFuelBreakdown,
      dailyActivityData: analytics.dailyActivityData,
      dailySalesData: analytics.dailySalesData,
      heatmapData: analytics.heatmapData,
      toast,
    });
  };

  const runExportPdf = () => {
    exportDashboardToPdf({
      initializing,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions: stats.filteredTransactions,
      completedTransactions: stats.completedTransactions,
      prevPeriodTransactions,
      totalRevenue: analytics.totalRevenue,
      totalVolume: analytics.totalVolume,
      averageCheck: analytics.averageCheck,
      fuelTypeStats: analytics.fuelTypeStats,
      paymentTypeStats: analytics.paymentTypeStats,
      dateFrom,
      dateTo,
      loading,
      exportingPdf,
      setExportingPdf,
      dailySalesCardRef,
      heatmapCardRef,
      activityCardRef,
      comparisonCardRef,
      toast,
    });
  };

  // Export handlers: если сырьё ещё не загружено — сначала ленивая загрузка,
  // затем экспорт выполнит эффект ниже (когда данные будут готовы).
  const handleExportExcel = () => {
    if (!hasLoadedRaw) {
      setExportPending('excel');
      return;
    }
    runExportExcel();
  };

  const handleExportPdf = () => {
    if (!hasLoadedRaw) {
      // PDF захватывает DOM блока сравнения — раскрываем расширенную аналитику,
      // чтобы соответствующие карточки отрисовались.
      setShowAdvanced(true);
      setExportPending('pdf');
      return;
    }
    runExportPdf();
  };

  // Досрочный запуск экспорта после ленивой загрузки сырья.
  useEffect(() => {
    if (!exportPending) return;
    if (!hasLoadedRaw || loading) return;
    // Небольшая задержка — дать transition разложить транзакции и DOM отрисоваться.
    const t = setTimeout(() => {
      if (exportPending === 'excel') runExportExcel();
      else runExportPdf();
      setExportPending(null);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportPending, hasLoadedRaw, loading, transactions, prevPeriodTransactions]);

  const exportBusy = exportingPdf || exportPending !== null;

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-x-hidden ${isMobile ? 'pt-4' : 'pt-6'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        {/* Баннер неполноты: STS не отдал часть дней (стойкий 500 на его стороне) */}
        {missingDays > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Данные за {missingDays} дн. периода временно недоступны на стороне АЗС-сервера — показатели ниже
              рассчитаны по доступным дням. Попробуйте обновить позже.
            </span>
          </div>
        )}
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Обзор сети</h1>
            <div className="flex items-center gap-2">
              {!initializing && selectedNetwork && analytics.hasData && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exportBusy}
                    >
                      {exportBusy ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Экспорт
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-xl rounded-lg">
                    <DropdownMenuItem onClick={handleExportExcel} disabled={exportBusy} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium">Экспорт в Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf} disabled={exportBusy} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">{exportingPdf ? 'PDF…' : 'Экспорт в PDF'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">

        {/* Фильтры - только если выбрана сеть */}
        {!initializing && selectedNetwork && (
          <Card className="bg-card border-border mb-6">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Фильтры</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateFrom(monthsAgoString(1));
                        setDateTo(todayString());
                      }}
                    >
                      Очистить фильтры
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCombinedRefresh();
                      }}
                      disabled={mainBusy}

                    >
                      <RefreshCw className={`w-4 h-4 ${mainBusy ? 'animate-spin' : ''}`} />
                    </Button>
                    {filtersOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Дата начала */}
                    <div>
                      <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">Дата от</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Дата окончания */}
                    <div>
                      <Label htmlFor="dateTo" className="text-xs text-muted-foreground">Дата до</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Средние значения - сразу после фильтров */}
        {showMain && (
          <OverviewKPICards
            isMobile={isMobile}
            averageCheck={analytics.averageCheck}
            totalVolume={analytics.totalVolume}
            filteredTransactionsCount={analytics.operationsCount}
            dateFrom={dateFrom}
            dateTo={dateTo}
            fuelTypeStats={analytics.fuelTypeStats}
          />
        )}

        {/* KPI блок с таблицами */}
        {showMain && (
          <OverviewTables
            isMobile={isMobile}
            fuelTypeStats={analytics.fuelTypeStats}
            paymentTypeStats={analytics.paymentTypeStats}
            totalRevenue={analytics.totalRevenue}
            totalVolume={analytics.totalVolume}
            filteredTransactionsCount={analytics.operationsCount}
          />
        )}

        {/* График реализации по дням с разбивкой по топливу */}
        {showMain && analytics.dailySalesData.data.length > 0 && (
          <div ref={dailySalesCardRef} className="w-full">
            <DailySalesChart
              data={analytics.dailySalesData.data}
              fuelTypes={analytics.dailySalesData.fuelTypes}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Производительность по топливу, Распределение оплат и Суточная активность */}
        {showMain && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
              {/* График производительности по видам топлива */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <FuelPerformanceChart
                  data={analytics.fuelTypeStats.map(fuel => ({
                    type: fuel.type,
                    operations: fuel.operations,
                    revenue: fuel.revenue,
                    volume: fuel.volume,
                    avgCheck: fuel.operations > 0 ? fuel.revenue / fuel.operations : 0,
                    share: analytics.totalRevenue > 0 ? (fuel.revenue / analytics.totalRevenue) * 100 : 0
                  }))}
                  isMobile={isMobile}
                />
              </div>

              {/* График распределения способов оплаты */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <PaymentDistributionChart
                  data={analytics.paymentTypeStats.map(payment => {
                    const typeLower = payment.type.toLowerCase();
                    let paymentType = 'other';
                    if (typeLower.includes('наличн')) paymentType = 'cash';
                    else if (typeLower.includes('карт') || typeLower.includes('банк')) paymentType = 'bank_card';
                    else if (typeLower.includes('онлайн') || typeLower.includes('мобильн')) paymentType = 'online_order';
                    else if (typeLower.includes('топливн')) paymentType = 'fuel_card';

                    return {
                      type: paymentType,
                      displayName: payment.type,
                      operations: payment.operations,
                      revenue: payment.revenue,
                      volume: payment.volume,
                      avgCheck: payment.operations > 0 ? payment.revenue / payment.operations : 0,
                      share: analytics.totalRevenue > 0 ? (payment.revenue / analytics.totalRevenue) * 100 : 0
                    };
                  })}
                  isMobile={isMobile}
                />
              </div>

              {/* График суточной активности по часам */}
              <div ref={activityCardRef} className="w-full lg:col-span-2 lg:h-full">
                <HourlyActivityChart
                  data={analytics.dailyActivityData}
                  isMobile={isMobile}
                />
              </div>
          </div>
        )}

        {/* Кнопка раскрытия расширенной аналитики (графики на серверных агрегатах) */}
        {showMain && (
          <div className="w-full">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full sm:w-auto"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Скрыть расширенную аналитику' : 'Показать расширенную аналитику'}
              {showAdvanced ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        )}

        {/* Расширенная аналитика — готовые серверные агрегаты, без загрузки сырья STS */}
        {showMain && showAdvanced && (
          <div className="w-full space-y-6">
            {detailedError && (
              <div className="bg-card border border-red-600/50 rounded-lg p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-600 dark:text-red-300 text-sm">{detailedError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDetailed()}
                  className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-900/20 flex-shrink-0"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Повторить
                </Button>
              </div>
            )}

            {/* Сравнение станций - только если данные по ВСЕЙ сети */}
            {isAllTradingPoints && (analytics.overview?.byStation?.length ?? 0) > 0 && (
              <>
                {/* Заголовок секции */}
                <div className="w-full">
                  <h2 className={`font-bold text-foreground flex items-center ${isMobile ? 'text-lg mb-1 gap-1.5' : 'text-2xl mb-2 gap-2'}`}>
                    <span className={isMobile ? 'text-lg' : 'text-2xl'}>📊</span>
                    {isMobile ? 'Сравнение станций' : 'Сравнение работы станций'}
                  </h2>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-4' : 'text-sm mb-6'}`}>
                    Аналитика и сравнительные показатели по всем АЗС сети
                  </p>
                </div>

                {/* График 1: Выручка по станциям (byStation из overview — доступен сразу) */}
                <StationRevenueChart
                  stations={analytics.overview!.byStation}
                  className="w-full"
                  isMobile={isMobile}
                />

                {/* Графики 2 и 3 — детальные агрегаты (станция×топливо, станция×день) */}
                {detailed ? (
                  <div className={`w-full grid grid-cols-1 ${isMobile ? 'gap-4' : 'xl:grid-cols-2 gap-6'}`}>
                    {/* График 2: Продажи по видам топлива */}
                    <StationFuelSalesChart
                      data={detailed.byStationFuel}
                      className="w-full"
                      isMobile={isMobile}
                    />

                    {/* График 3: Динамика выручки */}
                    <StationRevenueTrendChart
                      data={detailed.byStationDay}
                      className="w-full"
                      isMobile={isMobile}
                    />
                  </div>
                ) : detailedLoading ? (
                  <div className="bg-card border border-border rounded-lg p-8 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Загружаем детальную аналитику по станциям…</p>
                  </div>
                ) : null}
              </>
            )}

            {/* Сравнение периодов + Динамика среднего чека + паттерны */}
            <div ref={comparisonCardRef} className="w-full space-y-6">
              <PeriodComparison
                currentPeriod={analytics.overview
                  ? { kpi: analytics.overview.kpi, byDay: analytics.overview.byDay }
                  : { kpi: { operations: 0, volume: 0, revenue: 0, avgCheck: 0 }, byDay: [] }}
                previousPeriod={prevOverview
                  ? { kpi: prevOverview.kpi, byDay: prevOverview.byDay }
                  : null}
                dateFrom={dateFrom}
                dateTo={dateTo}
                className="w-full"
              />
              <AverageCheckTrend
                days={retailByDay}
                className="w-full"
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <WeekdayPattern days={analytics.overview?.byDay ?? []} />
                <CashlessShareTrend dayPayments={detailed?.byDayPayment ?? []} />
              </div>
            </div>
          </div>
        )}

        {/* Экран инициализации */}
        {initializing && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Инициализация</h3>
            <p className="text-muted-foreground">Загружаем конфигурацию и данные...</p>
          </div>
        )}

        {/* Сообщение о выборе сети */}
        {!initializing && !selectedNetwork && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-muted-foreground text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Выберите сеть для просмотра отчетов</h3>
            <p className="text-muted-foreground">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
          </div>
        )}

        {/* Ошибка загрузки серверной аналитики */}
        {!initializing && selectedNetwork && stsApiConfigured && analytics.error && !mainBusy && (
          <div className="bg-card border border-red-600/50 rounded-lg p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-300 text-sm">{analytics.error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analytics.reload()}
              className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-900/20 flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Повторить
            </Button>
          </div>
        )}

        {/* Состояние загрузки с skeleton loaders */}
        {!initializing && selectedNetwork && stsApiConfigured && mainBusy && !analytics.hasData && (
          <div className="space-y-6">
            <ChartSkeleton height="h-80" isMobile={isMobile} showLegend={true} />
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              <HeatmapSkeleton isMobile={isMobile} />
              <ChartSkeleton height="h-80" isMobile={isMobile} />
            </div>
            <ChartSkeleton height={isMobile ? "h-64" : "h-80"} isMobile={isMobile} showLegend={true} />
          </div>
        )}

        {/* Сообщение об отсутствии данных */}
        {!initializing && selectedNetwork && stsApiConfigured && !mainBusy && !analytics.hasData && !analytics.error && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Нет данных за выбранный период</h3>
            <p className="text-muted-foreground mb-4">Измените диапазон дат или нажмите кнопку "Обновить данные" для загрузки актуальной информации.</p>
            <Button
              onClick={() => analytics.refresh()}
              className="bg-primary hover:bg-primary/80 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить данные
            </Button>
          </div>
        )}

        {/* Сообщение о необходимости настройки STS API */}
        {!initializing && selectedNetwork && !stsApiConfigured && (
          <div className="bg-card border border-orange-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-foreground text-2xl">⚙️</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Требуется настройка STS API</h3>
            <p className="text-muted-foreground mb-4">Эта страница работает только с данными из STS API. Для отображения аналитики необходимо настроить подключение к API.</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.location.href = '/settings/sts-api'}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Перейти к настройкам API
              </Button>
              <Button
                onClick={async () => {
                  setInitializing(true);

                  setTimeout(() => {
                    const isConfigured = stsApiService.isConfigured();
                    setStsApiConfigured(isConfigured);
                    setInitializing(false);

                    if (isConfigured) {
                      analytics.reload();
                    } else {
                      toast({
                        title: "Настройки не найдены",
                        description: "STS API все еще не настроен",
                        variant: "destructive",
                      });
                    }
                  }, 1000);
                }}
                variant="outline"
                className="border-primary text-primary dark:text-primary/70 hover:bg-primary/80/20"
              >
                🔄 Перепроверить настройки
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}

export default NetworkOverview;
