/**
 * Сервис для работы с поступлениями топлива
 * API: /v1/report/receipts
 */

import { apiConfigService } from './apiConfigService';
import type {
  ReceiptsResponse,
  ReceiptsQueryParams,
  FlatReceipt,
  ReceiptsStats
} from '@/types/receipts';

const API_BASE_URL = import.meta.env.VITE_STS_API_URL || 'https://pos.autooplata.ru/tms';

/**
 * Получить JWT токен для авторизации
 */
async function getAuthToken(): Promise<string> {
  // Пытаемся получить настройки из apiConfigService
  const allConnections = apiConfigService.getAllConnections();
  const stsConnection = allConnections.find(conn => conn.id === 'trading-network-api');

  let username = import.meta.env.VITE_STS_API_USERNAME;
  let password = import.meta.env.VITE_STS_API_PASSWORD;

  // Если есть настройки в apiConfigService - используем их
  if (stsConnection?.settings?.username && stsConnection?.settings?.password) {
    username = stsConnection.settings.username;
    password = stsConnection.settings.password;
  }

  if (!username || !password) {
    throw new Error('STS API credentials not configured');
  }

  // Авторизация через Basic Auth для получения JWT
  const basicAuth = btoa(`${username}:${password}`);

  const response = await fetch(`${API_BASE_URL}/v1/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const token = await response.text();
  return token.replace(/"/g, ''); // Убираем кавычки из ответа
}

/**
 * Получение данных о поступлениях топлива
 */
export async function fetchReceipts(params: ReceiptsQueryParams): Promise<ReceiptsResponse> {
  const token = await getAuthToken();

  const url = new URL(`${API_BASE_URL}/v1/report/receipts`);

  // Добавляем параметры запроса
  url.searchParams.append('system', params.system.toString());
  if (params.station) url.searchParams.append('station', params.station.toString());
  if (params.shift) url.searchParams.append('shift', params.shift.toString());
  if (params.dt_beg) url.searchParams.append('dt_beg', params.dt_beg);
  if (params.dt_end) url.searchParams.append('dt_end', params.dt_end);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
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
