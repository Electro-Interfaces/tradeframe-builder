/**
 * Страница резервуаров
 * Отрефакторенная версия с использованием хуков и компонентов
 * ОПТИМИЗИРОВАНО: Добавлена мемоизация для производительности
 */

import { memo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Gauge, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { useTanks } from "@/hooks/useTanks";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { TankCard } from "@/components/tanks/TankCard";
import { PULL_TO_REFRESH_CONFIG } from "@/config/pullToRefresh";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { SelectTradingPointMessage } from "@/components/common/SelectTradingPointMessage";
import { LastDataTransfer } from "@/components/common/LastDataTransfer";
import type { Tank } from "@/types/tanks";

// Мемоизированный компонент списка резервуаров
const TanksList = memo(({ tanks, isMobile }: { tanks: Tank[]; isMobile: boolean }) => (
  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {tanks.map((tank) => (
      <TankCard key={tank.id} tank={tank} isMobile={isMobile} />
    ))}
  </div>
));

export default function Tanks() {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const isMobile = useIsMobile();

  // Хук для загрузки резервуаров
  const { tanks, loading, error, refreshTanks } = useTanks({
    networkId: selectedNetwork?.id,
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
    onRefresh: refreshTanks,
    enabled: isMobile,
    pullThreshold: PULL_TO_REFRESH_CONFIG.PULL_THRESHOLD,
    maxPullDistance: PULL_TO_REFRESH_CONFIG.MAX_PULL_DISTANCE,
    indicatorAppearThreshold: PULL_TO_REFRESH_CONFIG.INDICATOR_APPEAR_THRESHOLD
  });

  // Empty state если не выбрана торговая точка
  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth={true}>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку в селекторе для просмотра данных о резервуарах" />
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <Gauge className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Ошибка загрузки данных</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={refreshTanks} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить попытку
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
        className={`w-full space-y-6 ${isMobile ? 'px-2 py-4' : 'px-4 md:px-6 lg:px-8 py-6'} relative overflow-x-hidden`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Pull-to-refresh индикатор */}
        {isMobile && <PullToRefreshIndicator pullState={pullState} pullDistance={pullDistance} />}

        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-semibold text-foreground`}>Резервуары</h1>
              <LastDataTransfer />
            </div>
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTanks}
                disabled={loading}
                className="border-border text-foreground hover:bg-secondary"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Резервуары - KPI карточки */}
        {loading && tanks.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Загрузка данных резервуаров...</p>
            </div>
          </div>
        ) : (
          <TanksList tanks={tanks} isMobile={isMobile} />
        )}
      </div>
    </MainLayout>
  );
}
