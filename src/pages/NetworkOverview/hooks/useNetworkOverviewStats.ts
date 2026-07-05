import { useMemo } from "react";
import { getPaymentTypeDisplayName } from "@/utils/paymentUtils";

interface UseNetworkOverviewStatsParams {
  transactions: any[];
  dateFrom: string;
  dateTo: string;
  allowedStationNumbers: Set<string> | null;
  selectedNetwork: any;
}

// Функция для определения приоритета сортировки топлива
export const getFuelPriority = (fuelType: string) => {
  const fuel = fuelType.toLowerCase();

  // Бензины
  if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
  if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
  if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
  if (fuel.includes('аи-91') || fuel.includes('91')) return 4;
  if (fuel.includes('аи-80') || fuel.includes('80')) return 5;
  if (fuel.includes('бензин') || fuel.includes('gasoline') || fuel.includes('petrol')) return 6;

  // Дизельное топливо
  if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return 10;
  if (fuel.includes('дт зимнее') || fuel.includes('зимний дизель')) return 11;
  if (fuel.includes('дт летнее') || fuel.includes('летний дизель')) return 12;
  if (fuel.includes('дт арктический') || fuel.includes('арктический дизель')) return 13;

  // Другие виды топлива
  if (fuel.includes('газ') || fuel.includes('газовый') || fuel.includes('gas')) return 20;
  if (fuel.includes('керосин') || fuel.includes('kerosene')) return 21;
  if (fuel.includes('масло') || fuel.includes('oil')) return 22;

  // Неизвестные - в конец
  return 99;
};

