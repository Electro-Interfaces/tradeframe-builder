/**
 * Хук для загрузки и управления данными графиков
 */

import { useState, useCallback } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { stsProxyRequest } from '@/services/stsProxyClient';
import type { FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatDateForApi } from '../utils/fuelInventoryHelpers';

export const useChartData = (dateFrom: string, dateTo: string) => {
  const { selectedNetwork } = useSelection();
  const [chartDataByFuel, setChartDataByFuel] = useState<Map<number, any[]>>(new Map());
  const [loadingCharts, setLoadingCharts] = useState(false);

  const loadChartData = useCallback(async (summaries: FuelInventorySummary[]) => {
    if (!selectedNetwork || summaries.length === 0) {
      return;
    }

    setLoadingCharts(true);
    const chartData = new Map<number, any[]>();

    try {
      // Получаем список всех ТТ сети
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);

      if (tradingPoints.length === 0) {
        setLoadingCharts(false);
        return;
      }

      // Для каждой ТТ получаем список смен, затем shift_report для каждой смены
      const allReports = await Promise.all(
        tradingPoints.map(async tp => {
          try {
            const systemId = parseInt(selectedNetwork.external_id);
            const stationId = parseInt(tp.external_id);

            // 1. Получаем список смен за период
            const shiftsResponse = await stsProxyRequest<any[]>(
              '/v1/shifts',
              {
                method: 'GET',
                params: {
                  system: systemId,
                  station: stationId
                }
              }
            );

            if (!shiftsResponse || shiftsResponse.length === 0) {
              return [];
            }

            // 2. Фильтруем смены по периоду
            const dtBegDate = new Date(formatDateForApi(dateFrom, false));
            const dtEndDate = new Date(formatDateForApi(dateTo, true));

            const validShifts = shiftsResponse.filter(shift => {
              if (!shift.dt_open) return false;
              const shiftDate = new Date(shift.dt_open);
              return shiftDate >= dtBegDate && shiftDate <= dtEndDate;
            });

            // 3. Получаем shift_report для каждой смены (с батчингом по 10 запросов)
            const BATCH_SIZE = 10;
            const reports: any[] = [];

            for (let i = 0; i < validShifts.length; i += BATCH_SIZE) {
              const batch = validShifts.slice(i, i + BATCH_SIZE);
              const batchReports = await Promise.all(
                batch.map(async shift => {
                  try {
                    const report = await stsProxyRequest<any>(
                      '/v1/report/shift_report',
                      {
                        method: 'GET',
                        params: {
                          system: systemId,
                          station: stationId,
                          shift: shift.shift
                        }
                      }
                    );
                    // Добавляем метаданные смены к отчету
                    return report ? {
                      ...report,
                      dt_open: shift.dt_open,
                      dt_close: shift.dt_close,
                      station: stationId
                    } : null;
                  } catch (err) {
                    return null;
                  }
                })
              );
              reports.push(...batchReports);
            }

            return reports.filter(r => r !== null);
          } catch (err) {
            return [];
          }
        })
      );

      // Собираем данные по видам топлива и датам
      // Map<fuelCode, Map<dateKey, Map<tankKey, { volumeEnd, shiftDate }>>>
      const dataByFuel = new Map<number, Map<string, Map<string, { volumeEnd: number; shiftDate: string }>>>();

      allReports.flat().forEach(report => {
        // Пропускаем некорректные записи
        if (!report?.release || !Array.isArray(report.release) || report.release.length === 0) {
          return;
        }

        report.release.forEach((tank: any) => {
          if (!tank?.service?.service_code || tank.doc_end?.volume == null) {
            return;
          }

          const fuelCode = tank.service.service_code;
          const volumeEnd = parseFloat(tank.doc_end?.volume || '0');
          const shiftDate = report.dt_close || report.dt_open || new Date().toISOString();
          const dateKey = shiftDate.split(' ')[0] || shiftDate.split('T')[0];
          const tankKey = `${report.station}_${tank.tank}`;

          // Инициализируем структуры данных
          if (!dataByFuel.has(fuelCode)) {
            dataByFuel.set(fuelCode, new Map());
          }

          const fuelData = dataByFuel.get(fuelCode)!;
          if (!fuelData.has(dateKey)) {
            fuelData.set(dateKey, new Map());
          }

          const dayData = fuelData.get(dateKey)!;
          const existing = dayData.get(tankKey);

          // Берем последнюю смену за день для этого резервуара
          if (!existing || new Date(shiftDate) > new Date(existing.shiftDate)) {
            dayData.set(tankKey, { volumeEnd, shiftDate });
          }
        });
      });

      // Для каждого вида топлива создаем данные графика
      summaries.forEach(summary => {
        const fuelData = dataByFuel.get(summary.fuelCode);

        if (fuelData) {
          const chartPoints = Array.from(fuelData.entries())
            .map(([dateKey, tankRecords]) => {
              // Суммируем объемы всех резервуаров за день (берем последнюю смену каждого резервуара)
              const totalVolume = Array.from(tankRecords.values())
                .reduce((sum, record) => sum + record.volumeEnd, 0);

              return {
                time: new Date(dateKey).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
                volume: Math.round(totalVolume),
                dateKey
              };
            })
            .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());

          chartData.set(summary.fuelCode, chartPoints);
        }
      });

      setChartDataByFuel(chartData);
    } catch (err) {
      // Ошибки обрабатываются молча
    } finally {
      setLoadingCharts(false);
    }
  }, [selectedNetwork, dateFrom, dateTo]);

  return {
    chartDataByFuel,
    loadingCharts,
    loadChartData
  };
};
