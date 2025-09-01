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
import { PersistentStorage } from '@/utils/persistentStorage';

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

// Загружаем сохраненные данные из localStorage или используем начальные
const initialEquipment: Equipment[] = [
  // Оборудование для АЗС №001 - Центральная (point1)
  {
    id: "eq_1",
    trading_point_id: "point1",
    
    // Данные скопированные из шаблона при создании
    name: "Резервуар",
    system_type: "fuel_tank",
    
    // Пользовательские данные экземпляра
    display_name: "Резервуар №1 (АИ-95)",
    serial_number: "RES001",
    external_id: "TANK_001",
    status: "online",
    installation_date: "2024-01-15T00:00:00Z",
    
    // Параметры экземпляра (скопированы из шаблона и настроены)
    params: {
      fuelType: "АИ-95",
      currentLevelLiters: 42000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      temperature: 15.2,
      waterLevelMm: 2
    },
    
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-08-30T10:30:00Z",
    created_from_template: "1",
    components: []
  },
  {
    id: "eq_2", 
    trading_point_id: "point1",
    template_id: "1", // Резервуар
    display_name: "Резервуар №2 (АИ-92)",
    serial_number: "RES002",
    external_id: "TANK_002", 
    status: "online",
    installation_date: "2024-02-20T00:00:00Z",
    created_at: "2024-02-20T12:00:00Z",
    updated_at: "2024-08-30T09:15:00Z",
    components: []
  },
  {
    id: "eq_3",
    trading_point_id: "point1",
    template_id: "1", // Резервуар
    display_name: "Резервуар №3 (ДТ)",
    serial_number: "RES003",
    external_id: "TANK_003",
    status: "online",
    installation_date: "2024-01-20T00:00:00Z",
    created_at: "2024-01-20T12:00:00Z",
    updated_at: "2024-08-30T09:00:00Z",
    components: []
  },
  {
    id: "eq_4",
    trading_point_id: "point1", 
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №1 - Терминал самообслуживания",
    serial_number: "TSO001",
    external_id: "TSO_001",
    status: "online",
    installation_date: "2024-01-10T00:00:00Z",
    created_at: "2024-01-10T12:00:00Z",
    updated_at: "2024-08-30T08:45:00Z",
    components: []
  },
  {
    id: "eq_5",
    trading_point_id: "point1", 
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №2 - Терминал самообслуживания",
    serial_number: "TSO002",
    external_id: "TSO_002",
    status: "online",
    installation_date: "2024-01-12T00:00:00Z",
    created_at: "2024-01-12T12:00:00Z",
    updated_at: "2024-08-30T08:30:00Z",
    components: []
  },
  {
    id: "eq_6",
    trading_point_id: "point1", 
    template_id: "3", // Система управления
    display_name: "Система управления АЗС",
    serial_number: "SRV001",
    external_id: "CTRL_001",
    status: "online",
    installation_date: "2024-01-05T00:00:00Z",
    created_at: "2024-01-05T12:00:00Z",
    updated_at: "2024-08-30T08:00:00Z",
    components: []
  },
  {
    id: "eq_7",
    trading_point_id: "point1", 
    template_id: "4", // Табло цен
    display_name: "Табло цен - главное",
    serial_number: "LED001",
    external_id: "BOARD_001",
    status: "online",
    installation_date: "2024-03-01T00:00:00Z",
    created_at: "2024-03-01T12:00:00Z",
    updated_at: "2024-08-30T07:30:00Z",
    components: []
  },
  {
    id: "eq_8",
    trading_point_id: "point1", 
    template_id: "5", // Видеонаблюдение
    display_name: "Система видеонаблюдения",
    serial_number: "CAM001",
    external_id: "CCTV_001",
    status: "online",
    installation_date: "2024-02-15T00:00:00Z",
    created_at: "2024-02-15T12:00:00Z",
    updated_at: "2024-08-30T07:00:00Z",
    components: []
  },
  
  // Оборудование для АЗС №002 - Северная (point2)
  {
    id: "eq_9",
    trading_point_id: "point2",
    template_id: "1", // Резервуар
    display_name: "Резервуар №1 (ДТ)",
    serial_number: "RES101",
    external_id: "TANK_101",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T10:00:00Z",
    components: []
  },
  {
    id: "eq_10",
    trading_point_id: "point2",
    template_id: "1", // Резервуар
    display_name: "Резервуар №2 (АИ-95)",
    serial_number: "RES102",
    external_id: "TANK_102",
    status: "online",
    installation_date: "2024-02-05T00:00:00Z",
    created_at: "2024-02-05T12:00:00Z",
    updated_at: "2024-08-30T09:45:00Z",
    components: []
  },
  {
    id: "eq_11",
    trading_point_id: "point2",
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №1 - Коммерческая",
    serial_number: "TSO101",
    external_id: "TSO_101",
    status: "online",
    installation_date: "2024-02-10T00:00:00Z",
    created_at: "2024-02-10T12:00:00Z",
    updated_at: "2024-08-30T08:20:00Z",
    components: []
  },
  {
    id: "eq_12",
    trading_point_id: "point2",
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №2 - Коммерческая",
    serial_number: "TSO102",
    external_id: "TSO_102",
    status: "maintenance",
    installation_date: "2024-02-12T00:00:00Z",
    created_at: "2024-02-12T12:00:00Z",
    updated_at: "2024-08-25T14:00:00Z",
    components: []
  },
  {
    id: "eq_13",
    trading_point_id: "point2",
    template_id: "3", // Система управления
    display_name: "Система управления АЗС",
    serial_number: "SRV101",
    external_id: "CTRL_101",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    components: []
  },
  
  // Оборудование для остальных точек
  {
    id: "eq_14",
    trading_point_id: "point3",
    template_id: "1", // Резервуар
    display_name: "Резервуар №1 (АИ-92)",
    serial_number: "RES201",
    external_id: "TANK_201",
    status: "online",
    installation_date: "2024-03-01T00:00:00Z",
    created_at: "2024-03-01T12:00:00Z",
    updated_at: "2024-08-30T09:30:00Z",
    components: []
  },
  {
    id: "eq_15",
    trading_point_id: "point3",
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №1 - Стандартная",
    serial_number: "TSO201",
    external_id: "TSO_201", 
    status: "online",
    installation_date: "2024-03-05T00:00:00Z",
    created_at: "2024-03-05T12:00:00Z",
    updated_at: "2024-08-30T08:15:00Z",
    components: []
  },
  {
    id: "eq_16",
    trading_point_id: "point4",
    template_id: "1", // Резервуар
    display_name: "Резервуар №1 (ДТ)",
    serial_number: "RES301",
    external_id: "TANK_301",
    status: "error",
    installation_date: "2024-03-10T00:00:00Z",
    created_at: "2024-03-10T12:00:00Z",
    updated_at: "2024-08-28T16:00:00Z",
    components: []
  },
  {
    id: "eq_17",
    trading_point_id: "point5",
    template_id: "2", // Терминал самообслуживания
    display_name: "ТРК №1 - Мультитопливная",
    serial_number: "TSO401",
    external_id: "TSO_401",
    status: "offline",
    installation_date: "2024-03-15T00:00:00Z",
    created_at: "2024-03-15T12:00:00Z",
    updated_at: "2024-08-29T11:30:00Z",
    components: []
  },
  {
    id: "eq_18",
    trading_point_id: "point5",
    template_id: "4", // Табло цен
    display_name: "Табло цен",
    serial_number: "LED401",
    external_id: "BOARD_401",
    status: "online",
    installation_date: "2024-03-20T00:00:00Z",
    created_at: "2024-03-20T12:00:00Z",
    updated_at: "2024-08-30T07:15:00Z",
    components: []
  }
];

