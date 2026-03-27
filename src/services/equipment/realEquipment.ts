/**
 * Real Equipment API
 *
 * Production API implementations that make actual HTTP calls
 * via fetch or httpClient.
 */

import type {
  Equipment,
  EquipmentTemplate,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  ListEquipmentParams,
  ListEquipmentResponse,
  EquipmentStatusAction,
  EquipmentEvent
} from './types';
import { httpClient } from '@/services/httpClients';
import { getApiBaseUrl } from '@/services/apiConfigService';
import { getToken } from '@/utils/authStorage';
import type { ComponentHealthStatus } from './types';
import { currentComponentsAPI } from '../components';

// Equipment API сервис (httpClient-based)
export const equipmentAPI = {
  // GET /equipment?trading_point_id=...
  async list(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
    const searchParams = new URLSearchParams();

    searchParams.append('trading_point_id', params.trading_point_id);

    if (params.search) searchParams.append('search', params.search);
    if (params.template_id) searchParams.append('template_id', params.template_id);
    if (params.status) searchParams.append('status', params.status);
    if (params.system_type) searchParams.append('system_type', params.system_type);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    return httpClient.get<ListEquipmentResponse>(`/equipment?${searchParams}`);
  },

  // POST /equipment
  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    return httpClient.post<Equipment>('/equipment', data);
  },

  // GET /equipment/{id}
  async get(id: string): Promise<Equipment> {
    return httpClient.get<Equipment>(`/equipment/${id}`);
  },

  // PATCH /equipment/{id}
  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    return httpClient.patch<Equipment>(`/equipment/${id}`, data);
  },

  // POST /equipment/{id}:enable|disable|archive
  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    return httpClient.post<void>(`/equipment/${id}:${action}`, {});
  },

  // DELETE /equipment/{id} - удаление оборудования
  async delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/equipment/${id}`);
  },

  // GET /equipment/{id}/events - журнал событий
  async getEvents(id: string): Promise<EquipmentEvent[]> {
    return httpClient.get<EquipmentEvent[]>(`/equipment/${id}/events`);
  }
};

// Equipment Templates API (httpClient-based)
export const equipmentTemplatesAPI = {
  // GET /equipment-templates
  async list(): Promise<EquipmentTemplate[]> {
    return httpClient.get<EquipmentTemplate[]>('/equipment-templates');
  },

  // GET /equipment-templates/{id}
  async get(id: string): Promise<EquipmentTemplate> {
    return httpClient.get<EquipmentTemplate>(`/equipment-templates/${id}`);
  }
};

// Функция агрегации статусов компонентов для оборудования
export async function getEquipmentComponentsHealth(equipmentId: string): Promise<{
  aggregatedStatus: ComponentHealthStatus;
  componentCount: number;
  statusBreakdown: Record<string, number>;
}> {
  const components = await currentComponentsAPI.list({ equipment_id: equipmentId });

  if (!components.data.length) {
    return {
      aggregatedStatus: 'healthy',
      componentCount: 0,
      statusBreakdown: {}
    };
  }

  // Подсчитываем статусы
  const statusBreakdown: Record<string, number> = {};
  let hasError = false;
  let hasWarning = false;

  for (const component of components.data) {
    statusBreakdown[component.status] = (statusBreakdown[component.status] || 0) + 1;

    // Определяем приоритет статусов: error > offline/disabled > online/archived
    if (component.status === 'error') {
      hasError = true;
    } else if (component.status === 'offline' || component.status === 'disabled') {
      hasWarning = true;
    }
  }

  // Логика агрегации: красный > желтый > зеленый
  let aggregatedStatus: ComponentHealthStatus;
  if (hasError) {
    aggregatedStatus = 'error';
  } else if (hasWarning) {
    aggregatedStatus = 'warning';
  } else {
    aggregatedStatus = 'healthy';
  }

  return {
    aggregatedStatus,
    componentCount: components.data.length,
    statusBreakdown
  };
}

// Real API implementation (for production, fetch-based)
class RealEquipmentAPI {
  private apiUrl: string;

  constructor() {
    this.apiUrl = getApiBaseUrl() + '/equipment';
  }

  async list(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('trading_point_id', params.trading_point_id);
    if (params.search) searchParams.append('search', params.search);
    if (params.template_id) searchParams.append('template_id', params.template_id);
    if (params.status) searchParams.append('status', params.status);
    if (params.system_type) searchParams.append('system_type', params.system_type);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${this.apiUrl}?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get(id: string): Promise<Equipment> {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    const response = await fetch(`${this.apiUrl}/${id}/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
  }

  async getEvents(id: string): Promise<EquipmentEvent[]> {
    const response = await fetch(`${this.apiUrl}/${id}/events`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
}

class RealEquipmentTemplatesAPI {
  private apiUrl: string;

  constructor() {
    this.apiUrl = getApiBaseUrl() + '/equipment-templates';
  }

  async list(): Promise<EquipmentTemplate[]> {
    const response = await fetch(this.apiUrl, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get(id: string): Promise<EquipmentTemplate> {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export class instances
export const realEquipmentAPI = new RealEquipmentAPI();
export const realEquipmentTemplatesAPI = new RealEquipmentTemplatesAPI();
