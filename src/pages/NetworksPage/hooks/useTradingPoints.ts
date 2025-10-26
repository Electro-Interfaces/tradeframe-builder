import { useState, useEffect, useCallback } from 'react';
import { TradingPoint, TradingPointInput, TradingPointUpdateInput } from '@/types/tradingpoint';
import { tradingPointsService } from '@/services/tradingPointsService';
import { useToast } from '@/hooks/use-toast';

interface UseTradingPointsReturn {
  tradingPoints: TradingPoint[];
  loading: boolean;
  actionLoading: string | null;
  loadTradingPoints: (networkId: string) => Promise<void>;
  createTradingPoint: (input: TradingPointInput) => Promise<void>;
  updateTradingPoint: (id: string, input: TradingPointUpdateInput) => Promise<TradingPoint | null>;
  deleteTradingPoint: (id: string) => Promise<void>;
  searchTradingPoints: (query: string) => TradingPoint[];
}

export function useTradingPoints(networkId: string | null): UseTradingPointsReturn {
  const { toast } = useToast();
  const [tradingPoints, setTradingPoints] = useState<TradingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTradingPoints = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const points = await tradingPointsService.getByNetworkId(id);
      setTradingPoints(points);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить торговые точки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createTradingPoint = useCallback(async (input: TradingPointInput) => {
    setActionLoading('create');
    try {
      const created = await tradingPointsService.create(input);
      setTradingPoints(prev => [created, ...prev]);

      toast({
        title: "Успешно",
        description: "Торговая точка создана"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [toast]);

  const updateTradingPoint = useCallback(async (id: string, input: TradingPointUpdateInput): Promise<TradingPoint | null> => {
    setActionLoading(`update-${id}`);
    try {
      const updated = await tradingPointsService.update(id, input);
      if (updated) {
        // Если external_id изменился, то изменился и ID точки
        // Удаляем старую запись и добавляем новую
        setTradingPoints(prev => {
          const filtered = prev.filter(p => p.id !== id);
          return [updated, ...filtered];
        });

        toast({
          title: "Успешно",
          description: "Торговая точка обновлена"
        });

        return updated;
      }
      return null;
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [toast]);

  const deleteTradingPoint = useCallback(async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      await tradingPointsService.delete(id);
      setTradingPoints(prev => prev.filter(p => p.id !== id));

      toast({
        title: "Успешно",
        description: "Торговая точка удалена"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [toast]);

  const searchTradingPoints = useCallback((query: string): TradingPoint[] => {
    if (!query.trim()) {
      return tradingPoints;
    }

    const lowerQuery = query.toLowerCase();
    return tradingPoints.filter(point =>
      point.name.toLowerCase().includes(lowerQuery) ||
      point.description?.toLowerCase().includes(lowerQuery) ||
      point.geolocation?.address?.toLowerCase().includes(lowerQuery) ||
      point.geolocation?.city?.toLowerCase().includes(lowerQuery) ||
      point.phone?.toLowerCase().includes(lowerQuery) ||
      point.email?.toLowerCase().includes(lowerQuery)
    );
  }, [tradingPoints]);

  // Загрузка при изменении networkId
  useEffect(() => {
    if (networkId) {
      loadTradingPoints(networkId);
    } else {
      setTradingPoints([]);
    }
  }, [networkId, loadTradingPoints]);

  return {
    tradingPoints,
    loading,
    actionLoading,
    loadTradingPoints,
    createTradingPoint,
    updateTradingPoint,
    deleteTradingPoint,
    searchTradingPoints
  };
}
