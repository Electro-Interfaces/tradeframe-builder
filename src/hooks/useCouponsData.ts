/**
 * Хук для загрузки и управления данными купонов
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/contexts/SelectionContext';
import { couponsApiService } from '@/services/couponsApiService';
import { tradingPointsService } from '@/services/tradingPointsService';
import type {
  CouponsSearchResult,
  CouponsFilter,
  CouponsApiParams,
  CouponWithAge
} from '@/types/coupons';

export function useCouponsData() {
  const { toast } = useToast();
  const { selectedTradingPoint, selectedNetwork } = useSelection();

  const [searchResult, setSearchResult] = useState<CouponsSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optimisticRef = useRef<CouponWithAge[]>([]);

  /**
   * Загрузка данных купонов с API
   */
  const loadCouponsData = async (filters: CouponsFilter) => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем полный объект торговой точки для получения external_id
      let tradingPointExternalId: number | undefined;
      let tradingPointName: string | undefined;

      if (selectedTradingPoint) {
        const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
        if (tradingPoint?.external_id && !isNaN(Number(tradingPoint.external_id))) {
          tradingPointExternalId = Number(tradingPoint.external_id);
          tradingPointName = tradingPoint.name;
        }
      }

      // Параметры запроса к API
      const apiParams: CouponsApiParams = {
        system: filters.system,
        // Используем external_id торговой точки если он число
        ...(tradingPointExternalId && { station: tradingPointExternalId }),
        ...(filters.dateFrom && { dt_beg: filters.dateFrom }),
        ...(filters.dateTo && { dt_end: filters.dateTo })
      };

      // Загружаем обычные и ручные купоны параллельно
      const [apiResponse, manualResponse] = await Promise.all([
        couponsApiService.getCoupons(apiParams),
        couponsApiService.getManualCoupons(apiParams).catch(() => [])
      ]);

      // Обогащаем обычные купоны данными comment/user из ручных
      const enrichedResponse = couponsApiService.enrichWithManualData(apiResponse, manualResponse);

      // Обрабатываем ответ API, передаем название ТТ
      const processedResult = await couponsApiService.processRawCoupons(
        enrichedResponse,
        tradingPointName
      );

      // Вставляем оптимистичные купоны, которых API ещё не вернул
      if (optimisticRef.current.length > 0 && processedResult.groups.length > 0) {
        const group = processedResult.groups[0];
        const apiNumbers = new Set(group.coupons.map(c => c.number));
        const missing = optimisticRef.current.filter(c => !apiNumbers.has(c.number));
        if (missing.length > 0) {
          group.coupons = [...missing, ...group.coupons];
          processedResult.stats.totalCoupons += missing.length;
          processedResult.stats.activeCoupons += missing.length;
          processedResult.totalFound += missing.length;
        }
        // Убираем из ref купоны, которые уже пришли из API
        optimisticRef.current = missing;
      }

      // Применяем дополнительные фильтры
      const filteredResult = couponsApiService.filterCoupons(processedResult, filters);

      setSearchResult(filteredResult);

    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка при загрузке данных';
      setError(errorMessage);

      // В случае ошибки API используем пустой результат
      setSearchResult({
        groups: [],
        stats: {
          totalCoupons: 0,
          activeCoupons: 0,
          redeemedCoupons: 0,
          totalDebt: 0,
          totalAmount: 0,
          usedAmount: 0,
          averageRest: 0,
          oldCouponsCount: 0,
          criticalCouponsCount: 0,
          expiredCoupons: 0,
          expiredAmount: 0,
          totalFuelDelivered: 0,
          expiredFuelLoss: 0,
          utilizationRate: 0
        },
        totalFound: 0,
        appliedFilters: filters
      });

      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Оптимистичное добавление купона в UI сразу после создания.
   * Купон сохраняется в отдельный список и добавляется в UI.
   * При обновлении из API — если купон уже есть, удаляется из оптимистичных.
   */
  const addOptimisticCoupon = useCallback((coupon: CouponWithAge) => {
    optimisticRef.current = [...optimisticRef.current, coupon];
    setSearchResult(prev => {
      if (!prev || prev.groups.length === 0) return prev;
      const group = { ...prev.groups[0] };
      if (group.coupons.some(c => c.number === coupon.number)) return prev;
      group.coupons = [coupon, ...group.coupons];
      return {
        ...prev,
        groups: [group, ...prev.groups.slice(1)],
        stats: {
          ...prev.stats,
          totalCoupons: prev.stats.totalCoupons + 1,
          activeCoupons: prev.stats.activeCoupons + 1,
          totalAmount: prev.stats.totalAmount + coupon.rest_summ,
          totalDebt: prev.stats.totalDebt + coupon.rest_summ,
        },
        totalFound: prev.totalFound + 1,
      };
    });
  }, []);

  return {
    searchResult,
    loading,
    error,
    loadCouponsData,
    addOptimisticCoupon
  };
}
