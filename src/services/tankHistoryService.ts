/**
 * Сервис для работы с историей резервуаров через /v1/tank_history
 */

import { stsProxyRequest } from './stsProxyClient';
import type {
  TankHistoryRecord,
  TankHistoryParams,
  TankHistoryStats,
  AnalysisPeriod
} from '@/types/tanks';

/**
 * Получить историю резервуара за период
 */
export async function getTankHistory(params: TankHistoryParams): Promise<TankHistoryRecord[]> {
  const queryParams: Record<string, any> = {
    system: params.system,
    station: params.station
  };

  if (params.dt_beg) {
    queryParams.dt_beg = params.dt_beg;
  }

  if (params.dt_end) {
    queryParams.dt_end = params.dt_end;
  }

  const history = await stsProxyRequest<TankHistoryRecord[]>('/v1/tank_history', {
    method: 'GET',
    params: queryParams
  });

  return history;
}

/**
 * Вычислить даты для заданного периода анализа
 */
export function getPeriodDates(period: AnalysisPeriod, customStart?: Date, customEnd?: Date): { dt_beg: string; dt_end: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case '24h':
      // Начинаем с 00:00 сегодняшнего дня
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7d':
      // Начинаем с 00:00, 7 дней назад
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '30d':
      // Начинаем с 00:00, 30 дней назад
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Для кастомного периода необходимо указать customStart и customEnd');
      }
      startDate = customStart;
      endDate = customEnd;
      break;
  }

  // Формат для SQL Server: YYYY-MM-DD HH:MM:SS
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return {
    dt_beg: formatDate(startDate),
    dt_end: formatDate(endDate)
  };
}

/**
 * Вычислить статистику по истории резервуара
 */
export function calculateStats(history: TankHistoryRecord[]): TankHistoryStats {
  if (history.length === 0) {
    return {
      volume: { min: 0, max: 0, avg: 0, current: 0 },
      volumeBook: { min: 0, max: 0, avg: 0, current: 0 },
      temperature: { min: 0, max: 0, avg: 0, current: 0 },
      density: { min: 0, max: 0, avg: 0, current: 0 },
      waterLevel: { min: 0, max: 0, avg: 0, current: 0 },
      release: { total: 0, avg: 0 },
      releaseBook: { total: 0, avg: 0 }
    };
  }

  // Преобразуем строки в числа
  const volumes = history.map(r => parseFloat(r.volume));
  const volumesBook = history.map(r => parseFloat(r.volume_end));
  const temperatures = history.map(r => parseFloat(r.temperature));
  const densities = history.map(r => parseFloat(r.density));
  const waterLevels = history.map(r => parseFloat(r.water.level));
  const releases = history.map(r => parseFloat(r.release.volume));

  // Книжная реализация - вычисляем накопленную с начала периода
  const firstRecord = history[0];
  const lastRecord = history[history.length - 1];
  const firstVolumeEnd = parseFloat(firstRecord.volume_end);
  const lastVolumeEnd = parseFloat(lastRecord.volume_end);

  // Накопленная книжная реализация для каждой записи
  const releasesBook = history.map(r => {
    const volumeEnd = parseFloat(r.volume_end);
    return firstVolumeEnd - volumeEnd; // Разница от начала периода
  });

  return {
    volume: {
      min: Math.min(...volumes),
      max: Math.max(...volumes),
      avg: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      current: parseFloat(lastRecord.volume)
    },
    volumeBook: {
      min: Math.min(...volumesBook),
      max: Math.max(...volumesBook),
      avg: volumesBook.reduce((a, b) => a + b, 0) / volumesBook.length,
      current: lastVolumeEnd
    },
    temperature: {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures),
      avg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      current: parseFloat(lastRecord.temperature)
    },
    density: {
      min: Math.min(...densities),
      max: Math.max(...densities),
      avg: densities.reduce((a, b) => a + b, 0) / densities.length,
      current: parseFloat(lastRecord.density)
    },
    waterLevel: {
      min: Math.min(...waterLevels),
      max: Math.max(...waterLevels),
      avg: waterLevels.reduce((a, b) => a + b, 0) / waterLevels.length,
      current: parseFloat(lastRecord.water.level)
    },
    release: {
      total: parseFloat(lastRecord.release.volume),
      avg: releases.reduce((a, b) => a + b, 0) / releases.length
    },
    releaseBook: {
      total: firstVolumeEnd - lastVolumeEnd, // Общая реализация за период
      avg: releasesBook.reduce((a, b) => a + b, 0) / releasesBook.length
    }
  };
}

/**
 * Фильтровать историю для конкретного резервуара
 */
export function filterByTankNumber(history: TankHistoryRecord[], tankNumber: number): TankHistoryRecord[] {
  return history.filter(record => record.number === tankNumber);
}

/**
 * Получить историю конкретного резервуара с статистикой
 */
export async function getTankAnalysis(
  params: TankHistoryParams,
  tankNumber: number,
  period: AnalysisPeriod = '24h',
  customStart?: Date,
  customEnd?: Date
): Promise<{ history: TankHistoryRecord[]; stats: TankHistoryStats }> {
  // Вычисляем даты периода
  const dates = getPeriodDates(period, customStart, customEnd);

  // Получаем историю
  const allHistory = await getTankHistory({
    ...params,
    dt_beg: dates.dt_beg,
    dt_end: dates.dt_end
  });

  // Фильтруем по номеру резервуара
  const tankHistory = filterByTankNumber(allHistory, tankNumber);

  // Вычисляем статистику
  const stats = calculateStats(tankHistory);

  return {
    history: tankHistory,
    stats
  };
}
