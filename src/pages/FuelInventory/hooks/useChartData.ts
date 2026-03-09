/**
 * Хук для загрузки и управления данными графиков
 *
 * ЛОГИКА (аналогично TankAnalysisDialog):
 * 1. Используем API /v1/tank_history для получения истории остатков
 * 2. Группируем данные по виду топлива (fuel code)
 * 3. Фактический остаток берем из поля `volume`
 * 4. Каждая запись = точка на графике (данные приходят каждые ~10 минут)
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { stsProxyRequest } from '@/services/stsProxyClient';
import type { FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

// Интерфейс для точки данных на графике
interface ChartDataPoint {
  time: string;           // Метка времени для отображения
  volume: number;         // Фактический остаток
  sales: number;          // Продажа (изменение объема вниз)
  receipts: number;       // Поступление (изменение объема вверх)
  receiptCount: number;   // Счетчик поступлений
  dateKey: string;        // ISO дата для сортировки
}

// Запись из API /v1/tank_history
interface TankHistoryRecord {
  number: number;         // Номер резервуара
  fuel: number;           // Код топлива
  fuel_name: string;      // Название топлива
  volume: string;         // Текущий фактический объем
  volume_begin: string;   // Объем на начало
  volume_end: string;     // Объем на конец
  release: {              // Реализация
    volume: string;
    amount: string;
  };
  dt: string;             // Метка времени
}

export const useChartData = (dateFrom: string, dateTo: string, summaries: FuelInventorySummary[], selectedStationFilter: string = 'all') => {
  const { selectedNetwork } = useSelection();
  const { selectedNetworks, selectedExternalIds } = useSelectedNetworks();

  const [chartsRequested, setChartsRequested] = useState(false);

  const queryKey = useMemo(() => [
    'chartData',
    [...selectedExternalIds].sort(),
    dateFrom,
    dateTo,
    summaries.map(s => s.fuelCode).join(','),
    selectedStationFilter
  ], [selectedExternalIds, dateFrom, dateTo, summaries, selectedStationFilter]);

  const {
    data: chartDataByFuel = new Map<number, ChartDataPoint[]>(),
    isLoading: loadingCharts,
    refetch: refetchChartData,
    isFetched: chartsLoaded
  } = useQuery<Map<number, ChartDataPoint[]>, Error>({
    queryKey,
    queryFn: async () => {
      if (selectedNetworks.length === 0 || summaries.length === 0) {
        return new Map<number, ChartDataPoint[]>();
      }

      const chartData = new Map<number, ChartDataPoint[]>();

      // Получаем список ТТ по всем выбранным сетям, сохраняя связь с systemId
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const allPointsResults = await Promise.all(
        selectedNetworks.map(async n => {
          const points = await tradingPointsService.getByNetworkId(n.id).catch(() => []);
          return points.map(tp => ({ tp, systemId: parseInt(n.external_id!) }));
        })
      );
      let tradingPointsWithSystem = allPointsResults.flat();

      if (tradingPointsWithSystem.length === 0) {
        return new Map<number, ChartDataPoint[]>();
      }

      // Фильтрация по выбранной ТТ
      if (selectedStationFilter !== 'all') {
        tradingPointsWithSystem = tradingPointsWithSystem.filter(({ tp }) => tp.external_id === selectedStationFilter);
        if (tradingPointsWithSystem.length === 0) {
          return new Map<number, ChartDataPoint[]>();
        }
      }

      const dtBeg = formatDateForApi(dateFrom, false);
      const dtEnd = formatDateForApi(dateTo, true);

      // Структура для хранения истории по видам топлива
      // Map<fuelCode, TankHistoryRecord[]>
      const historyByFuel = new Map<number, TankHistoryRecord[]>();

      // Инициализируем структуры для каждого вида топлива
      summaries.forEach(summary => {
        historyByFuel.set(summary.fuelCode, []);
      });

      // Загружаем историю для каждой ТТ
      for (const { tp, systemId } of tradingPointsWithSystem) {
        const stationId = parseInt(tp.external_id);

        try {
          // Используем API /v1/tank_history - как в TankAnalysisDialog
          const historyResponse = await stsProxyRequest<TankHistoryRecord[]>('/v1/tank_history', {
            method: 'GET',
            params: {
              system: systemId,
              station: stationId,
              dt_beg: dtBeg,
              dt_end: dtEnd
            }
          });

          if (Array.isArray(historyResponse)) {
            // Группируем записи по виду топлива
            historyResponse.forEach(record => {
              const fuelCode = record.fuel;
              const fuelHistory = historyByFuel.get(fuelCode);
              if (fuelHistory) {
                fuelHistory.push(record);
              }
            });
          }
        } catch (err) {
          // Продолжаем без данных для этой станции
        }
      }

      // Строим графики для каждого вида топлива
      summaries.forEach(summary => {
        const records = historyByFuel.get(summary.fuelCode);
        if (!records || records.length === 0) return;

        // Сортируем записи по времени
        records.sort((a, b) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

        // Если выбраны все станции - нужно агрегировать по временным меткам
        // Группируем записи с одинаковым временем (округляем до минуты)
        const groupedByTime = new Map<string, number>();

        records.forEach(record => {
          const dt = new Date(record.dt);
          // Округляем до минуты для группировки
          const timeKey = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(),
            dt.getHours(), dt.getMinutes()).toISOString();

          const volume = parseFloat(record.volume) || 0;
          const existing = groupedByTime.get(timeKey) || 0;
          groupedByTime.set(timeKey, existing + volume);
        });

        // Преобразуем в массив точек графика
        const sortedTimes = Array.from(groupedByTime.keys()).sort();

        let prevVolume = 0;
        const chartPoints: ChartDataPoint[] = sortedTimes.map((timeKey, index) => {
          const volume = groupedByTime.get(timeKey) || 0;
          const dt = new Date(timeKey);

          // Вычисляем изменение объема
          let sales = 0;
          let receipts = 0;

          if (index > 0) {
            const delta = volume - prevVolume;
            if (delta < 0) {
              sales = Math.abs(delta); // Уменьшение = продажи
            } else if (delta > 0) {
              receipts = delta; // Увеличение = поступления
            }
          }
          prevVolume = volume;

          // Форматируем время
          const timeStr = dt.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Поступление считается только при значительном увеличении объёма (минимум 500 литров)
          // Меньшие колебания - это погрешности датчиков или температурное расширение
          const isRealReceipt = receipts >= 500;

          return {
            time: timeStr,
            volume: Math.round(volume),
            sales: Math.round(sales),
            receipts: Math.round(receipts),
            receiptCount: isRealReceipt ? 1 : 0,
            dateKey: timeKey
          };
        });

        // Прореживаем данные если слишком много точек (более 200)
        let finalPoints = chartPoints;
        if (chartPoints.length > 200) {
          const step = Math.ceil(chartPoints.length / 200);
          finalPoints = chartPoints.filter((_, index) => index % step === 0);
          // Убеждаемся, что последняя точка включена
          if (finalPoints[finalPoints.length - 1] !== chartPoints[chartPoints.length - 1]) {
            finalPoints.push(chartPoints[chartPoints.length - 1]);
          }
        }

        if (finalPoints.length > 0) {
          chartData.set(summary.fuelCode, finalPoints);
        }
      });

      return chartData;
    },
    enabled: chartsRequested && selectedExternalIds.length > 0 && summaries.length > 0,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const prevStationFilterRef = useRef(selectedStationFilter);

  useEffect(() => {
    if (prevStationFilterRef.current !== selectedStationFilter && chartsRequested) {
      prevStationFilterRef.current = selectedStationFilter;
      refetchChartData();
    }
  }, [selectedStationFilter, chartsRequested, refetchChartData]);

  const loadChartData = useCallback(() => {
    setChartsRequested(true);
    if (chartsRequested) {
      refetchChartData();
    }
  }, [chartsRequested, refetchChartData]);

  return {
    chartDataByFuel,
    loadingCharts,
    loadChartData,
    chartsLoaded: chartsRequested && chartsLoaded && !loadingCharts,
    chartsRequested
  };
};
