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
import { PersistentStorage } from '@/utils/persistentStorage';

// Базовый URL для API
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

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

// Mock данные компонентов для демо - обновленная структура
const initialComponents: Component[] = [
  // Компоненты АЗС №001 - Центральная
  {
    id: "comp_001",
    trading_point_id: "point1",
    equipment_id: "eq_1",
    name: "Датчик уровня топлива",
    display_name: "Датчик уровня топлива ПМП-201",
    system_type: "sensor",
    category: "level",
    serial_number: "DUT2024001",
    params: {
      accuracy: 2.0,
      range_min: 0,
      range_max: 50000,
      calibration_factor: 1.0,
      current_level: 32500
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_sensor_level_1"
  },
  {
    id: "comp_002",
    trading_point_id: "point1",
    equipment_id: "eq_1",
    name: "Датчик температуры",
    display_name: "Датчик температуры резервуара",
    system_type: "sensor",
    category: "temperature",
    serial_number: "TEMP2024001",
    params: {
      accuracy: 0.5,
      range_min: -40,
      range_max: 80,
      alarm_threshold: 45,
      current_temp: 18.5
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_sensor_temp_1"
  },
  {
    id: "comp_003",
    trading_point_id: "point1",
    equipment_id: "eq_1",
    name: "Датчик воды",
    display_name: "Датчик товарной воды",
    system_type: "sensor",
    category: "water",
    serial_number: "WATER2024001",
    params: {
      threshold_mm: 15,
      current_level_mm: 0,
      alarm_enabled: true
    },
    status: 'online',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_sensor_water_1"
  },

  // Компоненты с разными статусами для демонстрации агрегации
  {
    id: "comp_004",
    trading_point_id: "point1",
    equipment_id: "eq_1", // К резервуару №1 добавим компонент с ошибкой
    name: "Контроллер управления",
    display_name: "Контроллер управления резервуаром",
    system_type: "controller",
    category: "control",
    serial_number: "CTRL2024001",
    params: {
      version: "2.1.4",
      connection_type: "ethernet",
      ip_address: "192.168.1.15"
    },
    status: 'error', // Ошибка
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_controller_1"
  },

  {
    id: "comp_005",
    trading_point_id: "point1",
    equipment_id: "eq_2", // К резервуару №2 добавим отключенный компонент
    name: "Датчик давления",
    display_name: "Датчик давления в резервуаре",
    system_type: "sensor",
    category: "pressure",
    serial_number: "PRESS2024001",
    params: {
      accuracy: 1.0,
      range_min: 0,
      range_max: 10,
      current_pressure: 2.1
    },
    status: 'offline', // Офлайн (желтый)
    created_at: new Date('2024-02-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_sensor_pressure_1"
  },

  {
    id: "comp_006",
    trading_point_id: "point1",
    equipment_id: "eq_3", // К резервуару №3 добавим нормальные компоненты
    name: "Система вентиляции",
    display_name: "Система вентиляции резервуара",
    system_type: "ventilation",
    category: "safety",
    serial_number: "VENT2024001",
    params: {
      fan_speed: 75,
      automatic: true,
      temp_threshold: 40
    },
    status: 'online', // Нормальный
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-08-30').toISOString(),
    created_from_template: "comp_ventilation_1"
  }
];

// Загружаем данные из localStorage при инициализации
let mockComponents: Component[] = PersistentStorage.load<Component>('components_v2', initialComponents);

// Проверяем и обновляем данные при необходимости
const checkAndUpdateData = () => {
  if (!mockComponents.length || mockComponents.length < initialComponents.length) {
    console.log('🔄 Обновляем данные компонентов до актуальной версии...');
    mockComponents = [...initialComponents];
    saveComponents();
  }
};

// Функция для сохранения изменений
const saveComponents = () => {
  PersistentStorage.save('components_v2', mockComponents);
};

// Выполняем проверку при загрузке
checkAndUpdateData();

// Mock API для компонентов с персистентным хранением
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
    
    if (params.system_type) {
      filteredComponents = filteredComponents.filter(comp => comp.system_type === params.system_type);
    }
    
    if (params.category) {
      filteredComponents = filteredComponents.filter(comp => comp.category === params.category);
    }
    
    if (params.name) {
      filteredComponents = filteredComponents.filter(comp => comp.name === params.name);
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
    
    return {
      data: pageComponents,
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
    
    return component;
  },

  async create(data: CreateComponentRequest): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Получаем шаблон для копирования данных
    const template = componentTemplatesStore.getById(data.template_id);
    if (!template) {
      throw new ApiError(404, 'Component template not found');
    }
    
    // Создаем независимый экземпляр компонента
    const newComponent: Component = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trading_point_id: data.trading_point_id,
      equipment_id: data.equipment_id,
      
      // Копируем базовые данные из шаблона
      name: template.name,
      display_name: data.display_name,
      system_type: template.system_type,
      category: template.category,
      
      // Уникальные данные экземпляра
      serial_number: data.serial_number,
      status: 'online',
      
      // Объединяем параметры по умолчанию с кастомными
      params: {
        ...template.defaults,
        ...(data.custom_params || {})
      },
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_from_template: template.id // Только для истории
    };
    
    // Сохраняем новый компонент в localStorage
    mockComponents.push(newComponent);
    saveComponents();
    
    return newComponent;
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
    
    // Обновляем данные и сохраняем в localStorage
    mockComponents[componentIndex] = updatedComponent;
    saveComponents();
    
    return updatedComponent;
  },

  async updateStatus(id: string, action: ComponentStatusAction): Promise<Component> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const componentIndex = mockComponents.findIndex(comp => comp.id === id);
    if (componentIndex === -1) {
      throw new ApiError(404, 'Component not found');
    }
    
    // Изменяем статус и сохраняем в localStorage
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
    
    // Сохраняем изменения в localStorage
    mockComponents[componentIndex] = updatedComponent;
    saveComponents();
    
    return updatedComponent;
  }
};

// Экспорт API для компонентов
export const currentComponentsAPI = mockComponentsAPI;