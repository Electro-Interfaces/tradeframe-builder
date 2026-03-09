/**
 * ShiftDashboard - Дашборд аналитики сменных отчетов
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useDashboardPeriod } from "@/hooks/useDashboardPeriod";
import { useShiftDashboard } from "@/hooks/useShiftDashboard";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { getSystemId } from "@/config/stsConfig";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, AlertCircle, Filter, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import tradingPointsService from "@/services/tradingPointsService";

// Компоненты дашборда
import { DashboardPeriodSelector } from "@/components/shift-dashboard/DashboardPeriodSelector";
import { DashboardKPIGrid } from "@/components/shift-dashboard/DashboardKPIGrid";
import { ReceiptsKPIGrid } from "@/components/shift-dashboard/ReceiptsKPIGrid";
import { CashoutKPIGrid } from "@/components/shift-dashboard/CashoutKPIGrid";
import { CashFlowKPIGrid } from "@/components/shift-dashboard/CashFlowKPIGrid";
import { RevenueByDayChart } from "@/components/shift-dashboard/RevenueByDayChart";
import { VolumeByFuelChart } from "@/components/shift-dashboard/VolumeByFuelChart";
import { PaymentMethodsChart } from "@/components/shift-dashboard/PaymentMethodsChart";

export default function ShiftDashboard() {
  const navigate = useNavigate();
  const { selectedNetwork, selectedTradingPoint, selectedStation, isAllTradingPoints, selectedTradingPoints } = useSelection();

  // Состояние для станций при выборе "все точки"
  const [allStations, setAllStations] = useState<number[]>([]);
  const [stationNames, setStationNames] = useState<Record<number, string>>({});
  const [loadingStations, setLoadingStations] = useState(false);

  // Состояние для фильтра смен (только для одной станции)
  const [selectedShifts, setSelectedShifts] = useState<number[]>([]); // Пустой = все смены
  const [shiftsFilterOpen, setShiftsFilterOpen] = useState(false);
  const initialShiftsSelected = useRef(false); // Флаг первоначального выбора смен

  // Хук управления периодом
  const {
    period,
    labels,
    setPreset,
    setCustomDates,
  } = useDashboardPeriod({ initialPreset: 'week' });

  // Загрузка всех станций сети при isAllTradingPoints
  useEffect(() => {
    const loadAllStations = async () => {
      if (isAllTradingPoints && selectedNetwork?.id) {
        setLoadingStations(true);
        try {
          let tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
          // Фильтруем по мультиселекту
          if (selectedTradingPoints.length > 0) {
            tradingPoints = tradingPoints.filter(tp => selectedTradingPoints.includes(tp.id));
          }
          const stationNumbers: number[] = [];
          const namesMap: Record<number, string> = {};

          tradingPoints.forEach(tp => {
            const stationNum = extractStationNumber(tp);
            if (stationNum !== null && stationNum !== undefined) {
              stationNumbers.push(stationNum);
              // Используем name торговой точки
              namesMap[stationNum] = tp.name || `Станция ${stationNum}`;
            }
          });

          setAllStations(stationNumbers);
          setStationNames(namesMap);
        } catch (err) {
          setAllStations([]);
          setStationNames({});
        } finally {
          setLoadingStations(false);
        }
      } else if (selectedStation) {
        // Если выбрана одна станция, формируем маппинг для нее
        const stationNum = extractStationNumber(selectedStation);
        if (stationNum) {
          setStationNames({
            [stationNum]: selectedStation.name || `Станция ${stationNum}`
          });
        }
        setAllStations([]);
      } else {
        setAllStations([]);
        setStationNames({});
      }
    };

    loadAllStations();
  }, [isAllTradingPoints, selectedNetwork?.id, selectedStation, selectedTradingPoints]);

  // Определяем станции для загрузки
  const stationNumber = selectedStation ? extractStationNumber(selectedStation) : undefined;
  const stations = isAllTradingPoints ? allStations : (stationNumber ? [stationNumber] : []);

  // Получаем system ID из external_id сети
  const systemId = getSystemId(selectedNetwork);

  // Сброс фильтра смен при смене станции или периода
  useEffect(() => {
    setSelectedShifts([]);
    initialShiftsSelected.current = false; // Разрешаем автовыбор для новых данных
  }, [selectedStation?.id, period.dateFrom, period.dateTo]);

  // Загрузка данных дашборда
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useShiftDashboard({
    system: systemId,
    stations,
    stationNames,
    period,
    selectedShifts: selectedShifts.length > 0 ? selectedShifts : undefined,
    enabled: stations.length > 0 && !loadingStations,
  });

  // Список всех смен для фильтра
  const allShiftsForFilter = useMemo(() => {
    const shifts = (data?.meta as any)?.allShifts || data?.shifts || [];
    // Сортируем по номеру смены (новые сверху)
    return [...shifts].sort((a: any, b: any) => b.shiftNumber - a.shiftNumber);
  }, [data]);

  // Автовыбор всех смен после загрузки данных (только один раз)
  useEffect(() => {
    if (allShiftsForFilter.length > 0 && !initialShiftsSelected.current) {
      setSelectedShifts(allShiftsForFilter.map((s: any) => s.shiftNumber));
      initialShiftsSelected.current = true;
    }
  }, [allShiftsForFilter]);

  // Обработчик выбора/снятия смены
  const handleShiftToggle = (shiftNumber: number) => {
    setSelectedShifts(prev => {
      if (prev.includes(shiftNumber)) {
        return prev.filter(n => n !== shiftNumber);
      }
      return [...prev, shiftNumber];
    });
  };

  // Выбрать/снять все смены
  const handleSelectAllShifts = () => {
    if (selectedShifts.length === allShiftsForFilter.length) {
      setSelectedShifts([]);
    } else {
      setSelectedShifts(allShiftsForFilter.map((s: any) => s.shiftNumber));
    }
  };

  // Если не выбрана торговая точка
  if (!selectedStation && !isAllTradingPoints) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-border">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <p className="text-lg text-foreground/80 mb-2">Выберите торговую точку</p>
            <p className="text-sm text-muted-foreground">Для отображения дашборда необходимо выбрать торговую точку</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-4 sm:mb-6 pt-2 sm:pt-4 flex flex-col gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/point/shift-reports-v2')}
              className="text-muted-foreground hover:text-foreground px-2 sm:px-3"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Назад к сменам</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">
                <span className="hidden sm:inline">Дашборд аналитики по сменным отчетам</span>
                <span className="sm:hidden">Аналитика смен</span>
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {selectedStation?.name || selectedNetwork?.name || 'Все точки'}
                </p>
                {/* Фильтр по сменам - только для одной станции */}
                {selectedStation && !isAllTradingPoints && allShiftsForFilter.length > 0 && (
                  <Popover open={shiftsFilterOpen} onOpenChange={setShiftsFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-border"
                      >
                        <Filter className="w-3 h-3 mr-1" />
                        {selectedShifts.length > 0
                          ? `Смены: ${selectedShifts.length} из ${allShiftsForFilter.length}`
                          : `Все смены (${allShiftsForFilter.length})`}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 bg-card border-border" align="start">
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Выбор смен</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllShifts}
                            className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300"
                          >
                            {selectedShifts.length === allShiftsForFilter.length ? 'Снять все' : 'Выбрать все'}
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {allShiftsForFilter.map((shift: any) => (
                          <label
                            key={shift.shiftNumber}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedShifts.includes(shift.shiftNumber)}
                              onCheckedChange={() => handleShiftToggle(shift.shiftNumber)}
                            />
                            <span className="text-sm text-foreground/80">
                              №{shift.shiftNumber}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(shift.openedAt).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </label>
                        ))}
                      </div>
                      {selectedShifts.length > 0 && (
                        <div className="p-2 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedShifts([])}
                            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Сбросить фильтр
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Селектор периода */}
        <div className="mb-4 sm:mb-6">
          <DashboardPeriodSelector
            period={period}
            labels={labels}
            onPresetChange={setPreset}
            onCustomDatesChange={setCustomDates}
            onRefresh={refetch}
            isLoading={isFetching}
          />
        </div>

        {/* Ошибка загрузки */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Ошибка загрузки данных: {error.message}</span>
            </div>
          </div>
        )}

        {/* Индикатор фоновой загрузки */}
        {isFetching && data && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/30 rounded-lg text-sm text-blue-600 dark:text-blue-300">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Обновление данных...
          </div>
        )}

        {/* KPI карточки продаж */}
        {data && (
          <div className="mb-4 sm:mb-6">
            <DashboardKPIGrid
              kpis={data.kpis}
              trends={data.trends}
              shifts={data.shifts}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* KPI карточки поступлений */}
        {data && (
          <div className="mb-4 sm:mb-6">
            <ReceiptsKPIGrid
              receipts={data.kpis.receipts}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Инкассация купюроприемников */}
        {data && (
          <div className="mb-4 sm:mb-6">
            <CashoutKPIGrid
              cashout={data.kpis.cashout}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Движение наличных (сверка кассы) */}
        {data && (
          <div className="mb-4 sm:mb-6">
            <CashFlowKPIGrid
              cashFlow={data.kpis.cashFlow}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Графики */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <RevenueByDayChart
              data={data.charts.daily}
              isLoading={isLoading}
            />
            <PaymentMethodsChart
              data={data.kpis.financial}
              isLoading={isLoading}
            />
            <VolumeByFuelChart
              data={data.charts.byFuel}
              isLoading={isLoading}
            />
          </div>
        )}


        {/* Загрузка — скелетон */}
        {(isLoading || loadingStations) && !data && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Скелетон KPI карточек */}
            <div>
              <div className="h-4 w-32 bg-secondary rounded mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-card rounded-xl p-3 sm:p-4 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                      <div className="h-3.5 w-16 bg-secondary rounded animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-6 w-24 bg-secondary rounded animate-pulse" />
                      <div className="h-5 w-20 bg-secondary rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Скелетон способов оплаты */}
            <div>
              <div className="h-4 w-40 bg-secondary rounded mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-card rounded-xl p-3 sm:p-4 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-secondary animate-pulse" />
                      <div className="h-3.5 w-20 bg-secondary rounded animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-5 w-28 bg-secondary rounded animate-pulse" />
                      <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Скелетон графиков */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border h-64">
                  <div className="h-4 w-32 bg-secondary rounded animate-pulse mb-4" />
                  <div className="h-44 bg-secondary/30 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Индикатор загрузки */}
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                {loadingStations
                  ? 'Загрузка торговых точек...'
                  : `Загрузка сменных отчетов (${stations.length} ${stations.length === 1 ? 'станция' : 'станций'})...`
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
