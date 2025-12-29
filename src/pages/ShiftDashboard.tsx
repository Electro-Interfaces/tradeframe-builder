/**
 * ShiftDashboard - Дашборд аналитики сменных отчетов
 */

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useDashboardPeriod } from "@/hooks/useDashboardPeriod";
import { useShiftDashboard } from "@/hooks/useShiftDashboard";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { getSystemId } from "@/config/stsConfig";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
  const { selectedNetwork, selectedTradingPoint, selectedStation, isAllTradingPoints } = useSelection();

  // Состояние для станций при выборе "все точки"
  const [allStations, setAllStations] = useState<number[]>([]);
  const [stationNames, setStationNames] = useState<Record<number, string>>({});
  const [loadingStations, setLoadingStations] = useState(false);

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
          const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
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
  }, [isAllTradingPoints, selectedNetwork?.id, selectedStation]);

  // Определяем станции для загрузки
  const stationNumber = selectedStation ? extractStationNumber(selectedStation) : undefined;
  const stations = isAllTradingPoints ? allStations : (stationNumber ? [stationNumber] : []);

  // Получаем system ID из external_id сети
  const systemId = getSystemId(selectedNetwork);

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
    enabled: stations.length > 0 && !loadingStations,
  });

  // Если не выбрана торговая точка
  if (!selectedStation && !isAllTradingPoints) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center h-64 bg-slate-800 rounded-xl border border-slate-700">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <p className="text-lg text-slate-300 mb-2">Выберите торговую точку</p>
            <p className="text-sm text-slate-500">Для отображения дашборда необходимо выбрать торговую точку</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/point/shift-reports-v2')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к сменам
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-white">Дашборд аналитики по сменным отчетам</h1>
              <p className="text-sm text-slate-400">
                {selectedStation?.name || selectedNetwork?.name || 'Все точки'}
              </p>
            </div>
          </div>
        </div>

        {/* Селектор периода */}
        <div className="mb-6">
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
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Ошибка загрузки данных: {error.message}</span>
            </div>
          </div>
        )}

        {/* KPI карточки продаж */}
        {data && (
          <div className="mb-6">
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
          <div className="mb-6">
            <ReceiptsKPIGrid
              receipts={data.kpis.receipts}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Инкассация купюроприемников */}
        {data && (
          <div className="mb-6">
            <CashoutKPIGrid
              cashout={data.kpis.cashout}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Движение наличных (сверка кассы) */}
        {data && (
          <div className="mb-6">
            <CashFlowKPIGrid
              cashFlow={data.kpis.cashFlow}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Графики */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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


        {/* Загрузка */}
        {(isLoading || loadingStations) && !data && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">
              {loadingStations ? 'Загрузка торговых точек...' : 'Загрузка данных...'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
