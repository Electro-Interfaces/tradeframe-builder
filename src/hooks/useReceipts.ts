/**
 * React Query хук для работы с поступлениями топлива
 */

import { useQuery } from '@tanstack/react-query';
import { fetchReceipts } from '@/services/receiptsService';
import type { ReceiptsQueryParams } from '@/types/receipts';

/**
 * Хук для получения данных о поступлениях
 */
export function useReceipts(params: ReceiptsQueryParams) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () => fetchReceipts(params),
    enabled: !!params.system, // Запрос выполняется только если указан system
    staleTime: 0, // Всегда перезагружать при изменении параметров
    gcTime: 10 * 60 * 1000, // 10 минут (раньше cacheTime)
  });
}