// Загружаем данные из localStorage при инициализации
let mockEquipment: Equipment[] = PersistentStorage.load<Equipment>('equipment', initialEquipment);

// Функция для сохранения изменений
const saveEquipment = () => {
  PersistentStorage.save('equipment', mockEquipment);
};

// Проверяем, нужно ли обновить данные (если в localStorage старая версия или пустые данные)
const checkAndUpdateData = () => {
  if (!mockEquipment.length || mockEquipment.length < initialEquipment.length) {
    console.log('🔄 Обновляем данные оборудования до актуальной версии...');
    mockEquipment = [...initialEquipment];
    saveEquipment();
  }
};

// Выполняем проверку при инициализации
checkAndUpdateData();

// Функция для сброса данных к исходному состоянию (для разработки)
const resetEquipmentData = () => {
  mockEquipment = [...initialEquipment];
  saveEquipment();
  console.log('🔄 Equipment data reset to initial state');
};

// Функция агрегации статусов компонентов для оборудования
export type ComponentHealthStatus = 'healthy' | 'warning' | 'error';

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

// Mock API для оборудования с персистентным хранением
// Все изменения сохраняются в localStorage и доступны после перезагрузки
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
        eq.name.toLowerCase().includes(search) ||
        (eq.serial_number && eq.serial_number.toLowerCase().includes(search))
      );
    }

    if (params.system_type) {
      filtered = filtered.filter(eq => eq.system_type === params.system_type);
    }
    
    if (params.name) {
      filtered = filtered.filter(eq => eq.name === params.name);
    }

    if (params.status) {
      filtered = filtered.filter(eq => eq.status === params.status);
    }

    // Подгружаем количество компонентов для каждого оборудования
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
    
    // Получаем шаблон для копирования данных
    const template = mockEquipmentTemplates.find(t => t.id === data.template_id);
    if (!template) {
      throw new ApiError(404, 'Equipment template not found');
    }
    
    // Создаем независимый экземпляр оборудования
    const newEquipment: Equipment = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trading_point_id: data.trading_point_id,
      
      // Копируем основную информацию из шаблона
      name: template.name,
      system_type: template.system_type,
      
      // Пользовательские данные экземпляра
      display_name: data.display_name,
      serial_number: data.serial_number,
      external_id: data.external_id,
      status: "offline",
      installation_date: data.installation_date,
      bindings: data.bindings,
      
      // Объединяем параметры по умолчанию с пользовательскими
      params: {
        ...template.default_params,
        ...(data.custom_params || {})
      },
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_from_template: template.id, // Для истории
      components: []
    };

    // Сохраняем новое оборудование в localStorage
    mockEquipment.push(newEquipment);
    saveEquipment();
    return newEquipment;
  },

  async get(id: string): Promise<Equipment> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const equipment = mockEquipment.find(eq => eq.id === id);
    if (!equipment) {
      throw new ApiError(404, 'Equipment not found');
    }

    // Возвращаем независимый экземпляр (без ссылки на шаблон)
    return equipment;
  },

  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = mockEquipment.findIndex(eq => eq.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Equipment not found');
    }

    // Обновляем данные и сохраняем в localStorage
    const updatedEquipment = {
      ...mockEquipment[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    mockEquipment[index] = updatedEquipment;
    saveEquipment();
    return updatedEquipment;
  },

  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipment.find(eq => eq.id === id);
    if (!equipment) {
      throw new ApiError(404, 'Equipment not found');
    }

    // Изменяем статус и сохраняем в localStorage
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
    saveEquipment();
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
  },

  // Функция для сброса данных (только для разработки)
  async resetData(): Promise<void> {
    resetEquipmentData();
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