import { 
  Component, 
  ComponentTemplate,
  CreateComponentRequest, 
  UpdateComponentRequest,
  ComponentFilters,
  ListComponentsParams,
  ListComponentsResponse,
  ComponentStatusAction,
  ComponentEvent
} from '@/types/component';
import { componentTemplatesStore } from '@/mock/componentTemplatesStore';

// Базовый URL для API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Утилита для HTTP запросов с трейсингом
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json',
      'X-Trace-Id': this.generateTraceId(),
      ...options.headers,
    };

    // Добавляем Idempotency-Key для мутирующих операций
    if (['POST', 'PUT', 'PATCH'].includes(options.method || 'GET')) {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

const apiClient = new ApiClient();

// Mock данные компонентов для демо (в production заменить на API)
// Статичные данные для демонстрации интерфейса - не сохраняются между сессиями
const mockComponents: Component[] = [
  {
    id: "comp_001",
    trading_point_id: "1",
    equipment_id: "eq_1", // Резервуар №1 (АИ-95)
    template_id: "comp_sensor_level_1",
    display_name: "Датчик уровня А-95",
    serial_number: "DUT2024001",
    params: {
      accuracy: 2.0,
      range_min: 0,
      range_max: 50000,
      calibration_factor: 1.0
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: "comp_002",
    trading_point_id: "1",
    equipment_id: "eq_3", // Терминал самообслуживания №1
    template_id: "comp_printer_1",
    display_name: "Принтер чеков",
    serial_number: "PR58001234",
    params: {
      paper_width: 58,
      print_speed: 150,
      auto_cut: true,
      encoding: "UTF-8"
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: "comp_003",
    trading_point_id: "1",
    equipment_id: "eq_3", // Терминал самообслуживания №1
    template_id: "comp_pinpad_1", 
    display_name: "Пинпад VeriFone",
    serial_number: "VF2001567",
    params: {
      connection_type: "USB",
      encryption_level: "AES256",
      timeout_seconds: 60
    },
    status: 'offline',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  }
];

// Mock API для компонентов (в production заменить на HTTP клиент к реальному API)
// ВНИМАНИЕ: Данные не сохраняются между сессиями - это только для демо интерфейса
export const mockComponentsAPI = {
  async list(params: ListComponentsParams = {}): Promise<ListComponentsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredComponents = [...mockComponents];
    
    // Фильтрация
    if (params.equipment_id) {
      filteredComponents = filteredComponents.filter(comp => comp.equipment_id === params.equipment_id);
    }
    
    if (params.status) {
      filteredComponents = filteredComponents.filter(comp => comp.status === params.status);
    }
    
    if (params.template_id) {
      filteredComponents = filteredComponents.filter(comp => comp.template_id === params.template_id);
    }
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredComponents = filteredComponents.filter(comp =>
        comp.display_name.toLowerCase().includes(searchLower) ||
        comp.serial_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Сортировка
    if (params.sort_by) {
      const sortBy = params.sort_by;
      const sortOrder = params.sort_order || 'asc';
      
      filteredComponents.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
          case 'display_name':
            valueA = a.display_name;
            valueB = b.display_name;
            break;
          case 'status':
            valueA = a.status;
            valueB = b.status;
            break;
          case 'created_at':
            valueA = a.created_at;
            valueB = b.created_at;
            break;
          case 'updated_at':
            valueA = a.updated_at;
            valueB = b.updated_at;
            break;
          default:
            return 0;
        }
        
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Пагинация
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = filteredComponents.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageComponents = filteredComponents.slice(startIndex, endIndex);
    
    // Добавляем информацию о шаблонах
    const componentsWithTemplates = pageComponents.map(comp => ({
      ...comp,
      template: componentTemplatesStore.getById(comp.template_id)
    }));
    
    return {
      data: componentsWithTemplates,
      total,
      page,
      limit,
      total_pages
    };
  },

  async get(id: string): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const component = mockComponents.find(comp => comp.id === id);
    if (!component) {
      throw new ApiError(404, 'Component not found');
    }
    
    return {
      ...component,
      template: componentTemplatesStore.getById(component.template_id)
    };
  },

  async create(data: CreateComponentRequest): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Валидация совместимости (здесь нужно было бы получить equipment template_id)
    // Для демо предполагаем что проверка проходит
    
    const newComponent: Component = {
      id: `comp_${Date.now()}`,
      trading_point_id: data.trading_point_id,
      equipment_id: data.equipment_id,
      template_id: data.template_id,
      display_name: data.overrides.display_name,
      serial_number: data.overrides.serial_number,
      params: {
        // Берем defaults из шаблона
        ...(componentTemplatesStore.getById(data.template_id)?.defaults || {}),
        // Перезаписываем переданными параметрами
        ...(data.overrides.params || {})
      },
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // В DEMO режиме НЕ сохраняем данные - только имитируем успешный ответ
    // В production здесь будет HTTP POST запрос к серверу
    // mockComponents.push(newComponent); // УБРАНО - данные не сохраняются
    
    return {
      ...newComponent,
      template: componentTemplatesStore.getById(newComponent.template_id)
    };
  },

  async update(id: string, data: UpdateComponentRequest): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }
    
    const updatedComponent = {
      ...mockComponents[componentIndex],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // В DEMO режиме НЕ изменяем данные - только имитируем успешный ответ
    // mockComponents[componentIndex] = updatedComponent; // УБРАНО
    
    return {
      ...updatedComponent,
      template: componentTemplatesStore.getById(updatedComponent.template_id)
    };
  },

  async updateStatus(id: string, action: ComponentStatusAction): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }
    
    // В DEMO режиме НЕ изменяем статус - только имитируем успешный ответ
    let newStatus;
    switch (action) {
      case 'enable':
        newStatus = 'online';
        break;
      case 'disable':
        newStatus = 'disabled';
        break;
      case 'archive':
        newStatus = 'archived';
        break;
      default:
        throw new ApiError(400, 'Invalid status action');
    }
    
    const updatedComponent = {
      ...mockComponents[componentIndex],
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // НЕ сохраняем изменения - только возвращаем для уведомления
    // mockComponents[componentIndex] = updatedComponent; // УБРАНО
    
    return {
      ...updatedComponent,
      template: componentTemplatesStore.getById(updatedComponent.template_id)
    };
  }
};

// Экспорт API для компонентов
export const currentComponentsAPI = mockComponentsAPI;

// 🔄 ДЛЯ PRODUCTION: Заменить на импорт из apiSwitch.ts:
// import { currentComponentsAPI } from './apiSwitch';