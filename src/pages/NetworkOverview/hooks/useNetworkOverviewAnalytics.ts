import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from "react";
import { useSelection } from "@/contexts/SelectionContext";
import { fetchOverview, triggerSync, type OverviewResponse } from "@/services/analyticsService";
import { getFuelPriority } from "@/utils/fuelPriority";

/**
 * Адаптер серверной аналитики для «Обзора сети».
 *
 * Грузит готовые агрегаты периода (/api/analytics/overview) и маппит ответ в
 * ровно те форматы, которые ожидает ОСНОВНОЙ блок страницы (KPI + таблицы +
 * графики «Реализация по дням / Топливо / Оплата / Часы»). Браузер больше не
 * тащит и не суммирует сырьё STS — основной блок появляется мгновенно.
 *
 * Известное ограничение Фазы 1: overview агрегируется по СЕТИ (station в
 * эндпоинт не передаётся). При выборе конкретной торговой точки KPI остаются
 * по сети — это приемлемо, отмечено в задаче.
 */

const pad = (n: number) => String(n).padStart(2, '0');

interface UseNetworkOverviewAnalyticsParams {
  dateFrom: string;
  dateTo: string;
}

export interface AnalyticsFuelStat {
  type: string;
  operations: number;
  revenue: number;
  volume: number;
  priority: number;
}

export interface AnalyticsPaymentStat {
  type: string;
  operations: number;
  revenue: number;
  volume: number;
}

