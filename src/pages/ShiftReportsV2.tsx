/**
 * ShiftReportsV2 - Страница сменных отчетов
 * Рефакторинг: разделение логики на кастомные хуки
 */

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractStationNumber } from "@/utils/tradingPointUtils";
import { getSystemId } from "@/config/stsConfig";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileCheck, Receipt, Construction, CreditCard, Loader2, Smartphone, RefreshCw, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
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
import { LastDataTransfer } from "@/components/common/LastDataTransfer";
import ShiftFilters from "@/components/shift-reports/ShiftFilters";
import ShiftsTable from "@/components/shift-reports/ShiftsTable";
import MobileShiftsTable from "@/components/shift-reports/MobileShiftsTable";
import ShiftDetailsModal from "@/components/shift-reports/ShiftDetailsModal";
import ReceiptsModal from "@/components/shift-reports/ReceiptsModal";
import { ReconciliationParamsModal } from "@/components/reconciliation/ReconciliationParamsModal";
import { ReconciliationResults } from "@/components/reconciliation/ReconciliationResults";
import { MSTOReconciliationParamsModal } from "@/components/reconciliation/MSTOReconciliationParamsModal";
import { MSTOReconciliationResults } from "@/components/reconciliation/MSTOReconciliationResults";
import { executeReconciliation } from "@/services/reconciliation";
import { executeMstoReconciliation } from "@/services/mstoReconciliation";
import type { ReconciliationParams, ReconciliationResult } from "@/types/reconciliation";
import type { MSTOReconciliationParams, MSTOReconciliationResult } from "@/types/mstoReconciliation";

