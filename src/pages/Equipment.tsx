/**
 * Страница оборудования
 * Отрефакторенная версия с использованием хуков и компонентов
 */

import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useThresholds } from "@/hooks/useThresholds";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { BillAcceptorCard } from "@/components/equipment/BillAcceptorCard";
import { FuelLevelThresholdsCard } from "@/components/equipment/FuelLevelThresholdsCard";
import { EquipmentHeader } from "@/components/equipment/EquipmentHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/PageStates";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { PULL_TO_REFRESH_CONFIG } from "@/config/pullToRefresh";

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint, isInitialized } = useSelection();
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
    autoLoad: true,
    showToasts: !isMobile
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

  // Разделяем купюроприемник и остальное оборудование
  const billAcceptor = equipment.find(eq => eq.name === 'Купюроприемник');
  const otherEquipment = equipment.filter(eq => eq.name !== 'Купюроприемник');

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full ${isMobile ? 'space-y-3 px-3 py-3' : 'space-y-6 px-4 md:px-6 lg:px-8 py-6'} relative overflow-hidden`}
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
          isMobile={isMobile}
          loading={loading}
          restartingTerminal={restartingTerminal}
          networkName={selectedNetwork?.name}
          tradingPointId={selectedTradingPoint}
          onRefresh={refreshEquipment}
          onRestartTerminal={restartTerminal}
        />

        {/* Терминальное оборудование */}
        <Card className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <CardHeader className={`${isMobile ? 'px-3 py-2.5' : 'px-6 py-4'}`}>
            <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
              <Settings className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-blue-400`} />
              Терминальное оборудование
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'px-3 pb-3' : ''}`}>
            {loading && equipment.length === 0 ? (
              <LoadingState message="Загрузка данных оборудования..." />
            ) : (
              <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
                {/* Купюроприемник - отдельная большая карточка */}
                {billAcceptor && (
                  <BillAcceptorCard
                    billAcceptor={billAcceptor}
                    isMobile={isMobile}
                    thresholds={billAcceptorThresholds}
                    onSaveThresholds={saveBillAcceptorThresholds}
                  />
                )}

                {/* Пороги уровня топлива - отдельная карточка */}
                {tanks.length > 0 && (
                  <FuelLevelThresholdsCard
                    tanks={tanks}
                    isMobile={isMobile}
                    thresholds={fuelLevelThresholds}
                    onSaveThresholds={saveFuelLevelThresholds}
                    networkId={selectedNetwork?.external_id}
                    stationCode={selectedTradingPoint}
                  />
                )}

                {/* Остальное оборудование в сетке */}
                <div className={`grid ${isMobile ? 'gap-2.5 grid-cols-2' : 'gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
                  {otherEquipment.map((eq) => (
                    <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
