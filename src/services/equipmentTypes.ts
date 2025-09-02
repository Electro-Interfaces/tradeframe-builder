// Сервис для работы с типами оборудования
// Обеспечивает связь между разделом "Типы оборудования" и страницей "Оборудование"

export interface EquipmentType {
  id: string;
  name: string;
  code: string;
  description?: string;
  systemType: string;
  isActive: boolean;
  availableCommandIds?: string[];
  defaultParams?: Record<string, any>;
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  technical_code: string;
  system_type: string;
  status: boolean;
  description?: string;
  default_params?: Record<string, any>;
  allow_component_template_ids?: string[];
  created_at: string;
  updated_at: string;
}

// Функции для работы с localStorage
const EQUIPMENT_TYPES_KEY = 'equipmentTypes';

// Базовые типы оборудования (по умолчанию)
const defaultEquipmentTypes: EquipmentType[] = [
  {
    id: "1",
    name: "Резервуар",
    code: "EQP_RESERVOIR",
    description: "Топливный резервуар для хранения нефтепродуктов",
    systemType: "fuel_tank",
    isActive: true,
    availableCommandIds: ["1", "4"],
  },
  {
    id: "2",
    name: "Терминал самообслуживания",
    code: "EQP_TSO",
    description: "Автоматизированный терминал самообслуживания на АЗС",
    systemType: "self_service_terminal",
    isActive: true,
    availableCommandIds: ["1", "2", "3", "4", "5"],
  },
  {
    id: "3",
    name: "Система управления",
    code: "EQP_CONTROL_SYSTEM",
    description: "Центральная система управления АЗС",
    systemType: "control_system",
    isActive: true,
    availableCommandIds: ["1", "2", "3", "4"],
  },
  {
    id: "4",
    name: "Табло цен",
    code: "EQP_PRICE_BOARD",
    description: "Электронное табло для отображения цен на топливо",
    systemType: "price_display",
    isActive: true,
    availableCommandIds: ["1", "2", "4"],
  },
  {
    id: "5",
    name: "Видеонаблюдение",
    code: "EQP_CCTV",
    description: "Система видеонаблюдения для безопасности АЗС",
    systemType: "surveillance",
    isActive: true,
    availableCommandIds: ["1", "4"],
  },
  {
    id: "6",
    name: "Звуковое сопровождение",
    code: "EQP_AUDIO",
    description: "Система звукового сопровождения и оповещения",
    systemType: "audio_system",
    isActive: true,
    availableCommandIds: ["1", "4"],
  },
];

// Функции для работы с данными
function getEquipmentTypesFromStorage(): EquipmentType[] {
  try {
    const stored = localStorage.getItem(EQUIPMENT_TYPES_KEY);
    if (!stored) {
      // Если данных нет, сохраняем базовые типы
      localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(defaultEquipmentTypes));
      return defaultEquipmentTypes;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading equipment types from storage:', error);
    return defaultEquipmentTypes;
  }
}

function saveEquipmentTypesToStorage(types: EquipmentType[]): void {
  try {
    localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving equipment types to storage:', error);
  }
}

