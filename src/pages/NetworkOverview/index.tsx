import React, { useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Download, Loader2, RefreshCw, Activity, Filter, ChevronDown, ChevronRight, FileText, FileSpreadsheet } from "lucide-react";
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
import { stsApiService } from "@/services/stsApi";
import { todayString, monthsAgoString } from "@/utils/dateUtils";

import { useNetworkOverviewData } from "./hooks/useNetworkOverviewData";
import { useNetworkOverviewStats } from "./hooks/useNetworkOverviewStats";
import { exportToExcel, exportDashboardToPdf } from "./components/NetworkOverviewExport";
import { OverviewKPICards } from "./components/OverviewKPICards";
import { OverviewTables } from "./components/OverviewTables";

export function NetworkOverview() {
  const isMobile = useIsMobile();

  const data = useNetworkOverviewData();

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
    loading,
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

    loadTransactions,
    handleManualRefresh,
    handleRefreshData,
    toast,
  } = data;

  const {
    completedTransactions,
    filteredTransactions,
    totalRevenue,
    totalVolume,
    averageCheck,
    fuelTypeStats,
    paymentTypeStats,
    paymentFuelBreakdown,
    dailyActivityData,
    dailySalesData,
    heatmapData,
  } = stats;

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

  const handleTouchEnd = async () => {
    if (!isMobile || !startTouchRef.current) return;

    const shouldRefresh = pullState === 'canRefresh';

    if (shouldRefresh) {
      setPullState('refreshing');
      triggerHapticFeedback();

      try {
        await handleRefreshData();
      } finally {
        setTimeout(() => {
          resetPull();
        }, 300);
      }
    } else {
      resetPull();
    }
  };

  // Добавляем обработчики touch событий
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

  }, []);

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel({
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      totalRevenue,
      totalVolume,
      averageCheck,
      filteredTransactions,
      fuelTypeStats,
      paymentTypeStats,
      paymentFuelBreakdown,
      dailyActivityData,
      dailySalesData,
      heatmapData,
      toast,
    });
  };

  const handleExportPdf = () => {
    exportDashboardToPdf({
      initializing,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions,
      completedTransactions,
      prevPeriodTransactions,
      totalRevenue,
      totalVolume,
      averageCheck,
      fuelTypeStats,
      paymentTypeStats,
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
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Обзор сети</h1>
            <div className="flex items-center gap-2">
              {!initializing && selectedNetwork && filteredTransactions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Экспорт
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-xl rounded-lg">
                    <DropdownMenuItem onClick={handleExportExcel} disabled={loading || exportingPdf} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium">Экспорт в Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf} disabled={loading || exportingPdf} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">{exportingPdf ? 'PDF\u2026' : 'Экспорт в PDF'}</span>
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
                        handleManualRefresh();
                      }}
                      disabled={loading}
                      
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <OverviewKPICards
            isMobile={isMobile}
            averageCheck={averageCheck}
            totalVolume={totalVolume}
            filteredTransactionsCount={filteredTransactions.length}
            dateFrom={dateFrom}
            dateTo={dateTo}
            fuelTypeStats={fuelTypeStats}
          />
        )}

        {/* KPI блок с таблицами */}
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <OverviewTables
            isMobile={isMobile}
            fuelTypeStats={fuelTypeStats}
            paymentTypeStats={paymentTypeStats}
            totalRevenue={totalRevenue}
            totalVolume={totalVolume}
            filteredTransactionsCount={filteredTransactions.length}
          />
        )}



        {/* График реализации по дням с разбивкой по топливу - Оптимизированный */}
        {!initializing && !loading && selectedNetwork && transactions.length > 0 && (
          <div ref={dailySalesCardRef} className="w-full">
            <DailySalesChart
              data={dailySalesData.data}
              fuelTypes={dailySalesData.fuelTypes}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Производительность по топливу, Распределение оплат и Суточная активность */}
        {!initializing && !loading && selectedNetwork && transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
              {/* График производительности по видам топлива */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <FuelPerformanceChart
                  data={fuelTypeStats.map(fuel => ({
                    type: fuel.type,
                    operations: fuel.operations,
                    revenue: fuel.revenue,
                    volume: fuel.volume,
                    avgCheck: fuel.operations > 0 ? fuel.revenue / fuel.operations : 0,
                    share: totalRevenue > 0 ? (fuel.revenue / totalRevenue) * 100 : 0
                  }))}
                  isMobile={isMobile}
                />
              </div>

              {/* График распределения способов оплаты */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <PaymentDistributionChart
                  data={paymentTypeStats.map(payment => {
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
                      share: totalRevenue > 0 ? (payment.revenue / totalRevenue) * 100 : 0
                    };
                  })}
                  isMobile={isMobile}
                />
              </div>

              {/* График суточной активности по часам */}
              <div ref={activityCardRef} className="w-full lg:col-span-2 lg:h-full">
                <HourlyActivityChart
                  data={dailyActivityData}
                  isMobile={isMobile}
                />
              </div>
          </div>
        )}

        {/* Сравнение станций - только если данные по ВСЕЙ сети */}
        {!initializing && !loading && selectedNetwork && stsApiConfigured && transactions.length > 0 && isAllTradingPoints && (
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

            {/* График 1: Выручка по станциям */}
            <StationRevenueChart
              transactions={filteredTransactions}
              className="w-full"
              isMobile={isMobile}
            />

            {/* График 2 и 3: В две колонки на больших экранах, стек на мобильных */}
            <div className={`w-full grid grid-cols-1 ${isMobile ? 'gap-4' : 'xl:grid-cols-2 gap-6'}`}>
              {/* График 2: Продажи по видам топлива */}
              <StationFuelSalesChart
                transactions={filteredTransactions}
                className="w-full"
                isMobile={isMobile}
              />

              {/* График 3: Динамика выручки */}
              <StationRevenueTrendChart
                transactions={filteredTransactions}
                className="w-full"
                isMobile={isMobile}
              />
            </div>

          </>
        )}

        {/* Сравнение периодов + Динамика среднего чека */}
        {!initializing && !loading && selectedNetwork && stsApiConfigured && transactions.length > 0 && (
          <div ref={comparisonCardRef} className="w-full space-y-6">
            <PeriodComparison
              currentTransactions={completedTransactions}
              previousTransactions={prevPeriodTransactions}
              dateFrom={dateFrom}
              dateTo={dateTo}
              className="w-full"
            />
            <AverageCheckTrend
              transactions={completedTransactions}
              className="w-full"
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <WeekdayPattern transactions={filteredTransactions} />
              <CashlessShareTrend transactions={filteredTransactions} />
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

        {/* Состояние загрузки с skeleton loaders */}
        {!initializing && selectedNetwork && stsApiConfigured && loading && (
          <div className="space-y-6">
            <ChartSkeleton height="h-80" isMobile={isMobile} showLegend={true} />
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              <HeatmapSkeleton isMobile={isMobile} />
              <ChartSkeleton height="h-80" isMobile={isMobile} />
            </div>
            <ChartSkeleton height={isMobile ? "h-64" : "h-80"} isMobile={isMobile} showLegend={true} />
          </div>
        )}

        {/* Сообщение об отсутствии транзакций */}
        {!initializing && selectedNetwork && stsApiConfigured && !loading && transactions.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Нет данных за выбранный период</h3>
            <p className="text-muted-foreground mb-4">Измените диапазон дат или нажмите кнопку "Обновить данные" для загрузки актуальной информации.</p>
            <Button
              onClick={() => loadTransactions()}
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
                      handleManualRefresh();
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
