/**
 * HTTP клиенты для работы с реальным API
 * Готовы для замены mock сервисов в production
 */

import { 
  Equipment, 
  EquipmentTemplate,
  CreateEquipmentRequest, 
  UpdateEquipmentRequest,
  ListEquipmentParams,
  ListEquipmentResponse,
  EquipmentStatusAction,
  EquipmentEvent
} from '@/types/equipment';

import { 
  Component, 
  ComponentTemplate,
  CreateComponentRequest, 
  UpdateComponentRequest,
  ListComponentsParams,
  ListComponentsResponse,
  ComponentStatusAction
} from '@/types/component';

// Конфигурация API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Утилита для HTTP запросов с полной поддержкой заголовков
class HttpApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Получение токена авторизации (если есть)
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json',
      'X-Trace-Id': this.generateTraceId(),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    // Добавляем Idempotency-Key для мутирующих операций
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Для работы с cookies
    });

    // Обработка ошибок в формате RFC 7807 (Problem Details)
    if (!response.ok) {
      const errorBody = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { 
          type: 'about:blank',
          title: 'HTTP Error',
          status: response.status,
          detail: errorBody || response.statusText
        };
      }
      
      throw new HttpApiError(response.status, errorData);
    }

    // Пустой ответ для DELETE операций
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = params ? new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value != null)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT', 
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Класс для обработки HTTP ошибок
export class HttpApiError extends Error {
  constructor(
    public status: number,
    public problemDetails: {
      type?: string;
      title: string;
      status: number;
      detail: string;
      instance?: string;
      [key: string]: any;
    }
  ) {
    super(`${problemDetails.title}: ${problemDetails.detail}`);
    this.name = 'HttpApiError';
  }

  // Проверка типов ошибок
  isValidationError(): boolean {
    return this.status === 400 || this.problemDetails.type?.includes('validation');
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  isNotFoundError(): boolean {
    return this.status === 404;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

const httpClient = new HttpApiClient();

// ===== HTTP EQUIPMENT API =====
export const httpEquipmentAPI = {
  // GET /equipment?trading_point_id=...&status=...&search=...
  async list(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
    return httpClient.get<ListEquipmentResponse>('/equipment', params);
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

  // GET /equipment/{id}/events
  async getEvents(id: string): Promise<EquipmentEvent[]> {
    return httpClient.get<EquipmentEvent[]>(`/equipment/${id}/events`);
  }
};

// ===== HTTP EQUIPMENT TEMPLATES API =====
export const httpEquipmentTemplatesAPI = {
  // GET /equipment-templates
  async list(): Promise<EquipmentTemplate[]> {
    return httpClient.get<EquipmentTemplate[]>('/equipment-templates');
  },

  // GET /equipment-templates/{id}
  async get(id: string): Promise<EquipmentTemplate> {
    return httpClient.get<EquipmentTemplate>(`/equipment-templates/${id}`);
  }
};

// ===== HTTP COMPONENTS API =====
export const httpComponentsAPI = {
  // GET /components?equipment_id=...&status=...&search=...
  async list(params: ListComponentsParams = {}): Promise<ListComponentsResponse> {
    return httpClient.get<ListComponentsResponse>('/components', params);
  },

  // POST /components
  async create(data: CreateComponentRequest): Promise<Component> {
    return httpClient.post<Component>('/components', data);
  },

  // GET /components/{id}
  async get(id: string): Promise<Component> {
    return httpClient.get<Component>(`/components/${id}`);
  },

  // PATCH /components/{id}
  async update(id: string, data: UpdateComponentRequest): Promise<Component> {
    return httpClient.patch<Component>(`/components/${id}`, data);
  },

  // POST /components/{id}:enable|disable|archive
  async updateStatus(id: string, action: ComponentStatusAction): Promise<Component> {
    return httpClient.post<Component>(`/components/${id}:${action}`, {});
  }
};

// ===== HTTP COMPONENT TEMPLATES API =====
export const httpComponentTemplatesAPI = {
  // GET /component-templates?equipment_template_id=...
  async list(equipmentTemplateId?: string): Promise<ComponentTemplate[]> {
    const params = equipmentTemplateId ? { equipment_template_id: equipmentTemplateId } : {};
    return httpClient.get<ComponentTemplate[]>('/component-templates', params);
  },

  // GET /component-templates/{id}
  async get(id: string): Promise<ComponentTemplate> {
    return httpClient.get<ComponentTemplate>(`/component-templates/${id}`);
  }
};

// ===== ГОТОВЫЕ КЛИЕНТЫ ДЛЯ ЗАМЕНЫ =====
// Раскомментировать эти строки для перехода на реальное API:

// export const productionEquipmentAPI = httpEquipmentAPI;
// export const productionEquipmentTemplatesAPI = httpEquipmentTemplatesAPI;
// export const productionComponentsAPI = httpComponentsAPI;
// export const productionComponentTemplatesAPI = httpComponentTemplatesAPI;