export default function ShiftReportsV2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint: selectedTradingPointId, isAllTradingPoints } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();
  const isMobile = useIsMobile();

  // Состояния модальных окон
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = useState(false);

  // Состояния для сверки корпоративных карт
  const [isCorpCardsParamsOpen, setIsCorpCardsParamsOpen] = useState(false);
  const [isCorpCardsLoading, setIsCorpCardsLoading] = useState(false);
  const [corpCardsResult, setCorpCardsResult] = useState<ReconciliationResult | null>(null);
  const [isCorpCardsResultOpen, setIsCorpCardsResultOpen] = useState(false);

  // Состояния для сверки MSTO онлайн-заказов
  const [isMstoParamsOpen, setIsMstoParamsOpen] = useState(false);
  const [isMstoLoading, setIsMstoLoading] = useState(false);
  const [mstoResult, setMstoResult] = useState<MSTOReconciliationResult | null>(null);
  const [isMstoResultOpen, setIsMstoResultOpen] = useState(false);

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

  // Обработчик запуска сверки корпоративных карт
  const handleCorpCardsReconciliation = async (params: ReconciliationParams) => {
    setIsCorpCardsLoading(true);
    try {
      const result = await executeReconciliation(params);
      setCorpCardsResult(result);
      setIsCorpCardsParamsOpen(false);
      setIsReconciliationModalOpen(false);
      setIsCorpCardsResultOpen(true);

      // Показываем результат сверки на основе hasErrors
      if (!result.summary.hasErrors) {
        toast({
          title: 'Сверка завершена',
          description: 'Расхождений не обнаружено!'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Обнаружены расхождения',
          description: `Найдено ${result.summary.onlyCorp + result.summary.onlyTf + result.summary.mismatch} расхождений`
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка сверки',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsCorpCardsLoading(false);
    }
  };

  // Обработчик новой сверки
  const handleNewCorpCardsReconciliation = () => {
    setCorpCardsResult(null);
    setIsCorpCardsResultOpen(false);
    setIsCorpCardsParamsOpen(true);
  };

  // Обработчик запуска сверки MSTO онлайн-заказов
  const handleMstoReconciliation = async (params: MSTOReconciliationParams) => {
    setIsMstoLoading(true);
    try {
      const result = await executeMstoReconciliation(params);
      setMstoResult(result);
      setIsMstoParamsOpen(false);
      setIsReconciliationModalOpen(false);
      setIsMstoResultOpen(true);

      if (!result.summary.hasErrors) {
        toast({
          title: 'Сверка завершена',
          description: 'Расхождений не обнаружено!'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Обнаружены расхождения',
          description: `Найдено ${result.summary.onlyMsto + result.summary.onlyShift + result.summary.mismatch} расхождений`
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка сверки MSTO',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsMstoLoading(false);
    }
  };

  // Обработчик новой сверки MSTO
  const handleNewMstoReconciliation = () => {
    setMstoResult(null);
    setIsMstoResultOpen(false);
    setIsMstoParamsOpen(true);
  };

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReconciliationModalOpen(true)}
              title="Сверки"
            >
              <FileCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Сверки</span>
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
        <div className="bg-di-surface-mid rounded-xl border border-transparent p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Журнал смен
              <span className="text-muted-foreground ml-2 font-normal text-sm">
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
            system={getSystemId(selectedNetwork) ?? 0}
            station={selectedShift.station || (tradingPoint ? extractStationNumber(tradingPoint) || 0 : 0)}
            stationName={selectedShift.stationName || tradingPoint?.name || 'Неизвестная станция'}
          />
        )}

        {/* Модальное окно "Сверки" */}
        <Dialog open={isReconciliationModalOpen} onOpenChange={setIsReconciliationModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                Сверки
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Сверка данных по сменам
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              {/* Корпоративные карты - РАБОТАЕТ */}
              <div
                onClick={() => {
                  setIsReconciliationModalOpen(false);
                  setIsCorpCardsParamsOpen(true);
                }}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-green-600/50 hover:bg-secondary hover:border-green-500 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                    Корпоративные карты
                  </p>
                  <p className="text-muted-foreground text-sm">Сверка операций по корпоративным картам с TradeCorp</p>
                </div>
                <Button variant="ghost" size="sm" className="text-green-600 dark:text-green-400 hover:text-green-300 hover:bg-emerald-900/20">
                  Открыть
                </Button>
              </div>

              {/* Онлайн заказы MSTO - РАБОТАЕТ */}
              <div
                onClick={() => {
                  setIsReconciliationModalOpen(false);
                  setIsMstoParamsOpen(true);
                }}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-cyan-600/50 hover:bg-secondary hover:border-cyan-500 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Онлайн заказы
                  </p>
                  <p className="text-muted-foreground text-sm">Сверка операций Яндекс, FuelUp и др. с MSTO</p>
                </div>
                <Button variant="ghost" size="sm" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                  Открыть
                </Button>
              </div>

              {/* Эквайринг - в разработке */}
              <div
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border opacity-60 cursor-not-allowed"
              >
                <div>
                  <p className="text-foreground font-medium">Эквайринг</p>
                  <p className="text-muted-foreground text-sm">Сверка операций эквайринга</p>
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <Construction className="w-5 h-5" />
                  <span className="text-xs">В разработке</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Модальное окно параметров сверки корп. карт */}
        <ReconciliationParamsModal
          open={isCorpCardsParamsOpen}
          onOpenChange={setIsCorpCardsParamsOpen}
          onSubmit={handleCorpCardsReconciliation}
          isLoading={isCorpCardsLoading}
        />

        {/* Модальное окно результатов сверки корп. карт */}
        <Dialog open={isCorpCardsResultOpen} onOpenChange={setIsCorpCardsResultOpen}>
          <DialogContent className="bg-card border-border max-w-6xl max-h-[90vh] overflow-y-auto">
            {corpCardsResult && (
              <ReconciliationResults
                result={corpCardsResult}
                onNewReconciliation={handleNewCorpCardsReconciliation}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Модальное окно параметров сверки MSTO */}
        <MSTOReconciliationParamsModal
          open={isMstoParamsOpen}
          onOpenChange={setIsMstoParamsOpen}
          onSubmit={handleMstoReconciliation}
          isLoading={isMstoLoading}
        />

        {/* Модальное окно результатов сверки MSTO */}
        <Dialog open={isMstoResultOpen} onOpenChange={setIsMstoResultOpen}>
          <DialogContent className="bg-card border-border max-w-6xl max-h-[90vh] overflow-y-auto">
            {mstoResult && (
              <MSTOReconciliationResults
                result={mstoResult}
                onNewReconciliation={handleNewMstoReconciliation}
              />
            )}
          </DialogContent>
        </Dialog>

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
