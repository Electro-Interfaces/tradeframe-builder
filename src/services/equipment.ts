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
import { currentComponentsAPI } from './components';

// Импорт сервиса для синхронизации с типами оборудования
import { equipmentTemplatesFromTypesAPI } from './equipmentTypes';

// Базовый URL для API (должен браться из конфигурации)
// В Vite используется import.meta.env вместо process.env
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
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
  constructor(
    public status: number,
    public body: string
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

const apiClient = new ApiClient();

// Equipment API сервис
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

    return apiClient.get<ListEquipmentResponse>(`/equipment?${searchParams}`);
  },

  // POST /equipment
  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    return apiClient.post<Equipment>('/equipment', data);
  },

  // GET /equipment/{id}
  async get(id: string): Promise<Equipment> {
    return apiClient.get<Equipment>(`/equipment/${id}`);
  },

  // PATCH /equipment/{id}
  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    return apiClient.patch<Equipment>(`/equipment/${id}`, data);
  },

  // POST /equipment/{id}:enable|disable|archive
  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    return apiClient.post<void>(`/equipment/${id}:${action}`, {});
  },

  // GET /equipment/{id}/events - журнал событий
  async getEvents(id: string): Promise<EquipmentEvent[]> {
    return apiClient.get<EquipmentEvent[]>(`/equipment/${id}/events`);
  }
};

// Equipment Templates API
export const equipmentTemplatesAPI = {
  // GET /equipment-templates
  async list(): Promise<EquipmentTemplate[]> {
    return apiClient.get<EquipmentTemplate[]>('/equipment-templates');
  },

  // GET /equipment-templates/{id}
  async get(id: string): Promise<EquipmentTemplate> {
    return apiClient.get<EquipmentTemplate>(`/equipment-templates/${id}`);
  }
};

