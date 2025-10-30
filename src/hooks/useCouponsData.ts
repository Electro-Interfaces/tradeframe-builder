/**
 * Хук для загрузки и управления данными купонов
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/contexts/SelectionContext';
import { couponsApiService } from '@/services/couponsApiService';
import { tradingPointsService } from '@/services/tradingPointsService';
import type {
  CouponsSearchResult,
  CouponsFilter,
  CouponsApiParams
} from '@/types/coupons';

export function useCouponsData() {
  const { toast } = useToast();
  const { selectedTradingPoint, selectedNetwork } = useSelection();

  const [searchResult, setSearchResult] = useState<CouponsSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Загружаем данные с API
      const apiResponse = await couponsApiService.getCoupons(apiParams);

      // Обрабатываем ответ API, передаем название ТТ
      const processedResult = await couponsApiService.processRawCoupons(
        apiResponse,
        tradingPointName
      );

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

  return {
    searchResult,
    loading,
    error,
    loadCouponsData
  };
}
