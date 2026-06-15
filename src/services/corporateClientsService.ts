/**
 * API-клиент реестра корпоративных клиентов (раздел «Ведомости»).
 */
import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken } from '@/utils/authStorage';
import type { CorporateClient, CorporateClientInput } from '@/types/corporateLedger';

const API_BASE = `${getBackendOrigin()}/api/corporate-clients`;

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

export const corporateClientsService = {
  list(params: { networkId?: string; status?: string; searchTerm?: string } = {}): Promise<CorporateClient[]> {
    const qs = new URLSearchParams();
    if (params.networkId) qs.set('networkId', params.networkId);
    if (params.status) qs.set('status', params.status);
    if (params.searchTerm) qs.set('searchTerm', params.searchTerm);
    const q = qs.toString();
    return request<CorporateClient[]>(q ? `?${q}` : '');
  },

  create(data: CorporateClientInput): Promise<CorporateClient> {
    return request<CorporateClient>('', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: CorporateClientInput): Promise<CorporateClient> {
    return request<CorporateClient>(`/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/${id}`, { method: 'DELETE' });
  },

  setActive(id: string, active: boolean): Promise<CorporateClient> {
    return request<CorporateClient>(`/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
  },
};
