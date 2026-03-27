/**
 * API-клиент для подтверждений поступлений менеджером (PG backend)
 */

import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken } from '@/utils/authStorage';

const API_BASE_URL = `${getBackendOrigin()}/api`;

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ── Типы ──────────────────────────────────────────────

export type ConfirmationStatus = 'confirmed' | 'corrected' | 'rejected';

export interface ReceiptConfirmation {
  id: string;
  systemId: number;
  stationNumber: number;
  shiftNumber: number;
  tankNumber: number;
  ttn: string;
  receiptDt: string;
  status: ConfirmationStatus;
  correctedVolume: string | null;
  correctedAmount: string | null;
  correctedDensity: number | null;
  correctedTemp: number | null;
  comment: string;
  confirmedBy: string;
  confirmedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmReceiptData {
  systemId: number;
  stationNumber: number;
  shiftNumber: number;
  tankNumber: number;
  ttn: string;
  receiptDt: string;
  status: ConfirmationStatus;
  correctedVolume?: string | null;
  correctedAmount?: string | null;
  correctedDensity?: number | null;
  correctedTemp?: number | null;
  comment?: string;
  confirmedByName?: string;
}

export interface ConfirmationFilters {
  systemId?: number;
  stationNumber?: number;
  tankNumber?: number;
  ttn?: string;
  status?: ConfirmationStatus;
  dtBeg?: string;
  dtEnd?: string;
}

// ── API-функции ──────────────────────────────────────

/** Загрузить подтверждения по фильтрам */
export async function fetchConfirmations(filters: ConfirmationFilters): Promise<ReceiptConfirmation[]> {
  const params = new URLSearchParams();
  if (filters.systemId) params.set('systemId', String(filters.systemId));
  if (filters.stationNumber) params.set('stationNumber', String(filters.stationNumber));
  if (filters.tankNumber) params.set('tankNumber', String(filters.tankNumber));
  if (filters.ttn) params.set('ttn', filters.ttn);
  if (filters.status) params.set('status', filters.status);
  if (filters.dtBeg) params.set('dtBeg', filters.dtBeg);
  if (filters.dtEnd) params.set('dtEnd', filters.dtEnd);

  const qs = params.toString();
  const res = await apiRequest(`/receipt-confirmations${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Ошибка загрузки подтверждений: ${res.status}`);
  return res.json();
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/** Подтвердить / скорректировать поступление */
export async function confirmReceipt(data: ConfirmReceiptData): Promise<ReceiptConfirmation> {
  const res = await apiRequest('/receipt-confirmations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Ошибка сохранения: ${res.status}`));
  return res.json();
}

/** Массовое подтверждение */
export async function bulkConfirmReceipts(
  items: ConfirmReceiptData[],
): Promise<{ count: number; items: ReceiptConfirmation[] }> {
  const res = await apiRequest('/receipt-confirmations/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Ошибка массового подтверждения: ${res.status}`));
  return res.json();
}

/** Отменить подтверждение */
export async function deleteConfirmation(id: string): Promise<void> {
  const res = await apiRequest(`/receipt-confirmations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Ошибка удаления: ${res.status}`));
}

// ── Утилиты ──────────────────────────────────────────

/** Ключ для Map-индекса (совместим с receiptCostApiService) */
export function makeConfirmationKey(
  system: number,
  station: number,
  tank: number,
  ttn: string,
  dt: string,
): string {
  return `${system}:${station}:${tank}:${ttn}:${dt}`;
}

/** Построение Map-индекса из массива подтверждений */
export function buildConfirmationIndex(items: ReceiptConfirmation[]): Map<string, ReceiptConfirmation> {
  const map = new Map<string, ReceiptConfirmation>();
  for (const c of items) {
    const key = makeConfirmationKey(c.systemId, c.stationNumber, c.tankNumber, c.ttn, c.receiptDt);
    map.set(key, c);
  }
  return map;
}
