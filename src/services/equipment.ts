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

// Базовый URL для API (должен браться из конфигурации)
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

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
    id: "tpl_1",
    name: "ТРК Tokheim Quantium 310",
    technical_code: "TQK_Q310",
    system_type: "fuel_dispenser",
    status: true,
    description: "Топливораздаточная колонка для автозаправочных станций",
    default_params: { max_flow_rate: 60, nozzle_count: 4 },
    allow_component_template_ids: ["comp_sensor_1", "comp_display_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "tpl_2",
    name: "Резервуар топливный 50м³",
    technical_code: "TANK_50K",
    system_type: "fuel_tank",
    status: true,
    description: "Подземный резервуар для хранения топлива",
    default_params: { volume: 50000, material: "steel" },
    allow_component_template_ids: ["comp_sensor_level_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "tpl_3",
    name: "POS-терминал Ingenico iCT250",
    technical_code: "POS_ICT250",
    system_type: "pos_system",
    status: true,
    description: "Платёжный терминал для обработки карточных операций",
    default_params: { connection_type: "ethernet", encryption: "3DES" },
    allow_component_template_ids: ["comp_printer_1", "comp_pinpad_1"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockEquipment: Equipment[] = [
  {
    id: "eq_1",
    trading_point_id: "1",
    template_id: "tpl_1",
    display_name: "ТРК-1 у въезда",
    serial_number: "TQK123456",
    external_id: "TRK_001",
    status: "online",
    installation_date: "2024-01-15T00:00:00Z",
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-08-30T10:30:00Z",
    components: []
  },
  {
    id: "eq_2", 
    trading_point_id: "1",
    template_id: "tpl_1",
    display_name: "ТРК-2 у выезда",
    serial_number: "TQK789012",
    external_id: "TRK_002", 
    status: "offline",
    installation_date: "2024-02-20T00:00:00Z",
    created_at: "2024-02-20T12:00:00Z",
    updated_at: "2024-08-30T09:15:00Z",
    components: []
  },
  {
    id: "eq_3",
    trading_point_id: "1", 
    template_id: "tpl_2",
    display_name: "Резервуар №1",
    external_id: "TANK_001",
    status: "online",
    installation_date: "2024-01-10T00:00:00Z",
    created_at: "2024-01-10T12:00:00Z",
    updated_at: "2024-08-30T08:45:00Z",
    components: []
  }
];

// Mock сервисы для разработки
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

    // Добавляем шаблоны
    const result = filtered.map(eq => ({
      ...eq,
      template: mockEquipmentTemplates.find(t => t.id === eq.template_id)
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

    mockEquipment.push(newEquipment);
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

    mockEquipment[index] = {
      ...mockEquipment[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    return mockEquipment[index];
  },

  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipment.find(eq => eq.id === id);
    if (!equipment) {
      throw new ApiError(404, 'Equipment not found');
    }

    switch (action) {
      case 'enable':
        equipment.status = 'online';
        break;
      case 'disable':
        equipment.status = 'disabled';
        break;
      case 'archive':
        equipment.status = 'archived';
        equipment.deleted_at = new Date().toISOString();
        break;
    }

    equipment.updated_at = new Date().toISOString();
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

// Экспортируем текущую реализацию (mock для разработки)
export const currentEquipmentAPI = mockEquipmentAPI;
export const currentEquipmentTemplatesAPI = mockEquipmentTemplatesAPI;