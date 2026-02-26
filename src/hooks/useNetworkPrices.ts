/**
 * Хук для загрузки и управления данными о ценах по торговой сети
 *
 * Оптимизации:
 * - Прогрессивная загрузка: цены+история показываются сразу, продажи — фоном
 * - Batch-загрузка отчётов смен (по 5 параллельно, не все сразу)
 * - shiftsDays привязан к filterPeriod (не грузим лишнее)
 * - AbortController для отмены запросов при смене параметров
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { stsApiService, Price } from '@/services/stsApi';
import { tradingPointsService } from '@/services/tradingPointsService';
import { shiftsService } from '@/services/shiftsService';
import { Network } from '@/types/network';
import { Shift } from '@/types/shifts';
import { useNewAuth } from '@/contexts/NewAuthContext';

export interface NetworkPriceData {
  stationId: string;
  stationName: string;
  stationNumber: string;
  stationDescription?: string;
  prices: Price[];
}

export interface SalesByPrice {
  price: number; // Цена в момент продажи
  fuelType: string; // Вид топлива
  volume: number; // Объем продаж по этой цене (литры)
  revenue: number; // Выручка от продаж по этой цене (рубли)
  effectiveFrom?: string; // Дата начала действия цены
  effectiveTo?: string; // Дата окончания действия цены
}

export interface PriceStatistics {
  fuelType: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  minStation: string;
  maxStation: string;
  priceRange: number;
  priceRangePercent: number;
  priceChange?: number; // Изменение цены за период (в рублях)
  priceChangePercent?: number; // Изменение цены за период (в процентах)
  priceHistory?: Array<{ date: string; price: number }>; // История цен
  salesVolume?: number; // Объем продаж (литры) из закрытых смен
  salesRevenue?: number; // Выручка от продаж (рубли) из закрытых смен
  salesByPrice?: SalesByPrice[]; // Разбивка продаж по ценам
}

interface UseNetworkPricesOptions {
  network?: Network | null;
  autoLoad?: boolean;
  loadHistory?: boolean; // Загружать ли историю цен
  historyDays?: number; // За сколько дней загружать историю (по умолчанию 90)
  loadShiftSales?: boolean; // Загружать ли данные о продажах из смен
  shiftsDays?: number; // За сколько дней загружать смены (по умолчанию 30)
  filterPeriod?: string; // Период фильтрации для анализа ('7', '30', '90', 'all')
}

interface UseNetworkPricesReturn {
  networkPrices: NetworkPriceData[];
  statistics: PriceStatistics[];
  priceHistoryMap: Map<string, Array<{ date: string; price: number; fuelType: string }>> | null;
  salesByPrice: SalesByPrice[]; // Продажи с разбивкой по ценам
  loading: boolean;
  loadingSales: boolean; // Отдельный флаг для фоновой загрузки продаж
  error: Error | null;
  refresh: () => Promise<void>;
}

/** Выполняет промисы батчами по N штук */
async function promiseAllBatched<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    if (signal?.aborted) break;
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

/** Запись продажи топлива за одну смену (для кэша при смене периода) */
interface ShiftFuelSale {
  shiftCloseDate: string;
  fuelType: string;
  volume: number;
  revenue: number;
  effectivePrice: number;
}

