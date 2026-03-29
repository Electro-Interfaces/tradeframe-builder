/**
 * CouponsPage — Страница управления купонами
 */

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSelection } from '@/contexts/SelectionContext';
import { useStationNetworkId } from '@/hooks/useStationNetworkId';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { LastDataTransfer } from '@/components/common/LastDataTransfer';

import { useCouponsData } from '@/hooks/useCouponsData';
import { useCouponFilters } from '@/hooks/useCouponFilters';
import { useCouponStats } from '@/hooks/useCouponStats';
import { useCouponPagination } from '@/hooks/useCouponPagination';

import { CouponStatsCards } from '@/components/coupons/CouponStatsCards';
import { CouponFilters } from '@/components/coupons/CouponFilters';
import { CouponKpiCards } from '@/components/coupons/CouponKpiCards';
import { CouponTable } from '@/components/coupons/CouponTable';
import { CouponTableMobile } from '@/components/coupons/CouponTableMobile';
import { CouponDetailsModal } from '@/components/coupons/CouponDetailsModal';
import { CreateCouponModal } from '@/components/coupons/CreateCouponModal';

import { couponsExportService } from '@/services/couponsExportService';
import type { Coupon } from '@/types/coupons';

export default function CouponsPage() {
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork, selectedStation } = useSelection();
  const stationNetworkId = useStationNetworkId();
  const { selectedExternalIds } = useSelectedNetworks();

  const { searchResult, loading, error, loadCouponsData, addOptimisticCoupon } = useCouponsData();
  const {
    filters, setFilters, filtersOpen, setFiltersOpen,
    selectedKpiStates, selectedFuelType,
    handleKpiStateClick, handleFuelTypeKpiClick, handleKpiResetAll, clearAllFilters
  } = useCouponFilters();

  const handleRefreshData = async () => {
    const systemIds = selectedExternalIds.map(Number).filter(n => !isNaN(n));
    if (systemIds.length > 0) {
      await loadCouponsData({ ...filters, system: systemIds[0], systems: systemIds });
    }
  };

  const { pullState, pullDistance, scrollContainerRef } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: 30
  });

  const { allCoupons, filteredCoupons, uniqueStates, uniqueFuelTypes, fuelStats, computedStats } =
    useCouponStats(searchResult, filters, selectedKpiStates, selectedFuelType);

  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    useCouponPagination(filteredCoupons);

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const stationFuelOptions = useMemo(() => {
    const fuelMap = new Map<number, string>();
    allCoupons.forEach(c => {
      if (c.service.service_name.toLowerCase().includes('руб')) return;
      if (!fuelMap.has(c.service.service_code)) {
        fuelMap.set(c.service.service_code, c.service.service_name);
      }
    });
    return Array.from(fuelMap.entries()).map(([code, label]) => ({ code, label }));
  }, [allCoupons]);

  useEffect(() => {
    if (selectedExternalIds.length > 0) {
      const systemIds = selectedExternalIds.map(Number).filter(n => !isNaN(n));
      if (systemIds.length > 0) {
        loadCouponsData({ ...filters, system: systemIds[0], systems: systemIds });
      }
    }
  }, [selectedTradingPoint, selectedExternalIds]);

  // Слушаем BottomNav refresh
  useEffect(() => {
    const handler = () => handleRefreshData();
    window.addEventListener('bottomnav-refresh', handler);
    return () => window.removeEventListener('bottomnav-refresh', handler);
  }, [handleRefreshData]);

  const handleExport = async () => {
    try {
      await couponsExportService.exportToExcel(searchResult, {
        networkName: selectedNetwork?.name,
        stationName: selectedTradingPoint?.name
      });
    } catch (error) {
      console.error('Ошибка экспорта:', error);
    }
  };

  const handleCouponClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsDetailsOpen(true);
  };

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
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>Купоны</h1>
            <LastDataTransfer />
          </div>
          <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-center shrink-0`}>
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefreshData()}
                disabled={loading}
                className="border-di-outline-variant/15 text-muted-foreground hover:bg-di-surface-high"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {filteredCoupons.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-di-outline-variant/15 text-muted-foreground hover:bg-di-surface-high"
              >
                <Download className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
                {!isMobile && 'Экспорт'}
              </Button>
            )}
            {stationNetworkId && selectedStation?.external_id && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
                {!isMobile && 'Создать купон'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {searchResult && searchResult.stats && (
          <CouponStatsCards stats={searchResult.stats} {...computedStats} />
        )}

        {/* Filters */}
        <CouponFilters
          filters={filters}
          setFilters={setFilters}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          loading={loading}
          onRefresh={() => loadCouponsData(filters)}
          onClearFilters={clearAllFilters}
        />

        {/* KPI */}
        <CouponKpiCards
          uniqueStates={uniqueStates}
          uniqueFuelTypes={uniqueFuelTypes}
          fuelStats={fuelStats}
          allCoupons={allCoupons}
          filteredCoupons={filteredCoupons}
          selectedKpiStates={selectedKpiStates}
          selectedFuelType={selectedFuelType}
          onStateClick={handleKpiStateClick}
          onFuelTypeClick={handleFuelTypeKpiClick}
          onResetAll={handleKpiResetAll}
        />

        {/* Table */}
        <div className="bg-di-surface-mid rounded-xl border border-transparent p-4">
          <h2 className={`font-headline font-bold text-foreground mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>
            Журнал купонов
            <span className="text-muted-foreground ml-2 font-normal text-sm">({filteredCoupons.length})</span>
          </h2>

          {isMobile ? (
            <CouponTableMobile
              coupons={paginatedItems}
              onCouponClick={handleCouponClick}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          ) : (
            <CouponTable
              coupons={paginatedItems}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          )}
        </div>
      </div>

      <CouponDetailsModal
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        coupon={selectedCoupon}
      />

      {stationNetworkId && selectedStation?.external_id && (
        <CreateCouponModal
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          systemId={Number(stationNetworkId)}
          stationId={Number(selectedStation.external_id)}
          fuelOptions={stationFuelOptions}
          networkName={selectedNetwork.name}
          stationName={selectedStation.name}
          onSuccess={() => loadCouponsData(filters)}
          onCouponCreated={addOptimisticCoupon}
        />
      )}
    </MainLayout>
  );
}
