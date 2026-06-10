/**
 * ShiftReportsV2 - Страница сменных отчетов
 * Рефакторинг: разделение логики на кастомные хуки
 */

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { getSystemId } from "@/config/stsConfig";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Receipt, Loader2, RefreshCw, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Кастомные хуки
import { useTradingPoint } from "@/hooks/useTradingPoint";
import { useShiftFilters } from "@/hooks/useShiftFilters";
import { useShiftReports } from "@/hooks/useShiftReports";
import { useShiftSelection } from "@/hooks/useShiftSelection";

// Компоненты
import { LastDataTransfer } from "@/components/common/LastDataTransfer";
import ShiftFilters from "@/components/shift-reports/ShiftFilters";
import ShiftsTable from "@/components/shift-reports/ShiftsTable";
import MobileShiftsTable from "@/components/shift-reports/MobileShiftsTable";
import ShiftDetailsModal from "@/components/shift-reports/ShiftDetailsModal";
import ReceiptsModal from "@/components/shift-reports/ReceiptsModal";

export default function ShiftReportsV2() {
  const navigate = useNavigate();
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint: selectedTradingPointId, isAllTradingPoints } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();
  const isMobile = useIsMobile();

  // Состояния модальных окон
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = useState(false);

  // Загрузка объекта торговой точки (только если выбрана конкретная точка)
  const { tradingPoint } = useTradingPoint({
    tradingPointId: isAllTradingPoints ? null : selectedTradingPointId,
    networkId: selectedNetwork?.id || null
  });

  // Управление фильтрами
  const { filters, setFilters } = useShiftFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Загрузка и фильтрация смен
  const { shifts, filteredShifts, loading, refresh } = useShiftReports({
    tradingPoint,
    networkId: selectedNetwork?.id || null,
    network: selectedNetwork,
    networkIds: selectedNetworkIds,
    networks: selectedNetworks,
    isAllTradingPoints,
    filters
  });

  // Управление выделением смен
  const {
    selectedShiftIds,
    selectedShift,
    toggleShiftSelection,
    toggleAllShifts,
    selectShift,
    closeShiftDetails
  } = useShiftSelection();

  // Станции из справочника для модалки "Чеки"
  const receiptsStations = useMemo(() => {
    // Если выбрана одна точка — берём её номер
    if (tradingPoint && !isAllTradingPoints) {
      const num = extractStationNumber(tradingPoint);
      return num ? [num] : [];
    }
    // Если все точки — уникальные станции из загруженных смен
    const stationSet = new Set<number>();
    for (const s of shifts) {
      if (s.station) stationSet.add(s.station);
    }
    return Array.from(stationSet).sort((a, b) => a - b);
  }, [tradingPoint, isAllTradingPoints, shifts]);

  const receiptsStationNames = useMemo(() => {
    const names: Record<number, string> = {};
    for (const s of shifts) {
      if (s.station && s.stationName) {
        names[s.station] = s.stationName;
      }
    }
    if (tradingPoint) {
      const num = extractStationNumber(tradingPoint);
      if (num) names[num] = tradingPoint.name || `Станция ${num}`;
    }
    return names;
  }, [shifts, tradingPoint]);

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">Сменные отчеты</h1>
            <LastDataTransfer />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              title="Фильтры"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/point/shift-dashboard')}
              title="Дашборд"
            >
              <LayoutDashboard className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Дашборд</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReceiptsModalOpen(true)}
              title="Чеки"
            >
              <Receipt className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Чеки</span>
            </Button>
          </div>
        </div>

        {/* Фильтры */}
        {filtersOpen && (
          <div className="mb-8">
            <ShiftFilters
              filters={filters}
              onFiltersChange={setFilters}
              onRefresh={refresh}
              loading={loading}
            />
          </div>
        )}

        {/* Журнал смен */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Журнал смен
              <Badge variant="secondary" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300">
                {filteredShifts.length} из {shifts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Таблица или карточки */}
            {isMobile ? (
              <div className="px-4 pb-4">
                <MobileShiftsTable
                  shifts={filteredShifts}
                  onSelectShift={selectShift}
                  loading={loading}
                  selectedShiftIds={selectedShiftIds}
                  onToggleShiftSelection={toggleShiftSelection}
                  onToggleAllShifts={(selected) => toggleAllShifts(filteredShifts, selected)}
                />
              </div>
            ) : (
              <ShiftsTable
                shifts={filteredShifts}
                onSelectShift={selectShift}
                loading={loading}
              />
            )}
          </CardContent>
        </Card>

        {/* Модальное окно деталей смены */}
        {selectedShift && (
          <ShiftDetailsModal
            isOpen={true}
            onClose={closeShiftDetails}
            shiftNumber={selectedShift.shiftNumber}
            system={getSystemId(selectedNetwork) ?? 0}
            station={selectedShift.station || (tradingPoint ? extractStationNumber(tradingPoint) || 0 : 0)}
            stationName={selectedShift.stationName || tradingPoint?.name || 'Неизвестная станция'}
          />
        )}

        {/* Модальное окно "Чеки" */}
        <ReceiptsModal
          isOpen={isReceiptsModalOpen}
          onClose={() => setIsReceiptsModalOpen(false)}
          systemId={getSystemId(selectedNetwork) ?? 0}
          stations={receiptsStations}
          stationNames={receiptsStationNames}
        />
      </div>
    </MainLayout>
  );
}
