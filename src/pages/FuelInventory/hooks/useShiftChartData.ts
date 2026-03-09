/**
 * Хук для загрузки данных графиков по сменам
 * Показывает остатки на начало и конец каждой смены по видам топлива
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { stsProxyRequest } from '@/services/stsProxyClient';
import { tradingPointsService } from '@/services/tradingPointsService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

// Точка данных для графика
export interface ShiftChartPoint {
  shiftNumber: number;
  shiftDate: string;
  dateLabel: string;
  volumeBegin: number;  // Остаток на начало смены
  volumeEnd: number;    // Остаток на конец смены
}

// Данные графика для одного вида топлива
export interface FuelChartData {
  fuelCode: number;
  fuelName: string;
  points: ShiftChartPoint[];
}

export const useShiftChartData = (dateFrom: string, dateTo: string, selectedStationFilter: string = 'all') => {
  const { selectedNetwork, selectedStation } = useSelection();
  const { selectedNetworks, selectedExternalIds } = useSelectedNetworks();

  const [chartData, setChartData] = useState<FuelChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Отслеживаем предыдущие значения для автообновления
  const prevFilterRef = useRef(selectedStationFilter);
  const prevStationRef = useRef(selectedStation?.id);
  const wasLoadedRef = useRef(false);

  const loadChartData = useCallback(async () => {
    if (selectedNetworks.length === 0) return;

    setLoading(true);
    setLoaded(false);

    try {
      // Получаем список ТТ по всем выбранным сетям, сохраняя связь с systemId
      const allPointsResults = await Promise.all(
        selectedNetworks.map(async n => {
          const points = await tradingPointsService.getByNetworkId(n.id).catch(() => []);
          return points.map(tp => ({ tp, systemId: parseInt(n.external_id!) }));
        })
      );
      let tradingPointsWithSystem = allPointsResults.flat();

      if (tradingPointsWithSystem.length === 0) {
        setChartData([]);
        setLoading(false);
        setLoaded(true);
        return;
      }

      // Фильтрация по глобально выбранной ТТ (из хедера)
      if (selectedStation) {
        tradingPointsWithSystem = tradingPointsWithSystem.filter(({ tp }) => tp.id === selectedStation.id);
      }
      // Или по локальному фильтру в таблице
      else if (selectedStationFilter !== 'all') {
        tradingPointsWithSystem = tradingPointsWithSystem.filter(({ tp }) => tp.external_id === selectedStationFilter);
      }

      if (tradingPointsWithSystem.length === 0) {
        setChartData([]);
        setLoading(false);
        setLoaded(true);
        return;
      }

      const dtBeg = formatDateForApi(dateFrom, false);
      const dtEnd = formatDateForApi(dateTo, true);
      const periodStart = new Date(dtBeg);
      const periodEnd = new Date(dtEnd);

      // Map для агрегации данных по видам топлива
      // fuelCode -> Map<shiftKey, aggregatedData>
      const fuelDataMap = new Map<number, {
        fuelName: string;
        shiftsMap: Map<string, {
          shiftDate: string;
          volumeBegin: number;
          volumeEnd: number;
        }>;
      }>();

      // Загружаем данные по каждой ТТ
      for (const { tp, systemId } of tradingPointsWithSystem) {
        const stationId = parseInt(tp.external_id!);

        try {
          // Получаем список смен
          const shiftsResponse = await stsProxyRequest<any>('/v1/shifts', {
            method: 'GET',
            params: { system: systemId, station: stationId }
          });

          let allShifts = [];
          if (Array.isArray(shiftsResponse)) {
            if (shiftsResponse.length > 0 && shiftsResponse[0].shift !== undefined) {
              allShifts = shiftsResponse;
            } else {
              allShifts = shiftsResponse[0]?.shifts || [];
            }
          } else if (shiftsResponse?.shifts) {
            allShifts = shiftsResponse.shifts;
          }

          // Фильтруем смены в периоде
          const validShifts = allShifts.filter((shift: any) => {
            const openDate = shift.dt_open ? new Date(shift.dt_open) : null;
            if (!openDate) return false;
            return openDate >= periodStart && openDate <= periodEnd;
          }).sort((a: any, b: any) => {
            const dateA = new Date(a.dt_open);
            const dateB = new Date(b.dt_open);
            return dateA.getTime() - dateB.getTime();
          });

          // Получаем сменные отчеты
          for (const shift of validShifts) {
            try {
              const report = await stsProxyRequest<any>('/v1/report/shift_report', {
                method: 'GET',
                params: { system: systemId, station: stationId, shift: shift.shift }
              });

              let reportData = report;
              if (Array.isArray(report) && report.length > 0) {
                reportData = report[0];
              }

              if (!reportData?.release) continue;

              const shiftDate = shift.dt_close || shift.dt_open;
              const shiftKey = new Date(shiftDate).toISOString().split('T')[0]; // Группируем по дате

              // Обрабатываем данные по резервуарам
              for (const tank of reportData.release) {
                const fuelCode = tank.service?.service_code || tank.fuel || 0;
                const fuelName = tank.service?.service_name || 'Неизвестно';
                const volumeBegin = parseFloat(tank.doc_beg?.volume || '0');
                const volumeEnd = parseFloat(tank.doc_end?.volume || '0');

                // Инициализируем структуру для вида топлива
                if (!fuelDataMap.has(fuelCode)) {
                  fuelDataMap.set(fuelCode, {
                    fuelName,
                    shiftsMap: new Map()
                  });
                }

                const fuelData = fuelDataMap.get(fuelCode)!;

                // Агрегируем по дате
                if (!fuelData.shiftsMap.has(shiftKey)) {
                  fuelData.shiftsMap.set(shiftKey, {
                    shiftDate,
                    volumeBegin: 0,
                    volumeEnd: 0
                  });
                }

                const shiftData = fuelData.shiftsMap.get(shiftKey)!;
                shiftData.volumeBegin += volumeBegin;
                shiftData.volumeEnd += volumeEnd;
              }
            } catch (err) {
              // Игнорируем ошибки отдельных смен
            }
          }
        } catch (err) {
          // Игнорируем ошибки ТТ
        }
      }

      // Преобразуем в формат для графиков
      const result: FuelChartData[] = [];

      fuelDataMap.forEach((data, fuelCode) => {
        const sortedDates = Array.from(data.shiftsMap.keys()).sort();

        const points: ShiftChartPoint[] = sortedDates.map((dateKey, idx) => {
          const shiftData = data.shiftsMap.get(dateKey)!;
          const date = new Date(shiftData.shiftDate);

          return {
            shiftNumber: idx + 1,
            shiftDate: shiftData.shiftDate,
            dateLabel: date.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit'
            }),
            volumeBegin: Math.round(shiftData.volumeBegin),
            volumeEnd: Math.round(shiftData.volumeEnd)
          };
        });

        if (points.length > 0) {
          result.push({
            fuelCode,
            fuelName: data.fuelName,
            points
          });
        }
      });

      // Сортируем по коду топлива
      result.sort((a, b) => a.fuelCode - b.fuelCode);

      setChartData(result);
    } catch (err) {
      setChartData([]);
    } finally {
      setLoading(false);
      setLoaded(true);
      wasLoadedRef.current = true;
    }
  }, [selectedNetworks, selectedStation, dateFrom, dateTo, selectedStationFilter]);

  // Автоматически перезагружаем графики при смене ТТ (если графики уже были загружены)
  useEffect(() => {
    const filterChanged = prevFilterRef.current !== selectedStationFilter;
    const stationChanged = prevStationRef.current !== selectedStation?.id;

    if ((filterChanged || stationChanged) && wasLoadedRef.current) {
      prevFilterRef.current = selectedStationFilter;
      prevStationRef.current = selectedStation?.id;
      loadChartData();
    }
  }, [selectedStationFilter, selectedStation?.id, loadChartData]);

  return {
    chartData,
    loading,
    loaded,
    loadChartData
  };
};
