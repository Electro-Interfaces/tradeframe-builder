/**
 * Хук для загрузки и управления данными купонов
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/contexts/SelectionContext';
import { couponsApiService } from '@/services/couponsApiService';
import { tradingPointsService } from '@/services/tradingPointsService';
import { fetchCouponUsage } from '@/services/analyticsService';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import type {
  CouponsSearchResult,
  CouponsFilter,
  CouponsApiParams,
  CouponWithAge
} from '@/types/coupons';

export function useCouponsData() {
  const { toast } = useToast();
  const { selectedTradingPoint, selectedNetwork } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();

  const [searchResult, setSearchResult] = useState<CouponsSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optimisticRef = useRef<CouponWithAge[]>([]);

  /**
   * Загрузка данных купонов с API
   * filters.system — основная сеть, filters.systems — все выбранные сети (мультиселект)
   */
  const loadCouponsData = async (filters: CouponsFilter & { systems?: number[] }) => {
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

      // Эффективный список system IDs: мультиселект или один
      const systemIds = (filters.systems && filters.systems.length > 0)
        ? filters.systems
        : [filters.system];

      // Загружаем купоны из всех систем параллельно
      const allResults = await Promise.all(
        systemIds.map(async (sys) => {
          const apiParams: CouponsApiParams = {
            system: sys,
            ...(tradingPointExternalId && { station: tradingPointExternalId }),
            ...(filters.dateFrom && { dt_beg: filters.dateFrom }),
            ...(filters.dateTo && { dt_end: filters.dateTo })
          };
          const [api, manual] = await Promise.all([
            couponsApiService.getCoupons(apiParams).catch(() => [] as any),
            couponsApiService.getManualCoupons(apiParams).catch(() => [] as any)
          ]);
          return { api, manual };
        })
      );

      // Мержим результаты из всех сетей
      const apiResponse = allResults.length === 1
        ? allResults[0].api
        : allResults.reduce((acc, r) => {
            if (Array.isArray(r.api)) return [...(Array.isArray(acc) ? acc : []), ...r.api];
            if (Array.isArray(acc)) return acc;
            // Объект с полями — мержим массивы внутри
            const merged = { ...acc };
            Object.keys(r.api || {}).forEach(key => {
              if (Array.isArray((r.api as any)[key]) && Array.isArray((merged as any)[key])) {
                (merged as any)[key] = [...(merged as any)[key], ...(r.api as any)[key]];
              }
            });
            return merged;
          }, allResults[0].api);

      const manualResponse = allResults.flatMap(r => Array.isArray(r.manual) ? r.manual : []);

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

      // Даты реализации — вторым шагом: страница уже показана, а сопоставление с
      // транзакциями идёт по нашей БД и не должно задерживать список купонов.
      setLoading(false);
      const networkIds = selectedNetworks.map(n => n.id).filter(Boolean);
      const toMatch = filteredResult.groups.flatMap(g =>
        g.coupons
          .filter(c => !c.isOptimistic && c.stationCode != null)
          .map(c => ({
            number: String(c.number),
            station: Number(c.stationCode),
            dt: new Date(c.dt).toISOString(),
            qty_used: c.qty_used,
            summ_used: c.summ_used,
          }))
      );
      if (networkIds.length > 0 && toMatch.length > 0) {
        const usage = await fetchCouponUsage(networkIds, toMatch).catch(() => ({}));
        if (Object.keys(usage).length > 0) {
          setSearchResult(prev => prev && {
            ...prev,
            groups: prev.groups.map(g => ({
              ...g,
              coupons: g.coupons.map(c => (usage[c.number] ? { ...c, redeemedAt: usage[c.number] } : c)),
            })),
          });
        }
      }

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
