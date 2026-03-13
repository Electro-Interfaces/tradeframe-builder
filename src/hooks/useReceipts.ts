/**
 * React Query хук для работы с поступлениями топлива
 */

import { useQuery } from '@tanstack/react-query';
import { fetchReceipts } from '@/services/receiptsService';
import type { ReceiptsQueryParams, ReceiptsResponse } from '@/types/receipts';

interface UseReceiptsParams extends ReceiptsQueryParams {
  /** Дополнительные system IDs для мультиселекта сетей */
  systems?: number[];
}

/**
 * Хук для получения данных о поступлениях
 * Поддерживает мультиселект сетей: если указан systems[], загружает из всех и мержит
 */
export function useReceipts(params: UseReceiptsParams) {
  const { systems, ...baseParams } = params;
  const effectiveSystems = (systems && systems.length > 0) ? systems : [baseParams.system];

  return useQuery({
    queryKey: ['receipts', effectiveSystems, baseParams],
    queryFn: async (): Promise<ReceiptsResponse> => {
      if (effectiveSystems.length === 1) {
        return fetchReceipts({ ...baseParams, system: effectiveSystems[0] });
      }
      // Мультисеть: загружаем из всех систем параллельно
      const results = await Promise.all(
        effectiveSystems.map(sys =>
          fetchReceipts({ ...baseParams, system: sys }).catch(() => [] as ReceiptsResponse)
        )
      );
      return results.flat();
    },
    enabled: effectiveSystems.some(s => !!s),
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
  });
}
