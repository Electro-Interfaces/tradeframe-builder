/**
 * Страница резервуаров — Deep Intel стиль
 */

import { memo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Fuel, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { useTanks } from "@/hooks/useTanks";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { TankCard } from "@/components/tanks/TankCard";
import { PULL_TO_REFRESH_CONFIG } from "@/config/pullToRefresh";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { LastDataTransfer } from "@/components/common/LastDataTransfer";
import { Button } from "@/components/ui/button";
import type { Tank } from "@/types/tanks";

const TanksList = memo(({ tanks, isMobile }: { tanks: Tank[]; isMobile: boolean }) => (
  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
    {tanks.map((tank) => (
      <TankCard key={tank.id} tank={tank} isMobile={isMobile} />
    ))}
  </div>
));

export default function Tanks() {
  const { selectedNetwork, selectedTradingPoint, selectedStation } = useSelection();
  const isMobile = useIsMobile();

  const { tanks, loading, error, refreshTanks } = useTanks({
    networkId: selectedNetwork?.id,
    tradingPointId: selectedTradingPoint,
    autoLoad: true,
    showToasts: !isMobile
  });

  const {
    pullState,
    pullDistance,
    scrollContainerRef
  } = usePullToRefresh({
    onRefresh: refreshTanks,
    enabled: isMobile,
    pullThreshold: PULL_TO_REFRESH_CONFIG.PULL_THRESHOLD,
    maxPullDistance: PULL_TO_REFRESH_CONFIG.MAX_PULL_DISTANCE,
    indicatorAppearThreshold: PULL_TO_REFRESH_CONFIG.INDICATOR_APPEAR_THRESHOLD
  });

  // Слушаем кнопку обновления из BottomNav
  useEffect(() => {
    const handler = () => refreshTanks();
    window.addEventListener('bottomnav-refresh', handler);
    return () => window.removeEventListener('bottomnav-refresh', handler);
  }, [refreshTanks]);

  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку для просмотра данных о резервуарах" />
        </div>
      </MainLayout>
    );
  }

  if (error && !loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <Fuel className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-headline font-bold text-foreground mb-2">Ошибка загрузки</h2>
            <p className="text-muted-foreground text-sm mb-4">{error.message}</p>
            <Button onClick={refreshTanks} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full relative overflow-x-hidden ${isMobile ? 'px-2 py-2' : 'px-4 md:px-6 lg:px-8 py-6'}`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {isMobile && <PullToRefreshIndicator pullState={pullState} pullDistance={pullDistance} />}

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>
              Резервуары{!isMobile && selectedStation?.name ? ` · ${selectedStation.name}` : ''}
            </h1>
            <LastDataTransfer />
          </div>
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTanks}
              disabled={loading}
              className="border-di-outline-variant/15 text-muted-foreground hover:bg-di-surface-high"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {/* Tanks grid */}
        {loading && tanks.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Загрузка резервуаров...</p>
            </div>
          </div>
        ) : (
          <TanksList tanks={tanks} isMobile={isMobile} />
        )}
      </div>
    </MainLayout>
  );
}
