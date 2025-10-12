/**
 * Сервис для работы с поступлениями топлива
 * API: /v1/report/receipts
 */

import { stsApiService } from './stsApi';
import type {
  ReceiptsResponse,
  ReceiptsQueryParams,
  FlatReceipt,
  ReceiptsStats
} from '@/types/receipts';

/**
 * Получение данных о поступлениях топлива
 */
export async function fetchReceipts(params: ReceiptsQueryParams): Promise<ReceiptsResponse> {
  // Используем централизованный токен из stsApiService
  await stsApiService.refreshTokenIfNeeded();
  const config = stsApiService.getConfig();

  if (!config?.token) {
    throw new Error('STS API authentication failed');
  }

  const API_BASE_URL = config.url;

  const url = new URL(`${API_BASE_URL}/v1/report/receipts`);

  // Добавляем параметры запроса
  url.searchParams.append('system', params.system.toString());
  if (params.station) url.searchParams.append('station', params.station.toString());
  if (params.shift) url.searchParams.append('shift', params.shift.toString());

  // Преобразуем дату в ISO формат с временем (YYYY-MM-DDTHH:MM:SS)
  if (params.dt_beg) {
    const dtBeg = params.dt_beg.includes('T') ? params.dt_beg : `${params.dt_beg}T00:00:00`;
    url.searchParams.append('dt_beg', dtBeg);
  }
  if (params.dt_end) {
    const dtEnd = params.dt_end.includes('T') ? params.dt_end : `${params.dt_end}T23:59:59`;
    url.searchParams.append('dt_end', dtEnd);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorDetails = response.statusText;
    try {
      const errorBody = await response.json();
      errorDetails = JSON.stringify(errorBody);
    } catch {
      // Игнорируем ошибку парсинга
    }
    throw new Error(`API request failed: ${response.status} ${errorDetails}`);
  }

  return response.json();
}

/**
 * Преобразование вложенной структуры в плоский список для таблицы
 */
export function flattenReceipts(data: ReceiptsResponse): FlatReceipt[] {
  const flattened: FlatReceipt[] = [];

  data.forEach(station => {
    station.shifts.forEach(shift => {
      shift.receipt.forEach(receipt => {
        const docVolume = parseFloat(receipt.doc.volume);
        const factVolume = parseFloat(receipt.fact.volume);
        const docAmount = parseFloat(receipt.doc.amount);
        const factAmount = parseFloat(receipt.fact.amount);

        const volumeDiff = factVolume - docVolume;
        const amountDiff = factAmount - docAmount;
        const volumeDiffPercent = docVolume !== 0 ? (volumeDiff / docVolume) * 100 : 0;
        const amountDiffPercent = docAmount !== 0 ? (amountDiff / docAmount) * 100 : 0;

        flattened.push({
          ...receipt,
          stationNumber: station.number,
          shiftNumber: shift.number,
          volumeDiff,
          amountDiff,
          volumeDiffPercent,
          amountDiffPercent
        });
      });
    });
  });

  return flattened;
}

/**
 * Вычисление статистики по поступлениям
 */
export function calculateReceiptsStats(receipts: FlatReceipt[]): ReceiptsStats {
  if (receipts.length === 0) {
    return {
      totalReceipts: 0,
      totalVolume: 0,
      totalAmount: 0,
      avgVolumeDiff: 0,
      avgAmountDiff: 0,
      byFuelType: {}
    };
  }

  let totalVolume = 0;
  let totalAmount = 0;
  let totalVolumeDiff = 0;
  let totalAmountDiff = 0;
  const byFuelType: Record<string, { count: number; volume: number; amount: number }> = {};

  receipts.forEach(receipt => {
    const volume = parseFloat(receipt.fact.volume);
    const amount = parseFloat(receipt.fact.amount);

    totalVolume += volume;
    totalAmount += amount;
    totalVolumeDiff += Math.abs(receipt.volumeDiffPercent);
    totalAmountDiff += Math.abs(receipt.amountDiffPercent);

    const fuelKey = receipt.service.service_name;
    if (!byFuelType[fuelKey]) {
      byFuelType[fuelKey] = { count: 0, volume: 0, amount: 0 };
    }

    byFuelType[fuelKey].count++;
    byFuelType[fuelKey].volume += volume;
    byFuelType[fuelKey].amount += amount;
  });

  return {
    totalReceipts: receipts.length,
    totalVolume,
    totalAmount,
    avgVolumeDiff: totalVolumeDiff / receipts.length,
    avgAmountDiff: totalAmountDiff / receipts.length,
    byFuelType
  };
}

/**
 * Получение уникальных значений для фильтров
 */
export function getFilterOptions(receipts: FlatReceipt[]) {
  const stations = new Set<number>();
  const fuelTypes = new Set<string>();
  const tanks = new Set<number>();
  const bases = new Map<number, string>();
  const shifts = new Set<number>();

  receipts.forEach(receipt => {
    stations.add(receipt.stationNumber);
    fuelTypes.add(receipt.service.service_name);
    tanks.add(receipt.tank);
    bases.set(receipt.base.id, receipt.base.name);
    shifts.add(receipt.shiftNumber);
  });

  return {
    stations: Array.from(stations).sort((a, b) => a - b),
    fuelTypes: Array.from(fuelTypes).sort(),
    tanks: Array.from(tanks).sort((a, b) => a - b),
    bases: Array.from(bases.entries()).map(([id, name]) => ({ id, name })),
    shifts: Array.from(shifts).sort((a, b) => a - b)
  };
}

/**
 * Фильтрация поступлений на клиенте
 */
export function filterReceipts(
  receipts: FlatReceipt[],
  filters: {
    stationIds?: number[];
    fuelTypes?: string[];
    tankNumber?: number | null;
    baseId?: number | null;
    shiftFrom?: number | null;
    shiftTo?: number | null;
    ttnNumber?: string;
  }
): FlatReceipt[] {
  return receipts.filter(receipt => {
    // Фильтр по ТТ
    if (filters.stationIds && filters.stationIds.length > 0) {
      if (!filters.stationIds.includes(receipt.stationNumber)) return false;
    }

    // Фильтр по виду топлива
    if (filters.fuelTypes && filters.fuelTypes.length > 0) {
      if (!filters.fuelTypes.includes(receipt.service.service_name)) return false;
    }

    // Фильтр по резервуару
    if (filters.tankNumber !== null && filters.tankNumber !== undefined) {
      if (receipt.tank !== filters.tankNumber) return false;
    }

    // Фильтр по нефтебазе
    if (filters.baseId !== null && filters.baseId !== undefined) {
      if (receipt.base.id !== filters.baseId) return false;
    }

    // Фильтр по диапазону смен
    if (filters.shiftFrom !== null && filters.shiftFrom !== undefined) {
      if (receipt.shiftNumber < filters.shiftFrom) return false;
    }
    if (filters.shiftTo !== null && filters.shiftTo !== undefined) {
      if (receipt.shiftNumber > filters.shiftTo) return false;
    }

    // Фильтр по номеру ТТН (частичное совпадение)
    if (filters.ttnNumber && filters.ttnNumber.trim() !== '') {
      if (!receipt.ttn.toLowerCase().includes(filters.ttnNumber.toLowerCase().trim())) {
        return false;
      }
    }

    return true;
  });
}