// Конвертер из EquipmentType в EquipmentTemplate
export function convertToEquipmentTemplate(equipmentType: EquipmentType): EquipmentTemplate {
  return {
    id: equipmentType.id,
    name: equipmentType.name,
    technical_code: equipmentType.code,
    system_type: equipmentType.systemType,
    status: equipmentType.isActive,
    description: equipmentType.description,
    default_params: equipmentType.defaultParams || getDefaultParamsBySystemType(equipmentType.systemType),
    allow_component_template_ids: getComponentTemplateIds(equipmentType.systemType),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Вспомогательная функция для получения параметров по умолчанию по типу системы
function getDefaultParamsBySystemType(systemType: string): Record<string, any> {
  switch (systemType) {
    case 'fuel_tank':
      return { 
        // Обязательные поля (соответствуют Tank интерфейсу)
        id: null,
        name: "",
        fuelType: "",
        currentLevelLiters: 0,
        
        // Параметры емкости
        capacityLiters: 50000,
        minLevelPercent: 20,
        criticalLevelPercent: 10,
        
        // Физические параметры (синхронизировано с tanksService)
        temperature: 15.0,
        waterLevelMm: 0.0, // возвращено обратно на waterLevelMm
        density: 0.725,
        
        // Статус и операционные данные (добавлено из tanksService)
        status: 'active',
        location: "Зона не указана",
        installationDate: new Date().toISOString().split('T')[0],
        lastCalibration: null,
        supplier: null,
        
        // Поля из UI (добавлено)
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
        
        // Пороговые значения (синхронизировано с tanksService и UI)
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
        updated_at: new Date().toISOString(),
        
        // Дополнительные технические параметры
        material: "steel"
      };
    case 'self_service_terminal':
      return { touch_screen: true, payment_methods: ["card", "cash"] };
    case 'control_system':
      return { server_type: "industrial", redundancy: true };
    case 'price_display':
      return { display_type: "LED", brightness: 5000 };
    case 'surveillance':
      return { resolution: "4K", night_vision: true, storage_days: 30 };
    case 'audio_system':
      return { speakers: 6, volume_max: 80, zones: 3 };
    default:
      return {};
  }
}

// Вспомогательная функция для получения доступных компонентов по типу системы
function getComponentTemplateIds(systemType: string): string[] {
  switch (systemType) {
    case 'fuel_tank':
      return ["comp_sensor_level_1"];
    case 'self_service_terminal':
      return ["comp_printer_1", "comp_pinpad_1"];
    case 'control_system':
      return ["comp_server_1", "comp_ups_1"];
    case 'price_display':
      return ["comp_led_1"];
    case 'surveillance':
      return ["comp_camera_1", "comp_dvr_1"];
    case 'audio_system':
      return ["comp_speaker_1", "comp_amplifier_1"];
    default:
      return [];
  }
}

// API для получения типов оборудования
export const equipmentTypesAPI = {
  async list(): Promise<EquipmentType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const allTypes = getEquipmentTypesFromStorage();
    console.log('equipmentTypesAPI.list() - all types from storage:', allTypes);
    const activeTypes = allTypes.filter(type => type.isActive);
    console.log('equipmentTypesAPI.list() - active types:', activeTypes);
    return activeTypes;
  },

  async get(id: string): Promise<EquipmentType | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getEquipmentTypesFromStorage().find(type => type.id === id) || null;
  },

  async create(type: Omit<EquipmentType, 'id'>): Promise<EquipmentType> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newType: EquipmentType = {
      ...type,
      id: Date.now().toString(),
    };
    const types = getEquipmentTypesFromStorage();
    const updatedTypes = [...types, newType];
    saveEquipmentTypesToStorage(updatedTypes);
    return newType;
  },

  async update(id: string, updates: Partial<EquipmentType>): Promise<EquipmentType | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const types = getEquipmentTypesFromStorage();
    const index = types.findIndex(type => type.id === id);
    if (index === -1) return null;
    
    const updatedType = { ...types[index], ...updates };
    types[index] = updatedType;
    saveEquipmentTypesToStorage(types);
    return updatedType;
  },

  async delete(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const types = getEquipmentTypesFromStorage();
    const filteredTypes = types.filter(type => type.id !== id);
    if (filteredTypes.length === types.length) return false;
    
    saveEquipmentTypesToStorage(filteredTypes);
    return true;
  }
};

// API для получения шаблонов оборудования на основе типов
export const equipmentTemplatesFromTypesAPI = {
  async list(): Promise<EquipmentTemplate[]> {
    const equipmentTypes = await equipmentTypesAPI.list();
    console.log('equipmentTemplatesFromTypesAPI.list() - equipment types:', equipmentTypes);
    const templates = equipmentTypes.map(convertToEquipmentTemplate);
    console.log('equipmentTemplatesFromTypesAPI.list() - converted templates:', templates);
    return templates;
  },

  async get(id: string): Promise<EquipmentTemplate | null> {
    const equipmentType = await equipmentTypesAPI.get(id);
    return equipmentType ? convertToEquipmentTemplate(equipmentType) : null;
  }
};