export function useNetworkOverviewStats({
  transactions,
  dateFrom,
  dateTo,
  allowedStationNumbers,
  selectedNetwork,
}: UseNetworkOverviewStatsParams) {
  // Числовой timestamp транзакции: tsMs проставлен при маппинге в STS-клиенте,
  // строковый парсинг — только fallback. На 100k строк повторный new Date(строка)
  // в каждом useMemo блокировал главный поток на секунды.
  const txMs = (tx: any): number =>
    typeof tx.tsMs === 'number' && Number.isFinite(tx.tsMs)
      ? tx.tsMs
      : new Date(tx.timestamp || tx.createdAt || tx.date).getTime();

  // Вычисляемые статистики
  const completedTransactions = useMemo(() => {
    return transactions.filter((tx: any) => tx.status === 'completed' || !tx.status);
  }, [transactions]);

  // Фильтрованные транзакции по диапазону дат и разрешенным станциям
  const filteredTransactions = useMemo(() => {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return completedTransactions.filter((tx: any) => {
      const ms = txMs(tx);
      const inDateRange = ms >= startMs && ms <= endMs;

      if (!allowedStationNumbers) {
        return inDateRange;
      }

      const stationNum = String(tx.stationNumber || tx.station_number || '');
      return inDateRange && allowedStationNumbers.has(stationNum);
    });
  }, [completedTransactions, dateFrom, dateTo, allowedStationNumbers]);

  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum: number, tx: any) =>
      sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0
    );
  }, [filteredTransactions]);

  const totalVolume = useMemo(() => {
    return filteredTransactions.reduce((sum: number, tx: any) =>
      sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0
    );
  }, [filteredTransactions]);

  const averageCheck = useMemo(() => {
    return filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;
  }, [totalRevenue, filteredTransactions.length]);

  // Статистика по видам топлива
  const fuelTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const fuelGroups = filteredTransactions.reduce((groups: any, tx: any) => {
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';
      if (!groups[fuelType]) {
        groups[fuelType] = [];
      }
      groups[fuelType].push(tx);
      return groups;
    }, {});

    return Object.entries(fuelGroups).map(([type, txs]: [string, any]) => {
      const revenue = txs.reduce((sum: number, tx: any) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum: number, tx: any) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume,
        priority: getFuelPriority(type)
      };
    }).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.revenue - a.revenue;
    });
  }, [filteredTransactions]);

  // Статистика по способам оплаты
  const paymentTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const uniquePaymentMethods = new Set<string>();
    filteredTransactions.forEach((tx: any) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      if (rawPaymentType && rawPaymentType !== 'Неизвестно') {
        uniquePaymentMethods.add(rawPaymentType);
      }
    });

    const paymentGroups = filteredTransactions.reduce((groups: any, tx: any) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);

      if (!groups[paymentType]) {
        groups[paymentType] = [];
      }
      groups[paymentType].push(tx);
      return groups;
    }, {});

    return Object.entries(paymentGroups).map(([type, txs]: [string, any]) => {
      const revenue = txs.reduce((sum: number, tx: any) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum: number, tx: any) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // Детальная статистика по способам оплаты с разбивкой по видам топлива
  const paymentFuelBreakdown = useMemo(() => {
    if (filteredTransactions.length === 0) return {};

    const breakdown: Record<string, Record<string, { operations: number; revenue: number; volume: number }>> = {};

    filteredTransactions.forEach((tx: any) => {
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

  // Данные для графика суточной активности
  const dailyActivityData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const hourlyActivity = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      hourNum: hour,
      operations: 0,
      revenue: 0
    }));

    filteredTransactions.forEach((tx: any) => {
      const ms = txMs(tx);
      if (Number.isFinite(ms)) {
        const hour = new Date(ms).getHours();
        if (hour >= 0 && hour < 24) {
          hourlyActivity[hour].operations++;
          hourlyActivity[hour].revenue += (tx.total || tx.actualAmount || tx.totalCost || 0);
        }
      }
    });

    return hourlyActivity;
  }, [filteredTransactions]);

  // Данные для группировки по дням с разбивкой по видам топлива
  const dailySalesData = useMemo(() => {
    if (filteredTransactions.length === 0) return { data: [], fuelTypes: [] as string[] };

    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    const grouped: Record<string, any> = {};

    // Получаем все уникальные виды топлива и сортируем правильно
    const fuelTypes = [...new Set(filteredTransactions.map((tx: any) =>
      tx.fuelType || tx.apiData?.product_name || 'Неизвестно'
    ).filter(Boolean))].sort((a, b) => {
      const priorityA = getFuelPriority(a);
      const priorityB = getFuelPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.localeCompare(b, 'ru');
    });

    filteredTransactions.forEach((tx: any) => {
      const txDate = new Date(txMs(tx));
      const dateKey = `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, '0')}-${txDate.getDate().toString().padStart(2, '0')}`;
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          operations: 0,
          revenue: 0,
          volume: 0,
          ...fuelTypes.reduce((acc: any, fuel: string) => {
            acc[fuel] = 0;
            return acc;
          }, {})
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
  }, [filteredTransactions, dateFrom, dateTo]);

  // Данные для тепловой карты активности по часам за последние 7 дней
  const heatmapData = useMemo(() => {
    if (!selectedNetwork || transactions.length === 0) return [];

    const stationFilteredTransactions = allowedStationNumbers
      ? transactions.filter((tx: any) => {
          const stationNum = String(tx.stationNumber || tx.station_number || '');
          return allowedStationNumbers.has(stationNum);
        })
      : transactions;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const heatmapGrid: any[] = [];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    // Один проход по транзакциям вместо 7×24 полных фильтраций
    // (на месяце данных старый вариант делал ~17 млн парсингов дат и
    // подвешивал главный поток на секунды).
    const buckets = new Map<string, { count: number; revenue: number }>();
    stationFilteredTransactions.forEach((tx: any) => {
      const ms = txMs(tx);
      if (!Number.isFinite(ms)) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}|${d.getHours()}`;
      const bucket = buckets.get(key);
      const revenue = tx.total || tx.actualAmount || tx.totalCost || 0;
      if (bucket) {
        bucket.count++;
        bucket.revenue += revenue;
      } else {
        buckets.set(key, { count: 1, revenue });
      }
    });

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date();
      currentDate.setDate(today.getDate() - dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      const dateStr = currentDate.toISOString().split('T')[0];
      const localDayKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const dayOfWeek = currentDate.getDay();

      const dayRow: any = {
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayOfWeek: dayOfWeek,
        hours: []
      };

      for (let hour = 0; hour < 24; hour++) {
        const bucket = buckets.get(`${localDayKey}|${hour}`);
        const transactionCount = bucket?.count || 0;

        dayRow.hours.push({
          hour,
          transactions: transactionCount,
          revenue: Math.round(bucket?.revenue || 0),
          intensity: transactionCount > 0 ? Math.min(transactionCount / 3, 1) : 0,
          displayTime: `${hour.toString().padStart(2, '0')}:00`
        });
      }

      heatmapGrid.push(dayRow);
    }

    return heatmapGrid;
  }, [selectedNetwork, transactions, allowedStationNumbers]);

  return {
    completedTransactions,
    filteredTransactions,
    totalRevenue,
    totalVolume,
    averageCheck,
    fuelTypeStats,
    paymentTypeStats,
    paymentFuelBreakdown,
    dailyActivityData,
    dailySalesData,
    heatmapData,
  };
}
