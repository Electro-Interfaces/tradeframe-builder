/**
 * Хук для вычисления основной статистики обзора сети
 */

import { useMemo } from 'react';
import type { Transaction } from '@/services/stsApi';

interface UseNetworkStatsOptions {
  transactions: Transaction[];
  dateFrom: string;
  dateTo: string;
}

export function useNetworkStats({ transactions, dateFrom, dateTo }: UseNetworkStatsOptions) {
  // Завершенные транзакции
  const completedTransactions = useMemo(() => {
    return transactions.filter(tx => tx.status === 'completed' || !tx.status);
  }, [transactions]);

  // Фильтрация по датам
  const filteredTransactions = useMemo(() => {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    return completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
  }, [completedTransactions, dateFrom, dateTo]);

  // Общая выручка
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) =>
      sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0
    );
  }, [filteredTransactions]);

  // Общий объем
  const totalVolume = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) =>
      sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0
    );
  }, [filteredTransactions]);

  // Средний чек
  const averageCheck = useMemo(() => {
    return filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;
  }, [totalRevenue, filteredTransactions.length]);

  return {
    completedTransactions,
    filteredTransactions,
    totalRevenue,
    totalVolume,
    averageCheck
  };
}
