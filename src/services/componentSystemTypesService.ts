// Сервис для управления системными типами компонентов

export interface ComponentSystemType {
  id: string;
  value: string; // технический код (sensor_level, printer, display, etc.)
  label: string; // отображаемое название
  description?: string;
  category: string; // категория компонента (sensor, payment, display, etc.)
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ComponentSystemTypeInput {
  value: string;
  label: string;
  description?: string;
  category: string;
  isActive?: boolean;
}

export interface ComponentSystemTypeUpdateInput extends ComponentSystemTypeInput {
  isActive?: boolean;
}

// Базовые системные типы компонентов (по умолчанию)
const defaultComponentSystemTypes: ComponentSystemType[] = [
  // Датчики (для резервуаров)
  {
    id: "1",
    value: "sensor_level",
    label: "Датчик уровня",
    description: "Датчики для измерения уровня топлива",
    category: "sensor",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    value: "sensor_temp",
    label: "Датчик температуры",
    description: "Датчики температуры топлива",
    category: "sensor", 
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    value: "sensor_water",
    label: "Датчик товарной воды",
    description: "Датчики обнаружения воды в топливе",
    category: "sensor",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    value: "sensor_leak",
    label: "Датчик утечки",
    description: "Датчики обнаружения утечки топлива",
    category: "sensor",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Устройства вывода (для терминалов и систем)
  {
    id: "5",
    value: "display",
    label: "Дисплей",
    description: "Мониторы и дисплеи",
    category: "display",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    value: "printer",
    label: "Принтер",
    description: "Термопринтеры чеков",
    category: "output",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Платежные устройства
  {
    id: "7",
    value: "card_reader_fuel",
    label: "Картридер топливных карт",
    description: "Устройства чтения топливных карт",
    category: "payment",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "8",
    value: "card_reader_bank",
    label: "Картридер банковских карт",
    description: "Устройства чтения банковских карт",
    category: "payment",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "9",
    value: "cash_acceptor",
    label: "Купюроприёмник",
    description: "Устройства приёма наличных",
    category: "payment",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "10",
    value: "fiscal_device",
    label: "Фискальное устройство",
    description: "ККТ и фискальные регистраторы",
    category: "fiscal",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Программные компоненты
  {
    id: "11",
    value: "software",
    label: "Программный модуль",
    description: "Программное обеспечение и драйверы",
    category: "software",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Контроллеры и управление
  {
    id: "12",
    value: "controller",
    label: "Контроллер",
    description: "Управляющие устройства и контроллеры",
    category: "control",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "13",
    value: "communication",
    label: "Модуль связи",
    description: "Устройства связи и передачи данных",
    category: "communication",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Камеры и видео
  {
    id: "14",
    value: "camera",
    label: "Камера",
    description: "Видеокамеры наблюдения",
    category: "security",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "15",
    value: "video_recorder",
    label: "Видеорегистратор",
    description: "Устройства записи видео",
    category: "security",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Насосы и механика
  {
    id: "16",
    value: "pump",
    label: "Насос",
    description: "Топливные насосы и помпы",
    category: "mechanical",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Системы безопасности
  {
    id: "17",
    value: "fire_sensor",
    label: "Датчик пожара",
    description: "Пожарные датчики и сигнализация",
    category: "safety",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Дисплеи цен и табло
  {
    id: "18",
    value: "price_panel",
    label: "Панель отображения цен",
    description: "LED панели для отображения цен",
    category: "display",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Звук
  {
    id: "19",
    value: "audio",
    label: "Аудиокомпонент",
    description: "Динамики и аудиооборудование",
    category: "audio",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  
  // Питание
  {
    id: "20",
    value: "power_supply",
    label: "Блок питания",
    description: "ИБП и источники питания",
    category: "power",
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Ключ для хранения в localStorage
const COMPONENT_SYSTEM_TYPES_KEY = 'componentSystemTypes';

// Функции для работы с данными
function getComponentSystemTypesFromStorage(): ComponentSystemType[] {
  try {
    const stored = localStorage.getItem(COMPONENT_SYSTEM_TYPES_KEY);
    if (!stored) {
      // Если данных нет, сохраняем базовые типы
      localStorage.setItem(COMPONENT_SYSTEM_TYPES_KEY, JSON.stringify(defaultComponentSystemTypes));
      return defaultComponentSystemTypes;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading component system types from storage:', error);
    return defaultComponentSystemTypes;
  }
}

function saveComponentSystemTypesToStorage(types: ComponentSystemType[]): void {
  try {
    localStorage.setItem(COMPONENT_SYSTEM_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving component system types to storage:', error);
  }
}

// API для системных типов компонентов
export const componentSystemTypesAPI = {
  // Получить все активные системные типы компонентов
  async list(): Promise<ComponentSystemType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getComponentSystemTypesFromStorage().filter(type => type.isActive);
  },

  // Получить все системные типы (включая неактивные)
  async listAll(): Promise<ComponentSystemType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getComponentSystemTypesFromStorage();
  },

  // Получить системные типы по категории
  async listByCategory(category: string): Promise<ComponentSystemType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getComponentSystemTypesFromStorage()
      .filter(type => type.isActive && type.category === category);
  },

  // Получить все доступные категории
  async getCategories(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const types = getComponentSystemTypesFromStorage().filter(type => type.isActive);
    return [...new Set(types.map(type => type.category))];
  },

  // Получить системный тип по ID
  async get(id: string): Promise<ComponentSystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getComponentSystemTypesFromStorage().find(type => type.id === id) || null;
  },

  // Получить системный тип по value
  async getByValue(value: string): Promise<ComponentSystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getComponentSystemTypesFromStorage().find(type => type.value === value) || null;
  },

  // Создать новый системный тип компонента
  async create(input: ComponentSystemTypeInput): Promise<ComponentSystemType> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getComponentSystemTypesFromStorage();
    
    // Проверка уникальности value
    if (types.some(type => type.value === input.value)) {
      throw new Error(`Системный тип компонента с кодом "${input.value}" уже существует`);
    }

    const newType: ComponentSystemType = {
      ...input,
      id: Date.now().toString(),
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString()
    };

    const updatedTypes = [...types, newType];
    saveComponentSystemTypesToStorage(updatedTypes);
    
    return newType;
  },

  // Обновить системный тип компонента
  async update(id: string, input: ComponentSystemTypeUpdateInput): Promise<ComponentSystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getComponentSystemTypesFromStorage();
    const index = types.findIndex(type => type.id === id);
    
    if (index === -1) return null;
    
    // Проверка уникальности value (исключая редактируемый элемент)
    if (input.value && types.some(type => type.value === input.value && type.id !== id)) {
      throw new Error(`Системный тип компонента с кодом "${input.value}" уже существует`);
    }

    const updatedType: ComponentSystemType = {
      ...types[index],
      ...input,
      updatedAt: new Date().toISOString()
    };

    types[index] = updatedType;
    saveComponentSystemTypesToStorage(types);
    
    return updatedType;
  },

  // Удалить системный тип компонента (мягкое удаление)
  async delete(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getComponentSystemTypesFromStorage();
    const typeToDelete = types.find(type => type.id === id);
    
    if (!typeToDelete) return false;

    // TODO: Добавить проверку на использование типа в существующих шаблонах компонентов
    // Пока что просто помечаем как неактивный вместо удаления
    typeToDelete.isActive = false;
    typeToDelete.updatedAt = new Date().toISOString();
    
    saveComponentSystemTypesToStorage(types);
    return true;
  },

  // Восстановить системный тип компонента (сделать активным)
  async restore(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getComponentSystemTypesFromStorage();
    const typeToRestore = types.find(type => type.id === id);
    
    if (!typeToRestore) return false;

    typeToRestore.isActive = true;
    typeToRestore.updatedAt = new Date().toISOString();
    
    saveComponentSystemTypesToStorage(types);
    return true;
  },

  // Получить опции для dropdown (активные типы)
  async getOptions(): Promise<Array<{value: string, label: string, category: string}>> {
    const activeTypes = await this.list();
    return activeTypes.map(type => ({
      value: type.value,
      label: type.label,
      category: type.category
    }));
  },

  // Получить опции для dropdown сгруппированные по категориям
  async getGroupedOptions(): Promise<Record<string, Array<{value: string, label: string}>>> {
    const activeTypes = await this.list();
    const grouped: Record<string, Array<{value: string, label: string}>> = {};
    
    activeTypes.forEach(type => {
      if (!grouped[type.category]) {
        grouped[type.category] = [];
      }
      grouped[type.category].push({
        value: type.value,
        label: type.label
      });
    });
    
    return grouped;
  }
};