/**
 * API-клиент для себестоимости поступлений (PG backend)
 * Замена receiptCostService.ts (localStorage)
 */

import { getBackendOrigin } from '@/utils/backendUrl';

const API_BASE_URL = `${getBackendOrigin()}/api`;

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export interface ReceiptCostRecord {
  id: string;
  systemId: number;
  stationNumber: number;
  tankNumber: number;
  ttn: string;
  receiptDt: string;
  fuelCode: number;
  fuelName: string;
  costPerLiter: number;
  costPerKg: number | null;
  inputUnit: 'liter' | 'kg';
  volumeLiters: number;
  density: number;
  totalCost: number;
  supplierId: number | null;
  supplierName: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptCostFilters {
  systemId?: number;
  stationNumber?: number;
  tankNumber?: number;
  fuelCode?: number;
  ttn?: string;
  dtBeg?: string;
  dtEnd?: string;
}

export interface AvgCostByFuel {
  fuel_code: number;
  fuel_name: string;
  receipt_count: string;
  total_volume: string;
  total_cost: string;
  avg_cost_per_liter: string;
}

export interface UpsertReceiptCostData {
  systemId: number;
  stationNumber: number;
  tankNumber: number;
  ttn: string;
  receiptDt: string;
  fuelCode?: number;
  fuelName?: string;
  costPerLiter: number;
  costPerKg?: number | null;
  inputUnit?: 'liter' | 'kg';
  volumeLiters?: number;
  density?: number;
  totalCost?: number;
  supplierId?: number | null;
  supplierName?: string;
}

/** Загрузить себестоимости по фильтрам */
export async function fetchReceiptCosts(filters: ReceiptCostFilters): Promise<ReceiptCostRecord[]> {
  const params = new URLSearchParams();
  if (filters.systemId) params.set('systemId', String(filters.systemId));
  if (filters.stationNumber) params.set('stationNumber', String(filters.stationNumber));
  if (filters.tankNumber) params.set('tankNumber', String(filters.tankNumber));
  if (filters.fuelCode) params.set('fuelCode', String(filters.fuelCode));
  if (filters.ttn) params.set('ttn', filters.ttn);
  if (filters.dtBeg) params.set('dtBeg', filters.dtBeg);
  if (filters.dtEnd) params.set('dtEnd', filters.dtEnd);

  const qs = params.toString();
  const res = await apiRequest(`/receipt-costs${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Ошибка загрузки себестоимости: ${res.status}`);
  return res.json();
}

/** Средняя себестоимость по видам топлива */
export async function fetchAvgCostByFuel(
  systemId: number,
  stationNumber?: number,
  dtBeg?: string,
  dtEnd?: string,
): Promise<AvgCostByFuel[]> {
  const params = new URLSearchParams({ systemId: String(systemId) });
  if (stationNumber) params.set('stationNumber', String(stationNumber));
  if (dtBeg) params.set('dtBeg', dtBeg);
  if (dtEnd) params.set('dtEnd', dtEnd);

  const res = await apiRequest(`/receipt-costs/avg?${params}`);
  if (!res.ok) throw new Error(`Ошибка загрузки средней себестоимости: ${res.status}`);
  return res.json();
}

/** Сохранить / обновить одну запись */
export async function upsertReceiptCost(data: UpsertReceiptCostData): Promise<ReceiptCostRecord> {
  const res = await apiRequest('/receipt-costs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Ошибка сохранения себестоимости: ${res.status}`);
  return res.json();
}

/** Массовое сохранение */
export async function bulkUpsertReceiptCosts(
  entries: UpsertReceiptCostData[],
  mode: 'fill_empty' | 'overwrite' = 'fill_empty',
): Promise<{ inserted: number; updated: number }> {
  const res = await apiRequest('/receipt-costs/bulk', {
    method: 'POST',
    body: JSON.stringify({ entries, mode }),
  });
  if (!res.ok) throw new Error(`Ошибка массового сохранения: ${res.status}`);
  return res.json();
}

/** Удалить запись */
export async function deleteReceiptCostById(id: string): Promise<void> {
  const res = await apiRequest(`/receipt-costs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Ошибка удаления: ${res.status}`);
}

/**
 * Пересчёт стоимости при смене единицы измерения.
 * density в кг/м³ → 1 литр = density / 1000 кг
 */
export function recalculateCosts(
  value: number,
  inputUnit: 'liter' | 'kg',
  density: number,
): { costPerLiter: number; costPerKg: number } {
  const kgPerLiter = density / 1000;

  if (inputUnit === 'liter') {
    return {
      costPerLiter: value,
      costPerKg: kgPerLiter > 0 ? value / kgPerLiter : 0,
    };
  } else {
    return {
      costPerLiter: value * kgPerLiter,
      costPerKg: value,
    };
  }
}

/** Генерация ключа для Map-индекса (совместимость с существующим кодом) */
export function makeReceiptCostKey(
  system: number,
  station: number,
  tank: number,
  ttn: string,
  dt: string,
): string {
  return `${system}:${station}:${tank}:${ttn}:${dt}`;
}

/** Построение Map-индекса из массива записей */
export function buildCostIndex(costs: ReceiptCostRecord[]): Map<string, ReceiptCostRecord> {
  const map = new Map<string, ReceiptCostRecord>();
  for (const c of costs) {
    const key = makeReceiptCostKey(c.systemId, c.stationNumber, c.tankNumber, c.ttn, c.receiptDt);
    map.set(key, c);
  }
  return map;
}
