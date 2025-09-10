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
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

// Утилита для HTTP запросов с полной поддержкой заголовков
class HttpApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Получение и проверка токена авторизации
    let token = await this.getValidToken();
    
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

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Для работы с cookies
    });

    // Если получили 401, пробуем обновить токен и повторить запрос
    if (response.status === 401) {
      console.log('🔄 Token expired, attempting refresh...');
      token = await this.refreshToken();
      
      if (token) {
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${token}`,
        };
        
        response = await fetch(url, {
          ...options,
          headers: newHeaders,
          credentials: 'include',
        });
      }
    }

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

  /**
   * Получение валидного токена с проверкой срока действия
   */
  private async getValidToken(): Promise<string | null> {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const tokenExpiry = localStorage.getItem('auth_token_expiry') || sessionStorage.getItem('auth_token_expiry');
    
    if (!token) {
      return null;
    }
    
    // Проверяем срок действия токена
    if (tokenExpiry && new Date(tokenExpiry) <= new Date()) {
      console.log('🕐 Token expired, attempting refresh...');
      return await this.refreshToken();
    }
    
    return token;
  }

  /**
   * Обновление токена через логин/пароль
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const savedLogin = localStorage.getItem('auth_login') || sessionStorage.getItem('auth_login');
      const savedPassword = localStorage.getItem('auth_password') || sessionStorage.getItem('auth_password');
      
      if (!savedLogin || !savedPassword) {
        console.error('❌ No saved credentials for token refresh');
        this.clearAuth();
        // Перенаправляем на страницу входа
        window.location.href = '/login';
        return null;
      }

      console.log('🔐 Refreshing token with saved credentials...');
      
      // Импортируем сервис аутентификации динамически чтобы избежать циклических зависимостей
      const { SupabaseAuthService } = await import('./supabaseAuthService');
      
      const user = await SupabaseAuthService.login(savedLogin, savedPassword);
      
      // Генерируем новый токен (в реальной системе это должен быть JWT)
      const newToken = this.generateAuthToken(user);
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 час
      
      // Сохраняем новый токен
      const storage = localStorage.getItem('auth_login') ? localStorage : sessionStorage;
      storage.setItem('auth_token', newToken);
      storage.setItem('auth_token_expiry', expiryTime.toISOString());
      storage.setItem('auth_user', JSON.stringify(user));
      
      console.log('✅ Token refreshed successfully');
      return newToken;
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.clearAuth();
      // Перенаправляем на страницу входа
      window.location.href = '/login';
      return null;
    }
  }

  /**
   * Генерация токена для пользователя (временная реализация)
   */
  private generateAuthToken(user: any): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 час
    };
    
    // В реальной системе здесь должно быть JWT подписывание
    return `token_${btoa(JSON.stringify(payload))}_${Date.now()}`;
  }

  /**
   * Очистка данных аутентификации
   */
  private clearAuth(): void {
    ['auth_token', 'auth_token_expiry', 'auth_user', 'auth_login', 'auth_password'].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
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

export const httpClient = new HttpApiClient();

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