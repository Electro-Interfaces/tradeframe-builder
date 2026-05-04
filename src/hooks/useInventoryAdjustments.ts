import { useCallback, useEffect, useState } from 'react';
import { inventoryAdjustmentsService } from '@/services/inventoryAdjustmentsService';
import { useToast } from '@/hooks/use-toast';
import type {
  InventoryAdjustment,
  InventoryAdjustmentsListFilters,
} from '@/types/inventoryAdjustment';

export interface UseInventoryAdjustmentsResult {
  items: InventoryAdjustment[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  removeDraft: (id: string) => Promise<void>;
  cancelDraft: (id: string, reason?: string) => Promise<void>;
}

export function useInventoryAdjustments(
  filters: InventoryAdjustmentsListFilters
): UseInventoryAdjustmentsResult {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!filters.networkId || !filters.tradingPointId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await inventoryAdjustmentsService.list(filters);
      setItems(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документы корректировки: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters.networkId, filters.tradingPointId, filters.status, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeDraft = useCallback(
    async (id: string) => {
      try {
        await inventoryAdjustmentsService.remove(id);
        toast({ title: 'Документ удалён' });
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast({
          title: 'Ошибка',
          description: 'Не удалось удалить документ: ' + error.message,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [load, toast]
  );

  const cancelDraft = useCallback(
    async (id: string, reason?: string) => {
      try {
        await inventoryAdjustmentsService.cancel(id, reason);
        toast({ title: 'Документ отменён' });
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast({
          title: 'Ошибка',
          description: 'Не удалось отменить документ: ' + error.message,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [load, toast]
  );

  return {
    items,
    loading,
    error,
    reload: load,
    removeDraft,
    cancelDraft,
  };
}
