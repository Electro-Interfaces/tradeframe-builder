/**
 * Страница ценообразования по торговой сети
 * Отображает цены, статистику и аналитику по всем торговым точкам сети
 */

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useNetworkPrices } from "@/hooks/useNetworkPrices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceKPI } from "@/components/network-prices/PriceKPI";
import { StationPricesTable } from "@/components/network-prices/StationPricesTable";
import { PriceDynamicsChart } from "@/components/network-prices/PriceDynamicsChart";
import { LoadingState, ErrorState } from "@/components/common/PageStates";
import { SelectNetworkMessage } from "@/components/common/SelectNetworkMessage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DollarSign, RefreshCw, TrendingUp, Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { exportPricingToExcel, exportPricingToPdf } from "@/components/network-prices/pricingExport";

export default function NetworkPricing() {
  const { selectedNetwork, isInitialized } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Выбранный период на уровне страницы
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Флаг активной выгрузки (Excel/PDF) — блокирует кнопку и показывает спиннер
  const [exporting, setExporting] = useState(false);

  // Загрузка цен по всем выбранным сетям
  const {
    networkPrices,
    statistics,
    priceHistoryMap,
    salesByPrice,
    loading,
    loadingSales,
    error,
    refresh
  } = useNetworkPrices({
    network: selectedNetwork,
    networks: selectedNetworks,
    autoLoad: true,
    filterPeriod: selectedPeriod
  });

  // Pull-to-refresh для мобильных
  const handleRefreshData = async () => {
    await refresh();
  };

  // Общие параметры для выгрузки (цены/статистика/динамика/продажи)
  const exportParams = () => ({
    networkPrices,
    statistics,
    priceHistoryMap,
    salesByPrice,
    selectedNetwork,
    selectedNetworks,
    selectedPeriod,
    toast,
  });

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportPricingToExcel(exportParams());
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportPricingToPdf(exportParams());
    } finally {
      setExporting(false);
    }
  };

  const { pullState, pullDistance, scrollContainerRef } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: 30
  });

  // Loading state пока контекст не инициализирован
  if (!isInitialized) {
    return (
      <MainLayout fullWidth={true}>
        <LoadingState message="Инициализация данных..." />
      </MainLayout>
    );
  }

  // Empty state если не выбрана сеть
  if (!selectedNetwork) {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectNetworkMessage message="Выберите торговую сеть для просмотра ценообразования" />
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <MainLayout fullWidth={true}>
        <ErrorState
          title="Ошибка загрузки данных"
          message={error.message}
          onRetry={refresh}
          loading={loading}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div ref={scrollContainerRef} data-pull-to-refresh="true" className={`w-full ${isMobile ? 'space-y-3 px-3 py-3' : 'space-y-6 px-4 md:px-6 lg:px-8 py-6'}`}>

        {/* Pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= 30 && (
          <div className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{ transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`, opacity: Math.min(1, (pullDistance - 30) / 40) }}>
            <div className="bg-white/95 backdrop-blur-sm text-foreground px-4 py-2 rounded-full shadow-lg border border-border/50 flex items-center gap-2">
              {pullState === 'refreshing' ? (
                <><RefreshCw className="w-4 h-4 animate-spin text-primary" /><span className="text-sm font-medium">Обновление...</span></>
              ) : pullState === 'canRefresh' ? (
                <><div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm font-medium text-green-600">Отпустите для обновления</span></>
              ) : (
                <><div className="w-4 h-4 border-2 border-border border-t-blue-500 rounded-full" style={{ transform: `rotate(${pullDistance * 3}deg)` }} /><span className="text-sm font-medium">Потяните для обновления</span></>
              )}
            </div>
          </div>
        )}

        {/* Заголовок */}
        <div className={`${isMobile ? 'mb-3' : 'mb-6 pt-4'}`}>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between gap-4'}`}>
            <div className="flex-1 min-w-0">
              <h1 className={`font-semibold text-foreground ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                Ценообразование
              </h1>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                {selectedNetworks.length > 1
                  ? `Сети: ${selectedNetworks.map(n => n.name).join(', ')}`
                  : `Сеть: ${selectedNetwork.name}`
                }
              </p>
            </div>

            {/* Кнопки и селекторы */}
            <div className="flex items-center gap-2">
              {/* Селектор периода */}
              <div className={`${isMobile ? 'w-32' : 'w-48'}`}>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Период" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="7" className="text-foreground hover:bg-secondary">
                      {isMobile ? '7 дней' : 'Последние 7 дней'}
                    </SelectItem>
                    <SelectItem value="30" className="text-foreground hover:bg-secondary">
                      {isMobile ? '30 дней' : 'Последние 30 дней'}
                    </SelectItem>
                    <SelectItem value="90" className="text-foreground hover:bg-secondary">
                      {isMobile ? '3 месяца' : 'Последние 3 месяца'}
                    </SelectItem>
                    <SelectItem value="all" className="text-foreground hover:bg-secondary">
                      Всё время
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Индикатор фоновой загрузки продаж */}
              {loadingSales && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {!isMobile && 'Продажи...'}
                </span>
              )}

              {/* Кнопка обновления */}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="border-border text-foreground hover:bg-secondary flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {!isMobile && <span className="ml-2">Обновить</span>}
              </Button>

              {/* Меню экспорта — доступно, когда есть загруженные цены */}
              {networkPrices.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading || exporting}
                      className="border-border text-foreground hover:bg-secondary flex-shrink-0"
                    >
                      {exporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {!isMobile && <span className="ml-2">Экспорт</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-xl rounded-lg">
                    <DropdownMenuItem onClick={handleExportExcel} disabled={exporting} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium">Экспорт в Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf} disabled={exporting} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                      <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">Экспорт в PDF</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* KPI панель */}
        {loading && networkPrices.length === 0 ? (
          <LoadingState message="Загрузка данных о ценах..." />
        ) : (
          <>
            <PriceKPI statistics={statistics} isMobile={isMobile} />

            {/* Вкладки с данными */}
            <Card className="bg-card border border-border rounded-lg shadow-lg">
              <CardHeader className={`${isMobile ? 'px-3 py-2.5' : 'px-6 py-4'}`}>
                <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
                  <DollarSign className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-green-600 dark:text-green-400`} />
                  Цены по торговым точкам
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-3 pb-3' : ''}`}>
                <Tabs defaultValue="table" className="w-full">
                  <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-4'} bg-background`}>
                    <TabsTrigger value="table" className="data-[state=active]:bg-secondary">
                      {isMobile ? 'Таблица' : 'Таблица цен'}
                    </TabsTrigger>
                    <TabsTrigger value="dynamics" className="data-[state=active]:bg-secondary">
                      {isMobile ? 'График' : 'Динамика'}
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="data-[state=active]:bg-secondary">
                      {isMobile ? 'Статистика' : 'Статистика'}
                    </TabsTrigger>
                    {!isMobile && (
                      <TabsTrigger value="analytics" className="data-[state=active]:bg-secondary">
                        Аналитика
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Вкладка: Таблица цен */}
                  <TabsContent value="table" className={isMobile ? 'mt-3' : 'mt-4'}>
                    <StationPricesTable
                      networkPrices={networkPrices}
                      statistics={statistics}
                      isMobile={isMobile}
                    />
                  </TabsContent>

                  {/* Вкладка: Динамика */}
                  <TabsContent value="dynamics" className={isMobile ? 'mt-3' : 'mt-4'}>
                    <PriceDynamicsChart
                      statistics={statistics}
                      networkPrices={networkPrices}
                      priceHistoryMap={priceHistoryMap}
                      isMobile={isMobile}
                      selectedPeriod={selectedPeriod}
                    />
                  </TabsContent>

                  {/* Вкладка: Статистика */}
                  <TabsContent value="statistics" className={isMobile ? 'mt-3' : 'mt-4'}>
                    <div className={`space-y-6 ${isMobile ? 'text-sm' : ''}`}>

                      {/* Таблица статистики цен */}
                      <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border bg-card/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                  Вид топлива
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                  Средняя цена
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                  Минимальная
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                  Максимальная
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                  Разброс
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {statistics.map(stat => (
                                <tr key={stat.fuelType} className="hover:bg-secondary/20">
                                  <td className="px-4 py-3 text-foreground font-medium">
                                    {stat.fuelType}
                                  </td>
                                  <td className="px-4 py-3 text-right text-foreground font-bold">
                                    {stat.averagePrice.toFixed(2)} ₽
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="text-green-600 dark:text-green-400 font-medium">
                                      {stat.minPrice.toFixed(2)} ₽
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ({stat.minStation})
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="text-red-600 dark:text-red-400 font-medium">
                                      {stat.maxPrice.toFixed(2)} ₽
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ({stat.maxStation})
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className={`font-medium ${stat.priceRangePercent > 5 ? 'text-yellow-500' : 'text-foreground/80'}`}>
                                      {stat.priceRange.toFixed(2)} ₽
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ({stat.priceRangePercent.toFixed(1)}%)
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>


                      {/* Таблица продаж по ценам (группировка по видам топлива) */}
                      {salesByPrice.length > 0 && (() => {
                        // Группируем данные по видам топлива
                        const groupedByFuel = salesByPrice.reduce((acc, sale) => {
                          if (!acc[sale.fuelType]) {
                            acc[sale.fuelType] = [];
                          }
                          acc[sale.fuelType].push(sale);
                          return acc;
                        }, {} as Record<string, typeof salesByPrice>);

                        // Сортируем виды топлива
                        const fuelTypes = Object.keys(groupedByFuel).sort();

                        return (
                          <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
                            <div className="px-4 py-3 border-b border-border bg-card/50">
                              <h4 className="text-foreground font-medium flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                                Продажи по ценам (литры)
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Объемы продаж по каждой цене, действовавшей в период закрытых смен
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-border bg-card/30">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                      Вид топлива
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground/80 uppercase tracking-wider">
                                      Общий объем (л)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {fuelTypes.map(fuelType => {
                                    const sales = groupedByFuel[fuelType];
                                    const totalVolume = sales.reduce((sum, sale) => sum + sale.volume, 0);

                                    return (
                                      <React.Fragment key={fuelType}>
                                        {/* Главная строка с видом топлива и общим объемом */}
                                        <tr className="hover:bg-secondary/20 bg-card/30">
                                          <td className="px-4 py-3 text-foreground font-bold">
                                            {fuelType}
                                          </td>
                                          <td className="px-4 py-3 text-right text-foreground font-bold">
                                            {totalVolume.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                        {/* Детализация по ценам */}
                                        {sales.sort((a, b) => a.price - b.price).map((sale, index) => (
                                          <tr key={`${fuelType}-${sale.price}-${index}`} className="hover:bg-secondary/10">
                                            <td className="px-4 py-2 text-muted-foreground text-sm pl-8">
                                              по цене {sale.price.toFixed(2)} ₽/л
                                            </td>
                                            <td className="px-4 py-2 text-right text-foreground/80 text-sm">
                                              {sale.volume.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  {/* Вкладка: Аналитика (заглушка для будущего) */}
                  {!isMobile && (
                    <TabsContent value="analytics" className="mt-4">
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg mb-2">Аналитика в разработке</p>
                        <p className="text-sm">
                          Здесь будут отображаться графики динамики цен, прогнозы и сравнительный анализ
                        </p>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
