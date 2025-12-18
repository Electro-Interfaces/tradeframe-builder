/**
 * Хук для загрузки и управления данными о ценах по торговой сети
 */

import { useState, useEffect, useCallback } from 'react';
import { stsApiService, Price } from '@/services/stsApi';
import { tradingPointsService } from '@/services/tradingPointsService';
import { shiftsService } from '@/services/shiftsService';
import { Network } from '@/types/network';
import { Shift } from '@/types/shifts';

export interface NetworkPriceData {
  stationId: string;
  stationName: string;
  stationNumber: string;
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
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useNetworkPrices(options: UseNetworkPricesOptions = {}): UseNetworkPricesReturn {
  const { network, autoLoad = true, loadHistory = true, historyDays = 90, loadShiftSales = true, shiftsDays = 30, filterPeriod = 'all' } = options;

  const [networkPrices, setNetworkPrices] = useState<NetworkPriceData[]>([]);
  const [statistics, setStatistics] = useState<PriceStatistics[]>([]);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Map<string, Array<{ date: string; price: number; fuelType: string }>> | null>(null);
  const [salesByPrice, setSalesByPrice] = useState<SalesByPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

    setLoading(true);
    setError(null);

    try {
      // Получаем все торговые точки сети
      const tradingPoints = await tradingPointsService.getByNetworkId(network.id);

      // Фильтруем только активные точки с external_id
      const activePoints = tradingPoints.filter(
        tp => !tp.isBlocked && tp.external_id && !isNaN(Number(tp.external_id))
      );

      // Загружаем цены для каждой торговой точки
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
            prices
          };
        } catch (err) {
          console.error(`Ошибка загрузки цен для ${tp.name}:`, err);
          return {
            stationId: tp.id,
            stationName: tp.name,
            stationNumber: tp.external_id || '',
            prices: []
          };
        }
      });

      const pricesData = await Promise.all(pricesPromises);

      // Загружаем историю цен, если требуется
      let priceHistoryMap: Map<string, Array<{ date: string; price: number; fuelType: string }>> | undefined;

      if (loadHistory) {
        // Вычисляем дату начала периода
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - historyDays);
        const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00';

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
            return {
              stationId: tp.id,
              history: []
            };
          }
        });

        const historyData = await Promise.all(historyPromises);

        // Преобразуем в Map для удобного доступа
        priceHistoryMap = new Map();
        historyData.forEach(({ stationId, history }) => {
          priceHistoryMap!.set(stationId, history);
        });
      }

      // Загружаем данные о продажах из смен, если требуется
      let salesDataByFuel: Map<string, { volume: number; revenue: number }> | undefined;

      if (loadShiftSales && priceHistoryMap) {
        // Вычисляем период для загрузки смен
        const shiftsStartDate = new Date();
        shiftsStartDate.setDate(shiftsStartDate.getDate() - shiftsDays);
        const shiftsEndDate = new Date();

        const shiftsPromises = activePoints.map(async (tp) => {
          try {
            const shifts = await shiftsService.getShifts({
              system: Number(network.external_id!),
              station: Number(tp.external_id),
              dt_beg: shiftsStartDate.toISOString().split('T')[0] + 'T00:00:00',
              dt_end: shiftsEndDate.toISOString().split('T')[0] + 'T23:59:59'
            });
            return shifts;
          } catch (err) {
            console.error(`Ошибка загрузки смен для ${tp.name}:`, err);
            return [];
          }
        });

        const allShifts = (await Promise.all(shiftsPromises)).flat();

        // Вычисляем дату начала периода для фильтрации
        const periodStartDate = getStartDate(filterPeriod);

        // Фильтруем только закрытые смены (те, у которых есть dt_close) и по периоду
        const closedShifts = allShifts.filter(shift => {
          if (!shift.dt_close) return false;

          // Если указан период, фильтруем по дате закрытия смены
          if (periodStartDate) {
            const shiftCloseDate = shift.dt_close.split('T')[0];
            return shiftCloseDate >= periodStartDate;
          }

          return true;
        });

        // Получаем детальные отчеты по каждой закрытой смене
        const reportsPromises = closedShifts.map(async (shift) => {
          try {
            const report = await shiftsService.getShiftReport({
              system: shift.system,
              station: shift.station,
              shift: shift.shift
            });

            // Добавляем информацию о смене из исходного объекта
            if (report) {
              report.shift.dt_open = shift.dt_open;
              report.shift.dt_close = shift.dt_close;
            }

            return report;
          } catch (err) {
            console.error(`Ошибка загрузки отчета смены ${shift.shift}:`, err);
            return null;
          }
        });

        const reports = (await Promise.all(reportsPromises)).filter(r => r !== null);

        // Агрегируем продажи по видам топлива
        salesDataByFuel = new Map();

        // Также расчет продаж по ценам (для таблицы в статистике)
        const salesByPriceList: SalesByPrice[] = [];
        let totalSalesVolume = 0;
        let missedSalesVolume = 0;

        reports.forEach(report => {
          const shiftCloseDate = report!.shift.dt_close || report!.shift.dt_open;

          report!.fuel_totals.forEach(fuelTotal => {
            const fuelType = fuelTotal.service_name;
            const volume = fuelTotal.release.quantity;
            const revenue = fuelTotal.release.cost;

            totalSalesVolume += volume;

            // Агрегация общих продаж
            const existing = salesDataByFuel!.get(fuelType) || { volume: 0, revenue: 0 };
            salesDataByFuel!.set(fuelType, {
              volume: existing.volume + volume,
              revenue: existing.revenue + revenue
            });

            // Определяем цену, действовавшую на момент закрытия смены
            if (priceHistoryMap && shiftCloseDate) {
              // Ищем цену среди всех станций в истории
              let effectivePrice: number | null = null;

              priceHistoryMap.forEach((stationHistory) => {
                // Сначала ищем цену, действовавшую на дату смены или раньше
                const pricesForFuel = stationHistory
                  .filter(h => h.fuelType === fuelType && h.date <= shiftCloseDate)
                  .sort((a, b) => b.date.localeCompare(a.date)); // Сортируем по убыванию даты

                if (pricesForFuel.length > 0 && effectivePrice === null) {
                  effectivePrice = pricesForFuel[0].price;
                }
              });

              // Если не нашли цену <= дате смены, берем самую раннюю цену из истории
              // (смена произошла раньше, чем начинается история цен)
              if (effectivePrice === null) {
                priceHistoryMap.forEach((stationHistory) => {
                  const earliestPriceForFuel = stationHistory
                    .filter(h => h.fuelType === fuelType)
                    .sort((a, b) => a.date.localeCompare(b.date)); // Сортируем по возрастанию даты

                  if (earliestPriceForFuel.length > 0 && effectivePrice === null) {
                    effectivePrice = earliestPriceForFuel[0].price;
                  }
                });
              }

              if (effectivePrice !== null) {
                salesByPriceList.push({
                  price: effectivePrice,
                  fuelType,
                  volume,
                  revenue
                });
              } else {
                console.warn(`⚠️ Не найдена цена для ${fuelType} на дату ${shiftCloseDate}, объем ${volume} л`);
                missedSalesVolume += volume;
              }
            }
          });
        });

        console.log(`📊 Продажи: всего ${totalSalesVolume.toFixed(2)} л, потеряно ${missedSalesVolume.toFixed(2)} л (${((missedSalesVolume / totalSalesVolume) * 100).toFixed(1)}%)`);

        // Группируем продажи по ценам
        const salesByPriceMap = new Map<string, SalesByPrice>();
        salesByPriceList.forEach(sale => {
          const key = `${sale.fuelType}_${sale.price.toFixed(2)}`;
          const existing = salesByPriceMap.get(key);

          if (existing) {
            existing.volume += sale.volume;
            existing.revenue += sale.revenue;
          } else {
            salesByPriceMap.set(key, { ...sale });
          }
        });

        setSalesByPrice(Array.from(salesByPriceMap.values()));
      }

      // Фильтруем станции, где удалось получить цены
      const validPricesData = pricesData.filter(pd => pd.prices.length > 0).sort((a, b) => { const numA = parseInt(a.stationNumber || "999999", 10); const numB = parseInt(b.stationNumber || "999999", 10); return numA - numB; });

      setNetworkPrices(validPricesData);

      // Вычисляем дату начала периода
      const periodStartDate = getStartDate(filterPeriod);

      // Вычисляем статистику с учетом истории и продаж
      const stats = calculateStatistics(validPricesData, priceHistoryMap, salesDataByFuel, periodStartDate);
      setStatistics(stats);

      // Сохраняем priceHistoryMap для компонента графика
      setPriceHistoryMap(priceHistoryMap || null);

      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка загрузки цен по сети');
      console.error('Ошибка загрузки цен по сети:', error);
      setNetworkPrices([]);
      setStatistics([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [network, calculateStatistics, loadHistory, historyDays, loadShiftSales, shiftsDays, filterPeriod, getStartDate]);

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
  }, [autoLoad, loadNetworkPrices]);

  return {
    networkPrices,
    statistics,
    priceHistoryMap,
    salesByPrice,
    loading,
    error,
    refresh
  };
}
