/**
 * Хук для статистики по способам оплаты
 */

import { useMemo } from 'react';
import type { Transaction } from '@/services/sts';
import { getPaymentTypeDisplayName } from '@/utils/paymentUtils';

interface UsePaymentStatsOptions {
  filteredTransactions: Transaction[];
}

export function usePaymentStats({ filteredTransactions }: UsePaymentStatsOptions) {
  // Статистика по способам оплаты
  const paymentTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const paymentGroups = filteredTransactions.reduce((groups: Record<string, Transaction[]>, tx) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);

      if (!groups[paymentType]) {
        groups[paymentType] = [];
      }
      groups[paymentType].push(tx);
      return groups;
    }, {});

    return Object.entries(paymentGroups).map(([type, txs]) => {
      const revenue = txs.reduce((sum, tx) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum, tx) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // Детальная разбивка: способы оплаты × виды топлива
  const paymentFuelBreakdown = useMemo(() => {
    if (filteredTransactions.length === 0) return {};

    const breakdown: Record<string, Record<string, { operations: number; revenue: number; volume: number }>> = {};

    filteredTransactions.forEach(tx => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';

      if (!breakdown[paymentType]) {
        breakdown[paymentType] = {};
      }

      if (!breakdown[paymentType][fuelType]) {
        breakdown[paymentType][fuelType] = {
          operations: 0,
          revenue: 0,
          volume: 0
        };
      }

      breakdown[paymentType][fuelType].operations++;
      breakdown[paymentType][fuelType].revenue += (tx.total || tx.actualAmount || tx.totalCost || 0);
      breakdown[paymentType][fuelType].volume += (tx.volume || tx.actualQuantity || tx.quantity || 0);
    });

    return breakdown;
  }, [filteredTransactions]);

  return {
    paymentTypeStats,
    paymentFuelBreakdown
  };
}
