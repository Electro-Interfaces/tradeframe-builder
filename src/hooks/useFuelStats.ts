/**
 * Хук для статистики по видам топлива
 */

import { useMemo } from 'react';
import { getFuelPriority } from '@/utils/fuelPriority';
import type { Transaction } from '@/services/sts';

interface UseFuelStatsOptions {
  filteredTransactions: Transaction[];
}

export function useFuelStats({ filteredTransactions }: UseFuelStatsOptions) {
  const fuelTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const fuelGroups = filteredTransactions.reduce((groups: Record<string, Transaction[]>, tx) => {
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';
      if (!groups[fuelType]) {
        groups[fuelType] = [];
      }
      groups[fuelType].push(tx);
      return groups;
    }, {});

    return Object.entries(fuelGroups).map(([type, txs]) => {
      const revenue = txs.reduce((sum, tx) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum, tx) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume,
        priority: getFuelPriority(type)
      };
    }).sort((a, b) => {
      // Сортировка по приоритету (бензины → дизель → остальное)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Внутри группы по выручке (убывание)
      return b.revenue - a.revenue;
    });
  }, [filteredTransactions]);

  return {
    fuelTypeStats
  };
}
