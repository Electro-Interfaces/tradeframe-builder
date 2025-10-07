/**
 * Хук для загрузки объекта торговой точки по ID
 */

import { useState, useEffect } from 'react';

interface UseTradingPointOptions {
  tradingPointId: string | null;
  networkId: string | null;
}

export function useTradingPoint({ tradingPointId, networkId }: UseTradingPointOptions) {
  const [tradingPoint, setTradingPoint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTradingPoint = async () => {
      if (!tradingPointId || !networkId) {
        setTradingPoint(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const tradingPointsService = (await import('@/services/tradingPointsService')).default;
        const points = await tradingPointsService.getByNetworkId(networkId);
        const point = points.find(p => p.id === tradingPointId);

        setTradingPoint(point || null);
      } catch (err: any) {
        const errorMessage = err.message || 'Ошибка загрузки торговой точки';
        setError(errorMessage);
        setTradingPoint(null);
      } finally {
        setLoading(false);
      }
    };

    loadTradingPoint();
  }, [tradingPointId, networkId]);

  return {
    tradingPoint,
    loading,
    error
  };
}