export function useNetworkOverviewAnalytics({ dateFrom, dateTo }: UseNetworkOverviewAnalyticsParams) {
  const { selectedNetworkIds, selectedTradingPoint, isInitialized } = useSelection();

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Защита от гонок: помечаем каждый запрос и игнорируем «отставшие» ответы.
  const currentRequestIdRef = useRef(0);

  const load = useCallback(async () => {
    const networkIds = selectedNetworkIds;
    if (!networkIds || networkIds.length === 0) {
      setOverview(null);
      return;
    }

    const requestId = ++currentRequestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOverview({ networkIds, from: dateFrom, to: dateTo });
      if (requestId !== currentRequestIdRef.current) return;
      // startTransition: выкладка агрегатов не должна морозить интерактив
      startTransition(() => setOverview(res));
    } catch (e: any) {
      if (requestId !== currentRequestIdRef.current) return;
      const msg = e?.message?.includes('502') || e?.message?.includes('503')
        ? 'Сервер временно недоступен. Попробуйте обновить через минуту.'
        : `Ошибка загрузки аналитики: ${e?.message || 'Неизвестная ошибка'}`;
      setError(msg);
      setOverview(null);
    } finally {
      if (requestId === currentRequestIdRef.current) setLoading(false);
    }
  }, [selectedNetworkIds, dateFrom, dateTo]);

  // Грузим при смене сети / точки / периода. Если сеть не выбрана — не грузим.
  useEffect(() => {
    if (!isInitialized) return;
    if (!selectedNetworkIds || selectedNetworkIds.length === 0) {
      setOverview(null);
      return;
    }
    load();
    // selectedTradingPoint в зависимостях по ТЗ: эндпоинт станцию игнорирует,
    // но перезапрос при смене точки безвреден (агрегаты быстрые).
  }, [isInitialized, selectedNetworkIds, selectedTradingPoint, dateFrom, dateTo, load]);

  // Кнопка «Обновить»: принудительный досинк выбранной сети + перечитать агрегаты.
  const refresh = useCallback(async () => {
    const networkIds = selectedNetworkIds;
    if (!networkIds || networkIds.length === 0) return;
    setLoading(true);
    try {
      await triggerSync(networkIds);
    } catch {
      /* если синк не удался — всё равно перечитываем то, что есть */
    }
    await load();
  }, [selectedNetworkIds, load]);

  // ── Маппинг агрегатов в форматы компонентов основного блока ────────────────

  const totalRevenue = overview?.kpi.revenue ?? 0;
  const totalVolume = overview?.kpi.volume ?? 0;
  const averageCheck = overview?.kpi.avgCheck ?? 0;
  const operationsCount = overview?.kpi.operations ?? 0;

  const fuelTypeStats = useMemo<AnalyticsFuelStat[]>(() => {
    if (!overview) return [];
    return overview.byFuel
      .map((f) => {
        const type = f.fuel || 'Неизвестно';
        return {
          type,
          operations: f.operations,
          revenue: f.revenue,
          volume: f.volume,
          priority: getFuelPriority(type),
        };
      })
      .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : b.revenue - a.revenue));
  }, [overview]);

  const paymentTypeStats = useMemo<AnalyticsPaymentStat[]>(() => {
    if (!overview) return [];
    return overview.byPayment
      .map((p) => ({
        type: p.method || 'Неизвестно',
        operations: p.operations,
        revenue: p.revenue,
        volume: p.volume,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [overview]);

  // Реализация по дням с разбивкой по топливу (стековый график).
  const dailySalesData = useMemo(() => {
    const rows = overview?.byDayFuel;
    if (!rows || rows.length === 0) return { data: [] as any[], fuelTypes: [] as string[] };

    const fuelTypes = [...new Set(rows.map((r) => r.fuel || 'Неизвестно'))].sort((a, b) => {
      const pa = getFuelPriority(a);
      const pb = getFuelPriority(b);
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b, 'ru');
    });

    const grouped: Record<string, any> = {};
    rows.forEach((r) => {
      const d = new Date(r.date);
      const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          operations: 0,
          revenue: 0,
          volume: 0,
          ...fuelTypes.reduce((acc: any, fuel: string) => {
            acc[fuel] = 0;
            return acc;
          }, {}),
        };
      }
      const fuel = r.fuel || 'Неизвестно';
      grouped[dateKey].operations += r.operations;
      grouped[dateKey].revenue += r.revenue;
      grouped[dateKey].volume += r.volume;
      grouped[dateKey][fuel] += r.revenue;
    });

    return {
      data: Object.values(grouped)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        })),
      fuelTypes,
    };
  }, [overview]);

  // Суточная активность по часам (для HourlyActivityChart).
  const dailyActivityData = useMemo(() => {
    if (!overview || overview.kpi.operations === 0) return [] as any[];
    const hourly = Array(24)
      .fill(0)
      .map((_, hour) => ({ hour: `${hour}:00`, hourNum: hour, operations: 0, revenue: 0 }));
    (overview.byHour || []).forEach((h) => {
      if (h.hour >= 0 && h.hour < 24) {
        hourly[h.hour].operations = h.operations;
        hourly[h.hour].revenue = h.revenue;
      }
    });
    return hourly;
  }, [overview]);

  // Тепловая карта активности за последние 7 дней (нужна только для экспорта).
  const heatmapData = useMemo(() => {
    const rows = overview?.byDayHour;
    if (!rows || rows.length === 0) return [] as any[];

    const buckets = new Map<string, { count: number; revenue: number }>();
    rows.forEach((r) => {
      const d = new Date(r.date);
      const localDayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      buckets.set(`${localDayKey}|${r.hour}`, { count: r.operations, revenue: r.revenue });
    });

    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const grid: any[] = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date();
      currentDate.setDate(today.getDate() - dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      const dateStr = currentDate.toISOString().split('T')[0];
      const localDayKey = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
      const dayOfWeek = currentDate.getDay();

      const dayRow: any = { date: dateStr, dayName: dayNames[dayOfWeek], dayOfWeek, hours: [] };
      for (let hour = 0; hour < 24; hour++) {
        const bucket = buckets.get(`${localDayKey}|${hour}`);
        const transactionCount = bucket?.count || 0;
        dayRow.hours.push({
          hour,
          transactions: transactionCount,
          revenue: Math.round(bucket?.revenue || 0),
          intensity: transactionCount > 0 ? Math.min(transactionCount / 3, 1) : 0,
          displayTime: `${pad(hour)}:00`,
        });
      }
      grid.push(dayRow);
    }
    return grid;
  }, [overview]);

  const hasData = fuelTypeStats.length > 0;

  return {
    loading,
    isPending,
    error,
    hasData,

    totalRevenue,
    totalVolume,
    averageCheck,
    operationsCount,

    fuelTypeStats,
    paymentTypeStats,
    dailySalesData,
    dailyActivityData,
    heatmapData,

    reload: load,
    refresh,
  };
}
