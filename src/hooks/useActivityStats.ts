/**
 * Хук для статистики активности (почасовая, дневная, тепловая карта)
 */

import { useMemo } from 'react';
import { getFuelPriority, sortFuelTypes } from '@/utils/fuelPriority';
import type { Transaction } from '@/services/sts';

interface UseActivityStatsOptions {
  transactions: Transaction[];
  completedTransactions: Transaction[];
  dateFrom: string;
  dateTo: string;
  selectedNetwork: any;
}

export function useActivityStats({
  transactions,
  completedTransactions,
  dateFrom,
  dateTo,
  selectedNetwork
}: UseActivityStatsOptions) {
  // Данные суточной активности по часам
  const dailyActivityData = useMemo(() => {
    if (completedTransactions.length === 0) return [];

    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    const filteredTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });

    const hourlyActivity = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      hourNum: hour,
      operations: 0,
      revenue: 0
    }));

    filteredTransactions.forEach(tx => {
      const txTime = tx.timestamp || tx.createdAt || tx.date || tx.apiData?.timestamp;
      if (txTime) {
        const hour = new Date(txTime).getHours();
        if (hour >= 0 && hour < 24) {
          hourlyActivity[hour].operations++;
          hourlyActivity[hour].revenue += (tx.total || tx.actualAmount || tx.totalCost || 0);
        }
      }
    });

    return hourlyActivity;
  }, [completedTransactions, dateFrom, dateTo]);

  // Данные продаж по дням с разбивкой по топливу
  const dailySalesData = useMemo(() => {
    if (completedTransactions.length === 0) return { data: [], fuelTypes: [] };

    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    const grouped: Record<string, any> = {};

    const filteredTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });

    // Получаем отсортированные виды топлива
    const fuelTypes = sortFuelTypes([
      ...new Set(filteredTransactions.map(tx =>
        tx.fuelType || tx.apiData?.product_name || 'Неизвестно'
      ).filter(Boolean))
    ]);

    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      const dateKey = `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, '0')}-${txDate.getDate().toString().padStart(2, '0')}`;
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          operations: 0,
          revenue: 0,
          volume: 0,
          ...fuelTypes.reduce((acc, fuel) => {
            acc[fuel] = 0;
            return acc;
          }, {} as Record<string, number>)
        };
      }

      const txRevenue = tx.total || tx.actualAmount || tx.totalCost || 0;
      grouped[dateKey].operations++;
      grouped[dateKey].revenue += txRevenue;
      grouped[dateKey].volume += (tx.volume || tx.actualQuantity || tx.quantity || 0);
      grouped[dateKey][fuelType] += txRevenue;
    });

    return {
      data: Object.values(grouped)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        })),
      fuelTypes
    };
  }, [completedTransactions, dateFrom, dateTo]);

  // Данные тепловой карты (последние 7 дней × 24 часа)
  const heatmapData = useMemo(() => {
    if (!selectedNetwork || transactions.length === 0) return [];

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const heatmapGrid = [];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date();
      currentDate.setDate(today.getDate() - dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      const dayRow = {
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayOfWeek: dayOfWeek,
        hours: [] as any[]
      };

      for (let hour = 0; hour < 24; hour++) {
        const hourTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
          const txHour = txDate.getHours();
          return txDate.getFullYear() === currentDate.getFullYear() &&
                 txDate.getMonth() === currentDate.getMonth() &&
                 txDate.getDate() === currentDate.getDate() &&
                 txHour === hour;
        });

        const transactionCount = hourTransactions.length;
        const revenue = hourTransactions.reduce((sum, tx) =>
          sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);

        dayRow.hours.push({
          hour,
          transactions: transactionCount,
          revenue: Math.round(revenue),
          intensity: transactionCount > 0 ? Math.min(transactionCount / 3, 1) : 0,
          displayTime: `${hour.toString().padStart(2, '0')}:00`
        });
      }

      heatmapGrid.push(dayRow);
    }

    return heatmapGrid;
  }, [selectedNetwork, transactions]);

  return {
    dailyActivityData,
    dailySalesData,
    heatmapData
  };
}
