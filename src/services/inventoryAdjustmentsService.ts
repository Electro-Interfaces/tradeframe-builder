import { apiRequest } from './apiClient';
import type {
  CreateInventoryAdjustmentPayload,
  InventoryAdjustment,
  InventoryAdjustmentsListFilters,
  UpdateInventoryAdjustmentPayload,
} from '@/types/inventoryAdjustment';

function buildQuery(filters: InventoryAdjustmentsListFilters): string {
  const params = new URLSearchParams();
  if (filters.networkId) params.set('networkId', filters.networkId);
  if (filters.tradingPointId) params.set('tradingPointId', filters.tradingPointId);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const inventoryAdjustmentsService = {
  async list(filters: InventoryAdjustmentsListFilters = {}): Promise<InventoryAdjustment[]> {
    return apiRequest(`/inventory-adjustments${buildQuery(filters)}`);
  },

  async getById(id: string): Promise<InventoryAdjustment> {
    return apiRequest(`/inventory-adjustments/${id}`);
  },

  async create(payload: CreateInventoryAdjustmentPayload): Promise<InventoryAdjustment> {
    return apiRequest('/inventory-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateInventoryAdjustmentPayload): Promise<InventoryAdjustment> {
    return apiRequest(`/inventory-adjustments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async send(id: string): Promise<InventoryAdjustment> {
    return apiRequest(`/inventory-adjustments/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  pdfUrl(id: string): string {
    // Прямая ссылка на скачивание PDF (нужен токен в заголовке — fetch ниже)
    return `/inventory-adjustments/${id}/pdf`;
  },

  async cancel(id: string, reason?: string): Promise<InventoryAdjustment> {
    return apiRequest(`/inventory-adjustments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest(`/inventory-adjustments/${id}`, { method: 'DELETE' });
  },

  async getEmailRecipients(networkId: string): Promise<{
    recipients: string[];
    cc: string[];
    fromAddress: string | null;
  }> {
    return apiRequest(`/inventory-adjustments/email-recipients/${networkId}`);
  },

  async saveEmailRecipients(
    networkId: string,
    payload: { recipients: string[]; cc: string[]; fromAddress: string | null }
  ): Promise<{ recipients: string[]; cc: string[]; fromAddress: string | null }> {
    return apiRequest(`/inventory-adjustments/email-recipients/${networkId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
