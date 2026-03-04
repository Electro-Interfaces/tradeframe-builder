/**
 * Страница оборудования
 * Отрефакторенная версия с использованием хуков и компонентов
 */

import { lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useThresholds } from "@/hooks/useThresholds";
import { useCashoutHistory } from "@/hooks/useCashoutHistory";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { BillAcceptorCard } from "@/components/equipment/BillAcceptorCard";
import { EquipmentHeader } from "@/components/equipment/EquipmentHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/PageStates";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { PULL_TO_REFRESH_CONFIG } from "@/config/pullToRefresh";

const FuelLevelThresholdsCard = lazy(() => import("@/components/equipment/FuelLevelThresholdsCard").then(m => ({ default: m.FuelLevelThresholdsCard })));

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint, selectedStation, isInitialized } = useSelection();
  const isMobile = useIsMobile();

  // Хук для управления пороговыми значениями
  const {
    billAcceptorThresholds,
    fuelLevelThresholds,
    saveBillAcceptorThresholds,
    saveFuelLevelThresholds
  } = useThresholds({ tradingPointId: selectedTradingPoint });

  // Хук для загрузки оборудования
  const {
    terminalInfo,
    equipment,
    tanks,
    loading,
    error,
    refreshEquipment,
    restartTerminal,
    restartingTerminal
  } = useEquipment({
    networkId: selectedNetwork?.external_id,
    tradingPointId: selectedTradingPoint,
    station: selectedStation,
    autoLoad: true,
    showToasts: !isMobile
  });

  // Хук для загрузки журнала инкассации
  const {
    cashoutRecords,
    loading: cashoutLoading
  } = useCashoutHistory({
    networkId: selectedNetwork?.external_id,
    tradingPointId: selectedTradingPoint,
    autoLoad: true
  });

  // Хук для pull-to-refresh
  const {
    pullState,
    pullDistance,
    scrollContainerRef
  } = usePullToRefresh({
    onRefresh: refreshEquipment,
    enabled: isMobile,
    pullThreshold: PULL_TO_REFRESH_CONFIG.PULL_THRESHOLD,
    maxPullDistance: PULL_TO_REFRESH_CONFIG.MAX_PULL_DISTANCE,
    indicatorAppearThreshold: PULL_TO_REFRESH_CONFIG.INDICATOR_APPEAR_THRESHOLD
  });

  // Loading state пока контекст не инициализирован
  if (!isInitialized) {
    return (
      <MainLayout fullWidth={true}>
        <LoadingState message="Инициализация данных..." />
      </MainLayout>
    );
  }

  // Empty state если не выбрана торговая точка
  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку в селекторе для просмотра оборудования" />
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
          onRetry={refreshEquipment}
          loading={loading}
        />
      </MainLayout>
    );
  }

  // Определяем многопостовость
  const isMultiPos = (terminalInfo?.pos?.length || 0) > 1;

  // Для однопостовой станции — текущее поведение
  const billAcceptor = !isMultiPos ? equipment.find(eq => eq.name === 'Купюроприемник') : null;
  const otherEquipment = !isMultiPos ? equipment.filter(eq => eq.name !== 'Купюроприемник') : [];

  // Для многопостовой станции — группировка
  const commonEquipment = isMultiPos ? equipment.filter(eq => !eq.posNumber) : [];
  const posNumbers = isMultiPos
    ? [...new Set(equipment.filter(eq => eq.posNumber).map(eq => eq.posNumber!))].sort((a, b) => a - b)
    : [];
  const getPosBillAcceptor = (posNum: number) => equipment.find(eq => eq.posNumber === posNum && eq.name === 'Купюроприемник');
  const getPosOtherEquipment = (posNum: number) => equipment.filter(eq => eq.posNumber === posNum && eq.name !== 'Купюроприемник');

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full ${isMobile ? 'space-y-3 px-3 py-3' : 'space-y-6 px-4 md:px-6 lg:px-8 py-6'} relative overflow-x-hidden`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Pull-to-refresh индикатор */}
        {isMobile && <PullToRefreshIndicator pullState={pullState} pullDistance={pullDistance} />}

        {/* Заголовок страницы */}
        <EquipmentHeader
          terminalInfo={terminalInfo}
          tanks={tanks}
          isMobile={isMobile}
          loading={loading}
          restartingTerminal={restartingTerminal}
          networkName={selectedNetwork?.name}
          tradingPointId={selectedTradingPoint}
          onRefresh={refreshEquipment}
          onRestartTerminal={restartTerminal}
        />

        {/* Терминальное оборудование */}
        <Card className="bg-card border border-border rounded-lg shadow-lg">
          <CardHeader className={`${isMobile ? 'px-3 py-2.5' : 'px-6 py-4'}`}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
              <Settings className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-blue-600 dark:text-blue-400`} />
              Терминальное оборудование
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'px-3 pb-3' : ''}`}>
            {loading && equipment.length === 0 ? (
              <LoadingState message="Загрузка данных оборудования..." />
            ) : isMultiPos ? (
              /* === Многопостовая станция === */
              <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
                {/* Общие элементы (Станция, QR) */}
                {commonEquipment.length > 0 && (
                  <div className={`grid ${isMobile ? 'gap-2 grid-cols-3' : 'gap-3 grid-cols-6'}`}>
                    {commonEquipment.map((eq) => (
                      <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
                    ))}
                  </div>
                )}

                {/* Блоки по постам */}
                {posNumbers.map((posNum) => {
                  const posOther = getPosOtherEquipment(posNum);
                  const posBill = getPosBillAcceptor(posNum);

                  return (
                    <div key={`pos-block-${posNum}`} className={isMobile ? 'space-y-2' : 'space-y-4'}>
                      {/* Заголовок поста */}
                      <div className={`flex items-center gap-2 ${isMobile ? 'px-1' : 'px-2'}`}>
                        <div className={`h-px flex-1 bg-secondary`} />
                        <span className={`text-muted-foreground font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Пост {posNum}
                        </span>
                        <div className={`h-px flex-1 bg-secondary`} />
                      </div>

                      {/* Устройства поста */}
                      <div className={`grid ${isMobile ? 'gap-2 grid-cols-3' : 'gap-3 grid-cols-5'}`}>
                        {posOther.map((eq) => (
                          <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
                        ))}
                      </div>

                      {/* Купюроприемник поста */}
                      {posBill && (
                        <BillAcceptorCard
                          billAcceptor={posBill}
                          isMobile={isMobile}
                          thresholds={billAcceptorThresholds}
                          onSaveThresholds={saveBillAcceptorThresholds}
                          cashoutRecords={cashoutRecords}
                          cashoutLoading={cashoutLoading}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Пороги уровня топлива */}
                {tanks.length > 0 && (
                  <Suspense fallback={<LoadingState message="Загрузка порогов..." />}>
                    <FuelLevelThresholdsCard
                      tanks={tanks}
                      isMobile={isMobile}
                      thresholds={fuelLevelThresholds}
                      onSaveThresholds={saveFuelLevelThresholds}
                      networkId={selectedNetwork?.external_id}
                      stationCode={selectedTradingPoint}
                    />
                  </Suspense>
                )}
              </div>
            ) : (
              /* === Однопостовая станция — текущее поведение === */
              <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
                {/* Оборудование в одну строку */}
                <div className={`grid ${isMobile ? 'gap-2 grid-cols-3' : 'gap-3 grid-cols-6'}`}>
                  {otherEquipment.map((eq) => (
                    <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
                  ))}
                </div>

                {/* Купюроприемник */}
                {billAcceptor && (
                  <BillAcceptorCard
                    billAcceptor={billAcceptor}
                    isMobile={isMobile}
                    thresholds={billAcceptorThresholds}
                    onSaveThresholds={saveBillAcceptorThresholds}
                    cashoutRecords={cashoutRecords}
                    cashoutLoading={cashoutLoading}
                  />
                )}

                {/* Пороги уровня топлива */}
                {tanks.length > 0 && (
                  <Suspense fallback={<LoadingState message="Загрузка порогов..." />}>
                    <FuelLevelThresholdsCard
                      tanks={tanks}
                      isMobile={isMobile}
                      thresholds={fuelLevelThresholds}
                      onSaveThresholds={saveFuelLevelThresholds}
                      networkId={selectedNetwork?.external_id}
                      stationCode={selectedTradingPoint}
                    />
                  </Suspense>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
