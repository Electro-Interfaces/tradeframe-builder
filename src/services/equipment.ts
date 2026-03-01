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

// Импорт обновленного HTTP клиента с автоматическим обновлением токена
import { httpClient } from '@/services/httpClients';
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';


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

// Equipment Templates API
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
      // Обязательные поля резервуара (синхронизировано с Tank interface)
      id: 1,
      name: "",
      fuelType: "",
      currentLevelLiters: 0,
      
      // Параметры емкости
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      
      // Физические параметры (синхронизировано с tanksService)
      temperature: 15.0,
      waterLevelMm: 0.0,
      density: 0.725,
      
      // Статус и операционные данные
      status: 'active',
      location: "Зона не указана",
      installationDate: new Date().toISOString().split('T')[0],
      lastCalibration: null,
      supplier: null,
      
      // Поля из UI (полная синхронизация)
      sensors: [
        { name: "Уровень", status: "ok" },
        { name: "Температура", status: "ok" }
      ],
      linkedPumps: [],
      notifications: {
        enabled: true,
        drainAlerts: true,
        levelAlerts: true
      },
      
      // Пороговые значения (полная синхронизация с tanksService)
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15,
        notifications: {
          critical: true,
          minimum: true,
          temperature: true,
          water: true
        }
      },
      
      // Системные поля
      trading_point_id: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
  // РЕЗЕРВУАРЫ ДЕМО СЕТИ "Демо сеть АЗС"
  {
    id: "demo_tank_1",
    trading_point_id: "point1",
    name: "Резервуар",
    system_type: "fuel_tank",
    display_name: "Резервуар №1 (АИ-95) - Демо",
    serial_number: "DEMO-TANK-001",
    external_id: "DEMO_TANK_001",
    status: "online",
    installation_date: "2024-01-15T00:00:00Z",
    params: {
      id: 1,
      name: "Резервуар №1 (АИ-95) - Демо",
      fuelType: "АИ-95",
      currentLevelLiters: 42000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 15.2,
      waterLevelMm: 2,
      material: "steel",
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15
      }
    },
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-12-08T10:30:00Z",
    created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "demo_tank_2",
    trading_point_id: "point1", 
    name: "Резервуар",
    system_type: "fuel_tank",
    display_name: "Резервуар №2 (АИ-92) - Демо",
    serial_number: "DEMO-TANK-002",
    external_id: "DEMO_TANK_002",
    status: "online",
    installation_date: "2024-02-20T00:00:00Z",
    params: {
      id: 2,
      name: "Резервуар №2 (АИ-92) - Демо", 
      fuelType: "АИ-92",
      currentLevelLiters: 35000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 14.8,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15
      }
    },
    created_at: "2024-02-20T12:00:00Z",
    updated_at: "2024-12-08T09:15:00Z",
    created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "demo_tank_3",
    trading_point_id: "point1",
    name: "Резервуар", 
    system_type: "fuel_tank",
    display_name: "Резервуар №3 (ДТ) - Демо",
    serial_number: "DEMO-TANK-003",
    external_id: "DEMO_TANK_003",
    status: "online",
    installation_date: "2024-03-10T00:00:00Z",
    params: {
      id: 3,
      name: "Резервуар №3 (ДТ) - Демо",
      fuelType: "ДТ", 
      currentLevelLiters: 28000,
      capacityLiters: 45000,
      minLevelPercent: 15,
      criticalLevelPercent: 8,
      volume: 45000,
      temperature: 12.8,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40  
        },
        maxWaterLevel: 15
      }
    },
    created_at: "2024-03-10T12:00:00Z",
    updated_at: "2024-12-08T11:45:00Z",
    created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "demo_tank_4",
    trading_point_id: "point1",
    name: "Резервуар",
    system_type: "fuel_tank", 
    display_name: "Резервуар №4 (АИ-98) - Демо",
    serial_number: "DEMO-TANK-004",
    external_id: "DEMO_TANK_004",
    status: "online",
    installation_date: "2024-04-05T00:00:00Z",
    params: {
      id: 4,
      name: "Резервуар №4 (АИ-98) - Демо",
      fuelType: "АИ-98",
      currentLevelLiters: 8500,
      capacityLiters: 25000,
      minLevelPercent: 18,
      criticalLevelPercent: 9,
      volume: 25000,
      temperature: 16.1,
      waterLevelMm: 0.5,
      material: "steel",
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15
      }
    },
    created_at: "2024-04-05T12:00:00Z",
    updated_at: "2024-12-08T08:30:00Z", 
    created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  
  // СИСТЕМА УПРАВЛЕНИЯ ДЕМО СЕТИ
  {
    id: "eq_6",
    trading_point_id: "point1", 
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV001",
    external_id: "CTRL_001",
    status: "online",
    installation_date: "2024-01-05T00:00:00Z",
    created_at: "2024-01-05T12:00:00Z",
    updated_at: "2024-08-30T08:00:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
    components: []
  },

  // Оборудование для других АЗС (только резервуары и системы управления)
  {
    id: "eq_9",
    trading_point_id: "point2",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №1 (АИ-92)",
    serial_number: "RES101",
    external_id: "TANK_101",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T10:00:00Z",
    params: {
      id: 4,
      name: "Резервуар №1 (АИ-92)",
      fuelType: "АИ-92",
      currentLevelLiters: 32000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 18.5,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: {
          min: -12,
          max: 38
        },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_13",
    trading_point_id: "point2",
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV101",
    external_id: "CTRL_101",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
    components: []
  },

  // АЗС №003 - Южная (4 резервуара: АИ-95, АИ-92, ДТ, АИ-98)
  {
    id: "eq_tank_p3_1",
    trading_point_id: "point3",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №1 (АИ-95)",
    serial_number: "TANK-003-95",
    external_id: "TANK_P3_95",
    status: "online",
    installation_date: "2024-03-15T00:00:00Z",
    created_at: "2024-03-15T12:00:00Z",
    updated_at: "2024-12-08T10:30:00Z",
    params: {
      id: 5,
      name: "Резервуар №1 (АИ-95)",
      fuelType: "АИ-95",
      currentLevelLiters: 38000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 16.5,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -10, max: 40 },
        maxWaterLevel: 15
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p3_2",
    trading_point_id: "point3",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №2 (АИ-92)",
    serial_number: "TANK-003-92",
    external_id: "TANK_P3_92",
    status: "online",
    installation_date: "2024-03-15T00:00:00Z",
    created_at: "2024-03-15T12:00:00Z",
    updated_at: "2024-12-08T09:15:00Z",
    params: {
      id: 6,
      name: "Резервуар №2 (АИ-92)",
      fuelType: "АИ-92",
      currentLevelLiters: 41000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 15.8,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -10, max: 40 },
        maxWaterLevel: 15
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p3_3",
    trading_point_id: "point3",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №3 (ДТ)",
    serial_number: "TANK-003-DT",
    external_id: "TANK_P3_DT",
    status: "online",
    installation_date: "2024-04-01T00:00:00Z",
    created_at: "2024-04-01T12:00:00Z",
    updated_at: "2024-12-08T11:45:00Z",
    params: {
      id: 7,
      name: "Резервуар №3 (ДТ)",
      fuelType: "ДТ",
      currentLevelLiters: 29000,
      capacityLiters: 45000,
      minLevelPercent: 15,
      criticalLevelPercent: 8,
      volume: 45000,
      temperature: 13.2,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -10, max: 40 },
        maxWaterLevel: 15
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p3_4",
    trading_point_id: "point3",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №4 (АИ-98)",
    serial_number: "TANK-003-98",
    external_id: "TANK_P3_98",
    status: "online",
    installation_date: "2024-04-15T00:00:00Z",
    created_at: "2024-04-15T12:00:00Z",
    updated_at: "2024-12-08T08:30:00Z",
    params: {
      id: 8,
      name: "Резервуар №4 (АИ-98)",
      fuelType: "АИ-98",
      currentLevelLiters: 15000,
      capacityLiters: 30000,
      minLevelPercent: 18,
      criticalLevelPercent: 9,
      volume: 30000,
      temperature: 17.1,
      waterLevelMm: 0.5,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -10, max: 40 },
        maxWaterLevel: 15
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },

  // АЗС №004 - Московское шоссе (5 резервуаров: АИ-92, АИ-95, АИ-98, ДТ, АИ-100)
  {
    id: "eq_tank_p4_1",
    trading_point_id: "point4",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №1 (АИ-92)",
    serial_number: "TANK-004-92",
    external_id: "TANK_P4_92",
    status: "online",
    installation_date: "2024-01-10T00:00:00Z",
    created_at: "2024-01-10T12:00:00Z",
    updated_at: "2024-12-08T10:30:00Z",
    params: {
      id: 9,
      name: "Резервуар №1 (АИ-92)",
      fuelType: "АИ-92",
      currentLevelLiters: 45000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 18.2,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -12, max: 38 },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p4_2",
    trading_point_id: "point4",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №2 (АИ-95)",
    serial_number: "TANK-004-95",
    external_id: "TANK_P4_95",
    status: "online",
    installation_date: "2024-01-10T00:00:00Z",
    created_at: "2024-01-10T12:00:00Z",
    updated_at: "2024-12-08T09:15:00Z",
    params: {
      id: 10,
      name: "Резервуар №2 (АИ-95)",
      fuelType: "АИ-95",
      currentLevelLiters: 42000,
      capacityLiters: 50000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 50000,
      temperature: 17.5,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -12, max: 38 },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p4_3",
    trading_point_id: "point4",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №3 (АИ-98)",
    serial_number: "TANK-004-98",
    external_id: "TANK_P4_98",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-12-08T11:45:00Z",
    params: {
      id: 11,
      name: "Резервуар №3 (АИ-98)",
      fuelType: "АИ-98",
      currentLevelLiters: 22000,
      capacityLiters: 30000,
      minLevelPercent: 18,
      criticalLevelPercent: 9,
      volume: 30000,
      temperature: 16.8,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -12, max: 38 },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p4_4",
    trading_point_id: "point4",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №4 (ДТ)",
    serial_number: "TANK-004-DT",
    external_id: "TANK_P4_DT",
    status: "online",
    installation_date: "2024-02-15T00:00:00Z",
    created_at: "2024-02-15T12:00:00Z",
    updated_at: "2024-12-08T08:30:00Z",
    params: {
      id: 12,
      name: "Резервуар №4 (ДТ)",
      fuelType: "ДТ",
      currentLevelLiters: 38000,
      capacityLiters: 45000,
      minLevelPercent: 15,
      criticalLevelPercent: 8,
      volume: 45000,
      temperature: 14.2,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -12, max: 38 },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p4_5",
    trading_point_id: "point4",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №5 (АИ-100)",
    serial_number: "TANK-004-100",
    external_id: "TANK_P4_100",
    status: "online",
    installation_date: "2024-03-01T00:00:00Z",
    created_at: "2024-03-01T12:00:00Z",
    updated_at: "2024-12-08T07:15:00Z",
    params: {
      id: 13,
      name: "Резервуар №5 (АИ-100)",
      fuelType: "АИ-100",
      currentLevelLiters: 18000,
      capacityLiters: 25000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 25000,
      temperature: 18.5,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -12, max: 38 },
        maxWaterLevel: 12
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },

  // АЗС №005 - Промзона (5 резервуаров: АИ-92 x2, АИ-95, ДТ, АИ-98)
  {
    id: "eq_tank_p5_1",
    trading_point_id: "point5",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №1 (АИ-92)",
    serial_number: "TANK-005-92A",
    external_id: "TANK_P5_92A",
    status: "online",
    installation_date: "2024-01-20T00:00:00Z",
    created_at: "2024-01-20T12:00:00Z",
    updated_at: "2024-12-08T10:30:00Z",
    params: {
      id: 14,
      name: "Резервуар №1 (АИ-92)",
      fuelType: "АИ-92",
      currentLevelLiters: 32000,
      capacityLiters: 40000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 40000,
      temperature: 17.8,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -15, max: 35 },
        maxWaterLevel: 10
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p5_2",
    trading_point_id: "point5",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №2 (АИ-92)",
    serial_number: "TANK-005-92B",
    external_id: "TANK_P5_92B",
    status: "online",
    installation_date: "2024-02-10T00:00:00Z",
    created_at: "2024-02-10T12:00:00Z",
    updated_at: "2024-12-08T09:15:00Z",
    params: {
      id: 15,
      name: "Резервуар №2 (АИ-92)",
      fuelType: "АИ-92",
      currentLevelLiters: 28000,
      capacityLiters: 40000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 40000,
      temperature: 16.9,
      waterLevelMm: 1,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -15, max: 35 },
        maxWaterLevel: 10
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p5_3",
    trading_point_id: "point5",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №3 (АИ-95)",
    serial_number: "TANK-005-95",
    external_id: "TANK_P5_95",
    status: "online",
    installation_date: "2024-02-10T00:00:00Z",
    created_at: "2024-02-10T12:00:00Z",
    updated_at: "2024-12-08T11:45:00Z",
    params: {
      id: 16,
      name: "Резервуар №3 (АИ-95)",
      fuelType: "АИ-95",
      currentLevelLiters: 35000,
      capacityLiters: 45000,
      minLevelPercent: 18,
      criticalLevelPercent: 9,
      volume: 45000,
      temperature: 15.5,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -15, max: 35 },
        maxWaterLevel: 10
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p5_4",
    trading_point_id: "point5",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №4 (ДТ)",
    serial_number: "TANK-005-DT",
    external_id: "TANK_P5_DT",
    status: "online",
    installation_date: "2024-03-01T00:00:00Z",
    created_at: "2024-03-01T12:00:00Z",
    updated_at: "2024-12-08T08:30:00Z",
    params: {
      id: 17,
      name: "Резервуар №4 (ДТ)",
      fuelType: "ДТ",
      currentLevelLiters: 33000,
      capacityLiters: 40000,
      minLevelPercent: 15,
      criticalLevelPercent: 8,
      volume: 40000,
      temperature: 13.8,
      waterLevelMm: 0,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -15, max: 35 },
        maxWaterLevel: 10
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },
  {
    id: "eq_tank_p5_5",
    trading_point_id: "point5",
    name: "Резервуар",
    system_type: "fuel_tank",
    template_id: "1",
    display_name: "Резервуар №5 (АИ-98)",
    serial_number: "TANK-005-98",
    external_id: "TANK_P5_98",
    status: "maintenance",
    installation_date: "2024-04-10T00:00:00Z",
    created_at: "2024-04-10T12:00:00Z",
    updated_at: "2024-12-08T07:15:00Z",
    params: {
      id: 18,
      name: "Резервуар №5 (АИ-98)",
      fuelType: "АИ-98",
      currentLevelLiters: 12000,
      capacityLiters: 25000,
      minLevelPercent: 20,
      criticalLevelPercent: 10,
      volume: 25000,
      temperature: 16.2,
      waterLevelMm: 2,
      material: "steel",
      thresholds: {
        criticalTemp: { min: -15, max: 35 },
        maxWaterLevel: 10
      }
    },
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"],
    components: []
  },

  // Системы управления для остальных торговых точек
  {
    id: "eq_14",
    trading_point_id: "point3",
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV201",
    external_id: "CTRL_201",
    status: "online",
    installation_date: "2024-01-20T00:00:00Z",
    created_at: "2024-01-20T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
    components: []
  },
  {
    id: "eq_15",
    trading_point_id: "point4",
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV301",
    external_id: "CTRL_301",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
    components: []
  },
  {
    id: "eq_16",
    trading_point_id: "point5",
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV401",
    external_id: "CTRL_401",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
    components: []
  },
  {
    id: "eq_17",
    trading_point_id: "point6",
    name: "Система управления",
    system_type: "control_system",
    template_id: "3",
    display_name: "Система управления АЗС",
    serial_number: "SRV501",
    external_id: "CTRL_501",
    status: "online",
    installation_date: "2024-02-01T00:00:00Z",
    created_at: "2024-02-01T12:00:00Z",
    updated_at: "2024-08-30T07:45:00Z",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_get_prices", "autooplata_set_prices", "autooplata_get_services"],
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
  if (!mockEquipment.length || mockEquipment.length < initialEquipment.length || 
      !mockEquipment[0].availableCommandIds || !mockEquipment[0].name) {
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
};

// Принудительная очистка localStorage для синхронизации
PersistentStorage.remove('equipment');

// Дополнительная очистка для полной синхронизации
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('equipment');
    localStorage.removeItem('currentPrices');
    localStorage.removeItem('fuelTypes');
    localStorage.removeItem('tanks');
  } catch (e) {
  }
}

