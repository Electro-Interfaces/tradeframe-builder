/**
 * CouponsPage - Страница управления купонами
 * Рефакторинг: разделение на компоненты и хуки
 */

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { Download, Plus } from 'lucide-react';

// Хуки
import { useCouponsData } from '@/hooks/useCouponsData';
import { useCouponFilters } from '@/hooks/useCouponFilters';
import { useCouponStats } from '@/hooks/useCouponStats';
import { useCouponPagination } from '@/hooks/useCouponPagination';

// Компоненты
import { CouponStatsCards } from '@/components/coupons/CouponStatsCards';
import { CouponFilters } from '@/components/coupons/CouponFilters';
import { CouponKpiCards } from '@/components/coupons/CouponKpiCards';
import { CouponTable } from '@/components/coupons/CouponTable';
import { CouponTableMobile } from '@/components/coupons/CouponTableMobile';
import { CouponDetailsModal } from '@/components/coupons/CouponDetailsModal';
import { CreateCouponModal } from '@/components/coupons/CreateCouponModal';

// Сервисы
import { couponsExportService } from '@/services/couponsExportService';

import type { Coupon } from '@/types/coupons';

export default function CouponsPage() {
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork, selectedStation } = useSelection();
  const { selectedExternalIds } = useSelectedNetworks();

  // Хуки для управления данными и фильтрами
  const { searchResult, loading, error, loadCouponsData, addOptimisticCoupon } = useCouponsData();
  const {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    selectedKpiStates,
    selectedFuelType,
    handleKpiStateClick,
    handleFuelTypeKpiClick,
    handleKpiResetAll,
    clearAllFilters
  } = useCouponFilters();

  // Статистика и фильтрация
  const { allCoupons, filteredCoupons, uniqueStates, uniqueFuelTypes, fuelStats, computedStats } =
    useCouponStats(searchResult, filters, selectedKpiStates, selectedFuelType);

  // Пагинация
  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    useCouponPagination(filteredCoupons);

  // Модальное окно деталей
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Модальное окно создания купона
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Виды топлива на данной АЗС (из загруженных купонов)
  const stationFuelOptions = useMemo(() => {
    const fuelMap = new Map<number, string>();
    allCoupons.forEach(c => {
      // Пропускаем рублёвые позиции — они не являются видами топлива
      if (c.service.service_name.toLowerCase().includes('руб')) return;
      if (!fuelMap.has(c.service.service_code)) {
        fuelMap.set(c.service.service_code, c.service.service_name);
      }
    });
    return Array.from(fuelMap.entries()).map(([code, label]) => ({ code, label }));
  }, [allCoupons]);

  
  // Загрузка данных при изменении сети или точки
  // ВАЖНО: передаём system напрямую из selectedExternalIds, т.к. filters.system
  // обновляется асинхронно через отдельный useEffect и может быть устаревшим
  useEffect(() => {
    if (selectedExternalIds.length > 0) {
      // Используем первую выбранную сеть для system (API принимает один systemId)
      const systemId = Number(selectedExternalIds[0]);
      if (!isNaN(systemId)) {
        loadCouponsData({ ...filters, system: systemId });
      }
    }
  }, [selectedTradingPoint, selectedExternalIds]);

  // Экспорт в Excel
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

  // Обработка клика по купону в мобильной версии
  const handleCouponClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsDetailsOpen(true);
  };

  return (
    <MainLayout fullWidth={true}>
      <div
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-x-hidden ${
          isMobile ? 'pt-4' : 'pt-6'
        } min-h-screen bg-gradient-to-br from-background via-background to-background`}
      >
        {/* Заголовок */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Купоны</h1>
            <div className="flex items-center gap-2">
              {selectedNetwork?.external_id && selectedStation?.external_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать купон
                </Button>
              )}
              {filteredCoupons.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="border-green-600 text-green-600 hover:bg-emerald-600 hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Карточки статистики */}
        {searchResult && searchResult.stats && (
          <CouponStatsCards stats={searchResult.stats} {...computedStats} />
        )}

        {/* Фильтры */}
        <CouponFilters
          filters={filters}
          setFilters={setFilters}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          loading={loading}
          onRefresh={() => loadCouponsData(filters)}
          onClearFilters={clearAllFilters}
        />

        {/* KPI карточки */}
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

        {/* Таблица купонов */}
        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Журнал купонов
              <span className="text-muted-foreground ml-2 font-normal text-sm">
                ({filteredCoupons.length})
              </span>
            </h2>
          </div>

          <Card className="bg-background border-border">
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
          </Card>
        </div>
      </div>

      {/* Модальное окно деталей */}
      <CouponDetailsModal
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        coupon={selectedCoupon}
      />

      {/* Модальное окно создания купона */}
      {selectedNetwork?.external_id && selectedStation?.external_id && (
        <CreateCouponModal
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          systemId={Number(selectedNetwork.external_id)}
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
