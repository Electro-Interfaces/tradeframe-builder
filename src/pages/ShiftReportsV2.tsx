/**
 * ShiftReportsV2 - Страница сменных отчетов
 * Рефакторинг: разделение логики на кастомные хуки
 */

import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { STS_SYSTEM_ID } from "@/config/stsConfig";

// Кастомные хуки
import { useTradingPoint } from "@/hooks/useTradingPoint";
import { useShiftFilters } from "@/hooks/useShiftFilters";
import { useShiftReports } from "@/hooks/useShiftReports";
import { useShiftSelection } from "@/hooks/useShiftSelection";

// Компоненты
import ShiftFilters from "@/components/shift-reports/ShiftFilters";
import ShiftsTable from "@/components/shift-reports/ShiftsTable";
import MobileShiftsTable from "@/components/shift-reports/MobileShiftsTable";
import ShiftDetailsModal from "@/components/shift-reports/ShiftDetailsModal";

export default function ShiftReportsV2() {
  const { selectedNetwork, selectedTradingPoint: selectedTradingPointId } = useSelection();
  const isMobile = useIsMobile();

  // Загрузка объекта торговой точки
  const { tradingPoint } = useTradingPoint({
    tradingPointId: selectedTradingPointId,
    networkId: selectedNetwork?.id || null
  });

  // Управление фильтрами
  const { filters, setFilters } = useShiftFilters();

  // Загрузка и фильтрация смен
  const { shifts, filteredShifts, loading, refresh } = useShiftReports({
    tradingPoint,
    filters
  });

  // Управление выделением смен
  const {
    selectedShiftIds,
    selectedShiftNumber,
    toggleShiftSelection,
    toggleAllShifts,
    selectShift,
    closeShiftDetails
  } = useShiftSelection();

  // Проверка выбора торговой точки
  if (!tradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Сменные отчеты</h1>
          </div>
          <div className="bg-slate-800 mb-6 w-full rounded-lg">
            <div className="px-4 md:px-6 py-4">
              <EmptyState
                title="Выберите торговую точку"
                description="Для просмотра сменных отчетов необходимо выбрать торговую точку из выпадающего списка выше"
                className="py-16"
              />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Сменные отчеты</h1>
        </div>

        {/* Фильтры */}
        <div className="mb-6">
          <ShiftFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refresh}
            loading={loading}
          />
        </div>

        {/* Журнал смен */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Журнал смен
              <span className="text-slate-400 ml-2 font-normal text-sm">
                ({filteredShifts.length} из {shifts.length})
              </span>
            </h2>
          </div>

          {/* Таблица или карточки */}
          {isMobile ? (
            <MobileShiftsTable
              shifts={filteredShifts}
              onSelectShift={selectShift}
              loading={loading}
              selectedShiftIds={selectedShiftIds}
              onToggleShiftSelection={toggleShiftSelection}
              onToggleAllShifts={(selected) => toggleAllShifts(filteredShifts, selected)}
            />
          ) : (
            <ShiftsTable
              shifts={filteredShifts}
              onSelectShift={selectShift}
              loading={loading}
            />
          )}
        </div>

        {/* Модальное окно деталей смены */}
        {tradingPoint && (
          <ShiftDetailsModal
            isOpen={selectedShiftNumber !== null}
            onClose={closeShiftDetails}
            shiftNumber={selectedShiftNumber}
            system={STS_SYSTEM_ID}
            station={extractStationNumber(tradingPoint) || 0}
            stationName={tradingPoint.name}
          />
        )}
      </div>
    </MainLayout>
  );
}