export function useNetworkPrices(options: UseNetworkPricesOptions = {}): UseNetworkPricesReturn {
  const { network, autoLoad = true, loadHistory = true, historyDays = 90, loadShiftSales = true, shiftsDays = 30, filterPeriod = 'all' } = options;
  const { user } = useNewAuth();

  const [networkPrices, setNetworkPrices] = useState<NetworkPriceData[]>([]);
  const [statistics, setStatistics] = useState<PriceStatistics[]>([]);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Map<string, Array<{ date: string; price: number; fuelType: string }>> | null>(null);
  const [salesByPrice, setSalesByPrice] = useState<SalesByPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rawShiftFuelSales, setRawShiftFuelSales] = useState<ShiftFuelSale[]>([]);

  // AbortController для отмены запросов при смене параметров
  const abortRef = useRef<AbortController | null>(null);

  // Ref для filterPeriod — чтобы смена периода не перезапускала загрузку данных
  const filterPeriodRef = useRef(filterPeriod);
  filterPeriodRef.current = filterPeriod;

  // Вычисляем разрешенные ID торговых точек из scopeValues пользователя
  const allowedTradingPointIds = useMemo(() => {
    if (!user?.roles) return null; // null означает "нет ограничений"

    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если scopeValues пустой - нет ограничений (null)
    if (userScopeValues.length === 0) {
      return null;
    }

    // scopeValues содержит ID торговых точек напрямую
    return new Set(userScopeValues);
  }, [user?.roles]);

  /**
   * Вычисление даты начала периода на основе filterPeriod
   */
  const getStartDate = useCallback((period: string): string | null => {
    if (period === 'all') return null;

    const now = new Date();
    const days = parseInt(period, 10);

    if (isNaN(days)) return null;

    now.setDate(now.getDate() - days);
    return now.toISOString().split('T')[0];
  }, []);

  /**
   * Вычисление статистики по ценам с учетом истории и продаж
   */
  const calculateStatistics = useCallback((
    pricesData: NetworkPriceData[],
    priceHistoryData?: Map<string, Array<{ date: string; price: number; fuelType: string }>>,
    salesData?: Map<string, { volume: number; revenue: number }>, // Map<fuelType, {volume, revenue}>
    periodStartDate?: string | null // Дата начала периода для фильтрации
  ): PriceStatistics[] => {
    if (pricesData.length === 0) return [];

    // Получаем все уникальные типы топлива
    const fuelTypes = new Set<string>();
    pricesData.forEach(station => {
      station.prices.forEach(price => {
        fuelTypes.add(price.fuelType);
      });
    });

    // Вычисляем статистику для каждого типа топлива
    const stats: PriceStatistics[] = [];

    fuelTypes.forEach(fuelType => {
      const prices: Array<{ price: number; stationName: string }> = [];

      pricesData.forEach(station => {
        const price = station.prices.find(p => p.fuelType === fuelType);
        if (price) {
          prices.push({
            price: price.price,
            stationName: station.stationName
          });
        }
      });

      if (prices.length > 0) {
        const priceValues = prices.map(p => p.price);
        let minPrice = Math.min(...priceValues);
        let maxPrice = Math.max(...priceValues);
        const averagePrice = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;

        let minStation = prices.find(p => p.price === minPrice)?.stationName || '';
        let maxStation = prices.find(p => p.price === maxPrice)?.stationName || '';

        // Расчет изменения цены и сбор истории
        let priceChange: number | undefined;
        let priceChangePercent: number | undefined;
        let priceHistory: Array<{ date: string; price: number }> | undefined;

        if (priceHistoryData && priceHistoryData.size > 0) {
          // Собираем всю историю для данного типа топлива с информацией о станциях
          const allHistory: Array<{ date: string; price: number; stationName: string }> = [];

          priceHistoryData.forEach((stationHistory, stationId) => {
            // Находим название станции по stationId
            const station = pricesData.find(s => s.stationId === stationId);
            const stationName = station?.stationName || stationId;

            // Фильтруем историю по типу топлива
            const fuelHistory = stationHistory.filter(h => h.fuelType === fuelType);

            if (periodStartDate) {
              // Если задан период, берем записи внутри периода
              const periodRecords = fuelHistory.filter(h => h.date >= periodStartDate);

              // Также берем последнюю запись ДО начала периода (чтобы видеть начальную цену)
              const beforePeriod = fuelHistory.filter(h => h.date < periodStartDate);
              if (beforePeriod.length > 0) {
                beforePeriod.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                periodRecords.unshift(beforePeriod[0]); // Добавляем самую последнюю запись до периода
              }

              periodRecords.forEach(h => allHistory.push({ date: h.date, price: h.price, stationName }));
            } else {
              // Без фильтрации по периоду - берем всё
              fuelHistory.forEach(h => allHistory.push({ date: h.date, price: h.price, stationName }));
            }
          });

          if (allHistory.length > 0) {
            // Сортируем по дате
            allHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Находим min/max цены за весь период с названиями станций
            const minHistoricalPrice = Math.min(...allHistory.map(h => h.price));
            const maxHistoricalPrice = Math.max(...allHistory.map(h => h.price));

            // Обновляем min/max данными из истории
            minPrice = minHistoricalPrice;
            maxPrice = maxHistoricalPrice;
            minStation = allHistory.find(h => h.price === minHistoricalPrice)?.stationName || minStation;
            maxStation = allHistory.find(h => h.price === maxHistoricalPrice)?.stationName || maxStation;

            // Группируем по датам и считаем среднюю цену за день
            const pricesByDate = new Map<string, number[]>();
            allHistory.forEach(h => {
              const dateKey = h.date.split('T')[0];
              if (!pricesByDate.has(dateKey)) {
                pricesByDate.set(dateKey, []);
              }
              pricesByDate.get(dateKey)!.push(h.price);
            });

            // Создаем итоговую историю со средними ценами
            priceHistory = Array.from(pricesByDate.entries())
              .map(([date, prices]) => ({
                date,
                price: prices.reduce((sum, p) => sum + p, 0) / prices.length
              }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Расчет изменения: текущая средняя vs первая в истории
            if (priceHistory.length > 1) {
              const oldPrice = priceHistory[0].price;
              priceChange = averagePrice - oldPrice;
              priceChangePercent = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;
            }
          }
        }

        const priceRange = maxPrice - minPrice;
        const priceRangePercent = averagePrice > 0 ? (priceRange / averagePrice) * 100 : 0;

        // Добавляем данные о продажах из смен, если есть
        const sales = salesData?.get(fuelType);

        stats.push({
          fuelType,
          averagePrice: Math.round(averagePrice * 100) / 100,
          minPrice: Math.round(minPrice * 100) / 100,
          maxPrice: Math.round(maxPrice * 100) / 100,
          minStation,
          maxStation,
          priceRange: Math.round(priceRange * 100) / 100,
          priceRangePercent: Math.round(priceRangePercent * 10) / 10,
          priceChange: priceChange !== undefined ? Math.round(priceChange * 100) / 100 : undefined,
          priceChangePercent: priceChangePercent !== undefined ? Math.round(priceChangePercent * 10) / 10 : undefined,
          priceHistory,
          salesVolume: sales?.volume,
          salesRevenue: sales?.revenue
        });
      }
    });

    return stats.sort((a, b) => a.fuelType.localeCompare(b.fuelType));
  }, []);

  /**
   * Загрузка цен по всей сети
   */
  const loadNetworkPrices = useCallback(async () => {
    if (!network || !network.external_id) {
      setNetworkPrices([]);
      setStatistics([]);
      return;
    }

    // Отменяем предыдущие запросы
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;
    const signal = abortController.signal;

    setLoading(true);
    setError(null);
    setRawShiftFuelSales([]);

    try {
      // Получаем все торговые точки сети
      const tradingPoints = await tradingPointsService.getByNetworkId(network.id);

      // Фильтруем только активные точки с external_id
      let activePoints = tradingPoints.filter(
        tp => !tp.isBlocked && tp.external_id && !isNaN(Number(tp.external_id))
      );

      // Если есть ограничения по торговым точкам, фильтруем по разрешенным ID
      if (allowedTradingPointIds) {
        activePoints = activePoints.filter(tp => allowedTradingPointIds.has(tp.id));
      }

      if (signal.aborted) return;

      // ===== ФАЗА 1: Загружаем цены и историю параллельно =====
      const pricesPromises = activePoints.map(async (tp) => {
        try {
          const prices = await stsApiService.getPrices({
            networkId: network.external_id!,
            tradingPointId: tp.external_id
          });

          return {
            stationId: tp.id,
            stationName: tp.name,
            stationNumber: tp.external_id || '',
            stationDescription: tp.description || '',
            prices
          };
        } catch (err) {
          console.error(`Ошибка загрузки цен для ${tp.name}:`, err);
          return {
            stationId: tp.id,
            stationName: tp.name,
            stationNumber: tp.external_id || '',
            stationDescription: tp.description || '',
            prices: []
          };
        }
      });

      // Загружаем историю цен параллельно с текущими ценами
      let historyPromise: Promise<Map<string, Array<{ date: string; price: number; fuelType: string }>> | undefined> = Promise.resolve(undefined);

      if (loadHistory) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - historyDays);
        const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00';

        historyPromise = (async () => {
          const historyPromises = activePoints.map(async (tp) => {
            try {
              const history = await stsApiService.getPriceSchedule(
                network.external_id!,
                tp.external_id!,
                startDateStr
              );

              return {
                stationId: tp.id,
                history: history.map(h => ({
                  date: h.effective_date,
                  price: h.price,
                  fuelType: h.fuel_type || h.service_name || 'Неизвестно'
                }))
              };
            } catch (err) {
              console.error(`Ошибка загрузки истории цен для ${tp.name}:`, err);
              return { stationId: tp.id, history: [] };
            }
          });

          const historyData = await Promise.all(historyPromises);
          const map = new Map<string, Array<{ date: string; price: number; fuelType: string }>>();
          historyData.forEach(({ stationId, history }) => {
            map.set(stationId, history);
          });
          return map;
        })();
      }

      // Ждём цены и историю параллельно
      const [pricesData, priceHistoryResult] = await Promise.all([
        Promise.all(pricesPromises),
        historyPromise,
      ]);

      if (signal.aborted) return;

      // ===== Показываем результат ФАЗЫ 1 сразу =====
      const validPricesData = pricesData
        .filter(pd => pd.prices.length > 0)
        .sort((a, b) => {
          const numA = parseInt(a.stationNumber || '999999', 10);
          const numB = parseInt(b.stationNumber || '999999', 10);
          return numA - numB;
        });

      setNetworkPrices(validPricesData);
      setPriceHistoryMap(priceHistoryResult || null);
      setError(null);
      setLoading(false); // Основная загрузка завершена — статистика пересчитается в effect

      // ===== ФАЗА 2: Загрузка продаж из смен (фоновая) =====
      // Загружаем ВСЕ смены за shiftsDays — фильтрация по периоду в recalc effect
      if (loadShiftSales && priceHistoryResult) {
        setLoadingSales(true);

        try {
          const shiftsStartDate = new Date();
          shiftsStartDate.setDate(shiftsStartDate.getDate() - shiftsDays);
          const shiftsEndDate = new Date();

          // Загрузка списка смен — параллельно по станциям
          const shiftsPromises = activePoints.map(async (tp) => {
            try {
              return await shiftsService.getShifts({
                system: Number(network.external_id!),
                station: Number(tp.external_id),
                dt_beg: shiftsStartDate.toISOString().split('T')[0] + 'T00:00:00',
                dt_end: shiftsEndDate.toISOString().split('T')[0] + 'T23:59:59'
              });
            } catch (err) {
              console.error(`Ошибка загрузки смен для ${tp.name}:`, err);
              return [];
            }
          });

          const allShifts = (await Promise.all(shiftsPromises)).flat();

          if (signal.aborted) return;

          // Все закрытые смены (без фильтрации по периоду — фильтрация в recalc effect)
          const closedShifts = allShifts.filter(shift => shift.dt_close);

          // Загружаем отчёты смен БАТЧАМИ по 5 (вместо 100+ одновременно)
          const reportTasks = closedShifts.map(shift => async () => {
            try {
              const report = await shiftsService.getShiftReport({
                system: shift.system,
                station: shift.station,
                shift: shift.shift
              });
              if (report) {
                report.shift.dt_open = shift.dt_open;
                report.shift.dt_close = shift.dt_close;
              }
              return report;
            } catch (err) {
              return null;
            }
          });

          const reportResults = await promiseAllBatched(reportTasks, 5, signal);

          if (signal.aborted) return;

          const reports = reportResults.filter(r => r !== null);

          // Построение priceLookup: fuelType → отсортированный массив {date, price} (desc)
          const priceLookup = new Map<string, Array<{ date: string; price: number }>>();
          priceHistoryResult.forEach((stationHistory) => {
            for (const h of stationHistory) {
              let arr = priceLookup.get(h.fuelType);
              if (!arr) {
                arr = [];
                priceLookup.set(h.fuelType, arr);
              }
              arr.push({ date: h.date, price: h.price });
            }
          });
          priceLookup.forEach(arr => arr.sort((a, b) => b.date.localeCompare(a.date)));

          // Собираем сырые данные продаж по сменам (для мгновенного пересчёта при смене периода)
          const shiftFuelSales: ShiftFuelSale[] = [];
          reports.forEach(report => {
            const shiftCloseDate = report!.shift.dt_close || report!.shift.dt_open;

            report!.fuel_totals.forEach((fuelTotal: any) => {
              const fuelType = fuelTotal.service_name;
              const volume = fuelTotal.release.quantity;
              const revenue = fuelTotal.release.cost;

              let ep = 0;
              if (shiftCloseDate) {
                const fuelPrices = priceLookup.get(fuelType);
                if (fuelPrices && fuelPrices.length > 0) {
                  const match = fuelPrices.find(p => p.date <= shiftCloseDate);
                  ep = match?.price ?? fuelPrices[fuelPrices.length - 1].price;
                }
              }

              shiftFuelSales.push({
                shiftCloseDate: shiftCloseDate || '',
                fuelType,
                volume,
                revenue,
                effectivePrice: ep
              });
            });
          });

          if (signal.aborted) return;

          // Сохраняем сырые данные — recalc effect пересчитает статистику
          setRawShiftFuelSales(shiftFuelSales);
        } catch (err) {
          if (!signal.aborted) {
            console.error('Ошибка загрузки продаж по сменам:', err);
          }
        } finally {
          if (!signal.aborted) {
            setLoadingSales(false);
          }
        }
      }
    } catch (err) {
      if (signal.aborted) return;
      const error = err instanceof Error ? err : new Error('Ошибка загрузки цен по сети');
      console.error('Ошибка загрузки цен по сети:', error);
      setNetworkPrices([]);
      setStatistics([]);
      setError(error);
      setLoading(false);
    }
  }, [network, calculateStatistics, loadHistory, historyDays, loadShiftSales, shiftsDays, allowedTradingPointIds]);

  /**
   * Обновление данных
   */
  const refresh = useCallback(async () => {
    await loadNetworkPrices();
  }, [loadNetworkPrices]);

  // Автоматическая загрузка при монтировании
  useEffect(() => {
    if (autoLoad) {
      loadNetworkPrices();
    }

    return () => {
      // Отмена при размонтировании
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [autoLoad, loadNetworkPrices]);

  // Пересчёт статистики при смене периода или загрузке данных (без API-запросов)
  useEffect(() => {
    if (networkPrices.length === 0) return;

    const periodStartDate = getStartDate(filterPeriod);

    // Фильтрация продаж по периоду
    const filtered = periodStartDate
      ? rawShiftFuelSales.filter(s => s.shiftCloseDate.split('T')[0] >= periodStartDate)
      : rawShiftFuelSales;

    // Агрегация продаж по видам топлива
    const salesDataByFuel = new Map<string, { volume: number; revenue: number }>();
    const salesByPriceMap = new Map<string, SalesByPrice>();

    filtered.forEach(s => {
      // Общие продажи по виду топлива
      const existing = salesDataByFuel.get(s.fuelType) || { volume: 0, revenue: 0 };
      salesDataByFuel.set(s.fuelType, {
        volume: existing.volume + s.volume,
        revenue: existing.revenue + s.revenue
      });

      // Группировка по цене
      if (s.effectivePrice > 0) {
        const key = `${s.fuelType}_${s.effectivePrice.toFixed(2)}`;
        const existingByPrice = salesByPriceMap.get(key);
        if (existingByPrice) {
          existingByPrice.volume += s.volume;
          existingByPrice.revenue += s.revenue;
        } else {
          salesByPriceMap.set(key, {
            price: s.effectivePrice,
            fuelType: s.fuelType,
            volume: s.volume,
            revenue: s.revenue
          });
        }
      }
    });

    setSalesByPrice(Array.from(salesByPriceMap.values()));

    // Пересчёт статистики
    const updatedStats = calculateStatistics(
      networkPrices,
      priceHistoryMap,
      salesDataByFuel.size > 0 ? salesDataByFuel : undefined,
      periodStartDate
    );
    setStatistics(updatedStats);
  }, [filterPeriod, rawShiftFuelSales, networkPrices, priceHistoryMap, getStartDate, calculateStatistics]);

  return {
    networkPrices,
    statistics,
    priceHistoryMap,
    salesByPrice,
    loading,
    loadingSales,
    error,
    refresh
  };
}
