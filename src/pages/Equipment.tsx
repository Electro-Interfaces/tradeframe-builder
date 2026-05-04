/**
 * Страница оборудования — Deep Intel Equipment Monitor
 * Референс: stitch(2) — Status Grid + Banknote Acceptor + Fuel Reservoirs
 */

import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEquipment } from "@/hooks/useEquipment";
import { useStationNetworkId } from "@/hooks/useStationNetworkId";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useThresholds } from "@/hooks/useThresholds";
import { useCashoutHistory } from "@/hooks/useCashoutHistory";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { BillAcceptorCard } from "@/components/equipment/BillAcceptorCard";
import { EquipmentHeader } from "@/components/equipment/EquipmentHeader";
import { LoadingState, ErrorState } from "@/components/common/PageStates";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { PULL_TO_REFRESH_CONFIG } from "@/config/pullToRefresh";

const FuelLevelThresholdsCard = lazy(() => import("@/components/equipment/FuelLevelThresholdsCard").then(m => ({ default: m.FuelLevelThresholdsCard })));

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint, selectedStation, isInitialized } = useSelection();
  const stationNetworkId = useStationNetworkId();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInventoryAdjustment = () => {
    navigate('/point/inventory-adjustments?create=1');
  };

  const {
    billAcceptorThresholds,
    fuelLevelThresholds,
    saveBillAcceptorThresholds,
    saveFuelLevelThresholds
  } = useThresholds({ tradingPointId: selectedTradingPoint });

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
    networkId: stationNetworkId,
    tradingPointId: selectedTradingPoint,
    station: selectedStation,
    autoLoad: true,
    showToasts: !isMobile
  });

  const {
    cashoutRecords,
    loading: cashoutLoading
  } = useCashoutHistory({
    networkId: stationNetworkId,
    tradingPointId: selectedTradingPoint,
    autoLoad: true
  });

  // Слушаем кнопку обновления из BottomNav
  useEffect(() => {
    const handler = () => refreshEquipment();
    window.addEventListener('bottomnav-refresh', handler);
    return () => window.removeEventListener('bottomnav-refresh', handler);
  }, [refreshEquipment]);

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

  if (!isInitialized) {
    return <MainLayout fullWidth={true}><LoadingState message="Инициализация данных..." /></MainLayout>;
  }

  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку в селекторе для просмотра оборудования" />
        </div>
      </MainLayout>
    );
  }

  if (error && !loading) {
    return (
      <MainLayout fullWidth={true}>
        <ErrorState title="Ошибка загрузки данных" message={error.message} onRetry={refreshEquipment} loading={loading} />
      </MainLayout>
    );
  }

  const isMultiPos = (terminalInfo?.pos?.length || 0) > 1;
  const billAcceptor = !isMultiPos ? equipment.find(eq => eq.name === 'Купюроприемник') : null;
  const otherEquipment = !isMultiPos ? equipment.filter(eq => eq.name !== 'Купюроприемник') : [];

  const commonEquipment = isMultiPos ? equipment.filter(eq => !eq.posNumber) : [];
  const posNumbers = isMultiPos
    ? [...new Set(equipment.filter(eq => eq.posNumber).map(eq => eq.posNumber!))].sort((a, b) => a - b)
    : [];
  const getPosBillAcceptor = (posNum: number) => equipment.find(eq => eq.posNumber === posNum && eq.name === 'Купюроприемник');
  const getPosOtherEquipment = (posNum: number) => equipment.filter(eq => eq.posNumber === posNum && eq.name !== 'Купюроприемник');

  /** Рендер сетки устройств (Status Grid row) */
  const renderEquipmentGrid = (items: typeof equipment) => (
    <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : `gap-4`}`} style={isMobile ? undefined : { gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, 1fr)` }}>
      {items.map((eq) => (
        <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
      ))}
    </div>
  );

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full relative overflow-x-hidden ${isMobile ? 'px-2 py-2' : 'px-4 md:px-6 lg:px-8 pt-0 pb-6'}`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {isMobile && <PullToRefreshIndicator pullState={pullState} pullDistance={pullDistance} />}

        {/* Header */}
        <EquipmentHeader
          terminalInfo={terminalInfo}
          tanks={tanks}
          isMobile={isMobile}
          loading={loading}
          restartingTerminal={restartingTerminal}
          networkName={selectedNetwork?.name}
          tradingPointId={selectedTradingPoint}
          stationName={selectedStation?.name}
          onRefresh={refreshEquipment}
          onRestartTerminal={restartTerminal}
          onInventoryAdjustment={handleInventoryAdjustment}
        />

        {loading && equipment.length === 0 ? (
          <LoadingState message="Загрузка данных оборудования..." />
        ) : isMultiPos ? (
          /* ══════ Многопостовая станция ══════ */
          <div className={isMobile ? 'space-y-5 mt-3' : 'space-y-10 mt-6'}>
            {/* Общие элементы */}
            {commonEquipment.length > 0 && renderEquipmentGrid(commonEquipment)}

            {/* Блоки по постам */}
            {posNumbers.map((posNum) => {
              const posOther = getPosOtherEquipment(posNum);
              const posBill = getPosBillAcceptor(posNum);

              return (
                <div key={`pos-block-${posNum}`} className={isMobile ? 'space-y-4' : 'space-y-6'}>
                  {/* Divider — Deep Intel style */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-di-outline-variant/15" />
                    <span className={`font-headline font-bold uppercase tracking-[0.2em] text-di-on-surface-variant ${
                      isMobile ? 'text-[10px]' : 'text-xs'
                    }`}>
                      Пост {posNum}
                    </span>
                    <div className="h-px flex-1 bg-di-outline-variant/15" />
                  </div>

                  {/* Status Grid */}
                  {renderEquipmentGrid(posOther)}

                  {/* Banknote Acceptor */}
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

            {/* Fuel Reservoirs */}
            {tanks.length > 0 && (
              <Suspense fallback={<LoadingState message="Загрузка порогов..." />}>
                <FuelLevelThresholdsCard
                  tanks={tanks}
                  isMobile={isMobile}
                  thresholds={fuelLevelThresholds}
                  onSaveThresholds={saveFuelLevelThresholds}
                  networkId={stationNetworkId}
                  stationCode={selectedTradingPoint}
                />
              </Suspense>
            )}
          </div>
        ) : (
          /* ══════ Однопостовая станция ══════ */
          <div className={isMobile ? 'space-y-5 mt-3' : 'space-y-10 mt-6'}>
            {/* Status Grid — top row */}
            {renderEquipmentGrid(otherEquipment)}

            {/* Banknote Acceptor — main display */}
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

            {/* Fuel Reservoirs — bottom table */}
            {tanks.length > 0 && (
              <Suspense fallback={<LoadingState message="Загрузка порогов..." />}>
                <FuelLevelThresholdsCard
                  tanks={tanks}
                  isMobile={isMobile}
                  thresholds={fuelLevelThresholds}
                  onSaveThresholds={saveFuelLevelThresholds}
                  networkId={stationNetworkId}
                  stationCode={selectedTradingPoint}
                />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
