/**
 * ShiftReportsV2 - Страница сменных отчетов
 * Рефакторинг: разделение логики на кастомные хуки
 */

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { STS_SYSTEM_ID } from "@/config/stsConfig";
import { Button } from "@/components/ui/button";
import { FileText, FileCheck, Construction } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const { selectedNetwork, selectedTradingPoint: selectedTradingPointId, isAllTradingPoints } = useSelection();
  const isMobile = useIsMobile();

  // Состояния модальных окон
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);

  // Загрузка объекта торговой точки (только если выбрана конкретная точка)
  const { tradingPoint } = useTradingPoint({
    tradingPointId: isAllTradingPoints ? null : selectedTradingPointId,
    networkId: selectedNetwork?.id || null
  });

  // Управление фильтрами
  const { filters, setFilters } = useShiftFilters();

  // Загрузка и фильтрация смен
  const { shifts, filteredShifts, loading, refresh } = useShiftReports({
    tradingPoint,
    networkId: selectedNetwork?.id || null,
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

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">Сменные отчеты</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReportsModalOpen(true)}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              Отчеты
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReconciliationModalOpen(true)}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Сверки
            </Button>
          </div>
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
        {selectedShift && (
          <ShiftDetailsModal
            isOpen={true}
            onClose={closeShiftDetails}
            shiftNumber={selectedShift.shiftNumber}
            system={STS_SYSTEM_ID}
            station={selectedShift.station || (tradingPoint ? extractStationNumber(tradingPoint) || 0 : 0)}
            stationName={selectedShift.stationName || tradingPoint?.name || 'Неизвестная станция'}
          />
        )}

        {/* Модальное окно "Отчеты" */}
        <Dialog open={isReportsModalOpen} onOpenChange={setIsReportsModalOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Отчеты
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Формирование отчетов по сменам
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Construction className="w-16 h-16 text-amber-500" />
              <p className="text-slate-300 text-center">
                Раздел находится в разработке
              </p>
              <p className="text-slate-500 text-sm text-center">
                В ближайшее время здесь появится возможность формирования различных отчетов по сменам
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Модальное окно "Сверки" */}
        <Dialog open={isReconciliationModalOpen} onOpenChange={setIsReconciliationModalOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-400" />
                Сверки
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Сверка данных по сменам
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              {[
                { title: 'Корпоративные карты', description: 'Сверка операций по корпоративным картам' },
                { title: 'Онлайн заказы', description: 'Сверка операций онлайн заказов' },
                { title: 'Эквайринг', description: 'Сверка операций эквайринга' }
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{item.title}</p>
                    <p className="text-slate-500 text-sm">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-amber-500">
                    <Construction className="w-5 h-5" />
                    <span className="text-xs">В разработке</span>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