// Принудительный сброс данных при загрузке (для разработки)
resetEquipmentData();

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
        // Failed to load components count
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

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipmentIndex = mockEquipment.findIndex(eq => eq.id === id);
    if (equipmentIndex === -1) {
      throw new ApiError(404, 'Equipment not found');
    }

    // Удаляем оборудование из массива
    mockEquipment.splice(equipmentIndex, 1);
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

// Legacy exports (keeping for backward compatibility during migration)
// These will be replaced by the dynamic exports below

// Switch between mock and real API based on environment
// isApiMockMode is already imported above

// Real API implementation (for production)
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export current implementation based on mode
const realEquipmentAPI = new RealEquipmentAPI();
const realEquipmentTemplatesAPI = new RealEquipmentTemplatesAPI();

// Import Supabase services
import { 
  supabaseEquipmentAPI, 
  supabaseEquipmentTemplatesAPI 
} from './equipmentSupabase';

// Export current implementation - prioritize Supabase over HTTP API
const useSupabase = import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true';

export const currentEquipmentAPI = isApiMockMode() ? 
  mockEquipmentAPI : 
  (useSupabase ? supabaseEquipmentAPI : realEquipmentAPI);

export const currentEquipmentTemplatesAPI = isApiMockMode() ? 
  dynamicEquipmentTemplatesAPI : 
  (useSupabase ? supabaseEquipmentTemplatesAPI : realEquipmentTemplatesAPI);