// Mock данные для разработки (временно, пока нет реального API)
const mockEquipmentTemplates: EquipmentTemplate[] = [
  {
    id: "1", // Соответствует ID из EquipmentTypes
    name: "Резервуар",
    technical_code: "EQP_RESERVOIR",
    system_type: "fuel_tank",
    status: true,
    description: "Топливный резервуар для хранения нефтепродуктов",
    default_params: { 
      // Обязательные поля
      id: null,
      name: "",
      fuelType: "",
      currentLevelLiters: 0,
      
      // Не обязательные поля - параметры емкости
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      
      // Не обязательные поля - физические параметры
      temperature: null,
      waterLevelMm: null,
      
      // Не обязательные поля - пороговые значения
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15
      }
    },
    allow_component_template_ids: ["comp_sensor_level_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2", // Соответствует ID из EquipmentTypes
    name: "Терминал самообслуживания",
    technical_code: "EQP_TSO",
    system_type: "self_service_terminal",
    status: true,
    description: "Автоматизированный терминал самообслуживания на АЗС",
    default_params: { touch_screen: true, payment_methods: ["card", "cash"] },
    allow_component_template_ids: ["comp_printer_1", "comp_pinpad_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3", // Соответствует ID из EquipmentTypes
    name: "Система управления",
    technical_code: "EQP_CONTROL_SYSTEM",
    system_type: "control_system",
    status: true,
    description: "Центральная система управления АЗС",
    default_params: { server_type: "industrial", redundancy: true },
    allow_component_template_ids: ["comp_server_1", "comp_ups_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "4", // Соответствует ID из EquipmentTypes
    name: "Табло цен",
    technical_code: "EQP_PRICE_BOARD",
    system_type: "price_display",
    status: true,
    description: "Электронное табло для отображения цен на топливо",
    default_params: { display_type: "LED", brightness: 5000 },
    allow_component_template_ids: ["comp_led_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "5", // Соответствует ID из EquipmentTypes
    name: "Видеонаблюдение",
    technical_code: "EQP_CCTV",
    system_type: "surveillance",
    status: true,
    description: "Система видеонаблюдения для безопасности АЗС",
    default_params: { resolution: "4K", night_vision: true, storage_days: 30 },
    allow_component_template_ids: ["comp_camera_1", "comp_dvr_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "6", // Соответствует ID из EquipmentTypes
    name: "Звуковое сопровождение",
    technical_code: "EQP_AUDIO",
    system_type: "audio_system",
    status: true,
    description: "Система звукового сопровождения и оповещения",
    default_params: { speakers: 6, volume_max: 80, zones: 3 },
    allow_component_template_ids: ["comp_speaker_1", "comp_amplifier_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock данные оборудования для демо (в production заменить на API)
const mockEquipment: Equipment[] = [
  {
    id: "eq_1",
    trading_point_id: "1",
    template_id: "1", // Резервуар
    display_name: "Резервуар №1 (АИ-95)",
    serial_number: "RES001",
    external_id: "TANK_001",
    status: "online",
    installation_date: "2024-01-15T00:00:00Z",
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-08-30T10:30:00Z",
    components: []
  },
  {
    id: "eq_2", 
    trading_point_id: "1",
    template_id: "1", // Резервуар
    display_name: "Резервуар №2 (АИ-92)",
    serial_number: "RES002",
    external_id: "TANK_002", 
    status: "offline",
    installation_date: "2024-02-20T00:00:00Z",
    created_at: "2024-02-20T12:00:00Z",
    updated_at: "2024-08-30T09:15:00Z",
    components: []
  },
  {
    id: "eq_3",
    trading_point_id: "1", 
    template_id: "2", // Терминал самообслуживания
    display_name: "Терминал у касс",
    serial_number: "TSO001",
    external_id: "TSO_001",
    status: "online",
    installation_date: "2024-01-10T00:00:00Z",
    created_at: "2024-01-10T12:00:00Z",
    updated_at: "2024-08-30T08:45:00Z",
    components: []
  },
  {
    id: "eq_4",
    trading_point_id: "1", 
    template_id: "3", // Система управления
    display_name: "Центральный сервер",
    serial_number: "SRV001",
    external_id: "CTRL_001",
    status: "online",
    installation_date: "2024-01-05T00:00:00Z",
    created_at: "2024-01-05T12:00:00Z",
    updated_at: "2024-08-30T08:00:00Z",
    components: []
  },
  {
    id: "eq_5",
    trading_point_id: "1", 
    template_id: "4", // Табло цен
    display_name: "Табло у трассы",
    serial_number: "LED001",
    external_id: "BOARD_001",
    status: "error",
    installation_date: "2024-03-01T00:00:00Z",
    created_at: "2024-03-01T12:00:00Z",
    updated_at: "2024-08-30T07:30:00Z",
    components: []
  },
  {
    id: "eq_6",
    trading_point_id: "1", 
    template_id: "5", // Видеонаблюдение
    display_name: "Камеры периметра",
    serial_number: "CAM001",
    external_id: "CCTV_001",
    status: "online",
    installation_date: "2024-02-15T00:00:00Z",
    created_at: "2024-02-15T12:00:00Z",
    updated_at: "2024-08-30T07:00:00Z",
    components: []
  }
];

// Mock API для оборудования (в production заменить на HTTP клиент к реальному API)
// ВНИМАНИЕ: Данные не сохраняются между сессиями - это только для демо интерфейса
export const mockEquipmentAPI = {
  async list(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
    // Симуляция задержки сети
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filtered = mockEquipment.filter(eq => 
      eq.trading_point_id === params.trading_point_id
    );

    // Применяем фильтры
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(eq => 
        eq.display_name.toLowerCase().includes(search) ||
        (eq.serial_number && eq.serial_number.toLowerCase().includes(search))
      );
    }

    if (params.template_id) {
      filtered = filtered.filter(eq => eq.template_id === params.template_id);
    }

    if (params.status) {
      filtered = filtered.filter(eq => eq.status === params.status);
    }

    // Добавляем шаблоны и подгружаем количество компонентов
    const result = await Promise.all(filtered.map(async (eq) => {
      let componentsCount = 0;
      try {
        const componentsResponse = await currentComponentsAPI.list({ 
          equipment_id: eq.id,
          limit: 1 // Нам нужен только count, не сами данные
        });
        componentsCount = componentsResponse.total;
      } catch (error) {
        // Игнорируем ошибки при загрузке компонентов
        console.warn(`Failed to load components count for equipment ${eq.id}:`, error);
      }

      return {
        ...eq,
        template: mockEquipmentTemplates.find(t => t.id === eq.template_id),
        componentsCount // Добавляем количество компонентов
      };
    }));

    return {
      data: result,
      total: result.length,
      page: params.page || 1,
      limit: params.limit || 50,
      has_more: false
    };
  },

  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newEquipment: Equipment = {
      id: `eq_${Date.now()}`,
      trading_point_id: data.trading_point_id,
      template_id: data.template_id,
      display_name: data.overrides.display_name,
      serial_number: data.overrides.serial_number,
      external_id: data.overrides.external_id,
      status: "offline",
      installation_date: data.overrides.installation_date,
      bindings: data.overrides.bindings,
      params: data.overrides.params,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      components: []
    };

    // В DEMO режиме НЕ сохраняем данные - только имитируем успешный ответ
    // В production здесь будет HTTP POST запрос к серверу
    // mockEquipment.push(newEquipment); // УБРАНО - данные не сохраняются
    return newEquipment;
  },

  async get(id: string): Promise<Equipment> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const equipment = mockEquipment.find(eq => eq.id === id);
    if (!equipment) {
      throw new ApiError(404, 'Equipment not found');
    }

    return {
      ...equipment,
      template: mockEquipmentTemplates.find(t => t.id === equipment.template_id)
    };
  },

  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = mockEquipment.findIndex(eq => eq.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Equipment not found');
    }

    // В DEMO режиме НЕ изменяем данные - только имитируем успешный ответ
    // В production здесь будет HTTP PATCH запрос к серверу
    const updatedEquipment = {
      ...mockEquipment[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    // НЕ сохраняем изменения
    // mockEquipment[index] = updatedEquipment; // УБРАНО
    return updatedEquipment;
  },

  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipment.find(eq => eq.id === id);
    if (!equipment) {
      throw new ApiError(404, 'Equipment not found');
    }

    // В DEMO режиме НЕ изменяем статус - только имитируем успешный ответ
    // В production здесь будет HTTP POST запрос к серверу
    // switch (action) {
    //   case 'enable':
    //     equipment.status = 'online';
    //     break;
    //   case 'disable':
    //     equipment.status = 'disabled';
    //     break;
    //   case 'archive':
    //     equipment.status = 'archived';
    //     equipment.deleted_at = new Date().toISOString();
    //     break;
    // }
    // equipment.updated_at = new Date().toISOString();
    
    // Просто имитируем задержку и успех, без изменения данных
  },

  async getEvents(id: string): Promise<EquipmentEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock события
    return [
      {
        id: `evt_1`,
        equipment_id: id,
        event_type: 'created',
        user_id: 'user_1',
        user_name: 'Иван Иванов',
        timestamp: '2024-08-30T12:00:00Z',
        details: { initial_status: 'offline' }
      },
      {
        id: `evt_2`,
        equipment_id: id,
        event_type: 'status_changed',
        user_id: 'user_2',
        user_name: 'Мария Петрова',
        timestamp: '2024-08-30T13:30:00Z',
        details: { from: 'offline', to: 'online' }
      }
    ];
  }
};

export const mockEquipmentTemplatesAPI = {
  async list(): Promise<EquipmentTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEquipmentTemplates.filter(t => t.status);
  },

  async get(id: string): Promise<EquipmentTemplate> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const template = mockEquipmentTemplates.find(t => t.id === id);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    return template;
  }
};

// Новая реализация API, которая использует данные из EquipmentTypes
export const dynamicEquipmentTemplatesAPI = {
  async list(): Promise<EquipmentTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Используем данные из раздела "Типы оборудования"
    return equipmentTemplatesFromTypesAPI.list();
  },

  async get(id: string): Promise<EquipmentTemplate> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const template = await equipmentTemplatesFromTypesAPI.get(id);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    
    return template;
  }
};

// Экспортируем текущую реализацию 
// Используем динамическую версию для синхронизации с разделом "Типы оборудования"
export const currentEquipmentAPI = mockEquipmentAPI;
export const currentEquipmentTemplatesAPI = dynamicEquipmentTemplatesAPI;

// 🔄 ДЛЯ PRODUCTION: Заменить на импорт из apiSwitch.ts:
// import { currentEquipmentAPI, currentEquipmentTemplatesAPI } from './apiSwitch';