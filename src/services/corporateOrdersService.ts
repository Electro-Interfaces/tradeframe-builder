/**
 * API-клиент корпоративных заказов (ведомость).
 */
import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken } from '@/utils/authStorage';
import type { CorporateOrder, CorporateOrderInput } from '@/types/corporateLedger';

const API_BASE = `${getBackendOrigin()}/api/corporate-orders`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CorporateOrdersFilter {
  networkId?: string;
  clientId?: string;
  status?: string;
  stationCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const corporateOrdersService = {
  list(params: CorporateOrdersFilter = {}): Promise<CorporateOrder[]> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
    const q = qs.toString();
    return request<CorporateOrder[]>(q ? `?${q}` : '');
  },

  create(data: CorporateOrderInput): Promise<CorporateOrder> {
    return request<CorporateOrder>('', { method: 'POST', body: JSON.stringify(data) });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/${id}`, { method: 'DELETE' });
  },

  /** Фаза 2: отправить заказ в MSTO (пока заглушка на backend — 501). */
  send(id: string): Promise<CorporateOrder> {
    return request<CorporateOrder>(`/${id}/send`, { method: 'POST' });
  },
};
