// Сервис для управления системными типами оборудования

export interface SystemType {
  id: string;
  value: string; // технический код (fuel_tank, control_system, etc.)
  label: string; // отображаемое название
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemTypeInput {
  value: string;
  label: string;
  description?: string;
  isActive?: boolean;
}

export interface SystemTypeUpdateInput extends SystemTypeInput {
  isActive?: boolean;
}

// Базовые системные типы (по умолчанию)
const defaultSystemTypes: SystemType[] = [
  {
    id: "1",
    value: "fuel_tank",
    label: "Топливный резервуар",
    description: "Резервуары для хранения топлива",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2", 
    value: "self_service_terminal",
    label: "Терминал самообслуживания",
    description: "Автоматизированные терминалы для клиентов",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    value: "control_system", 
    label: "Система управления",
    description: "Центральные системы управления АЗС",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    value: "price_display",
    label: "Табло цен",
    description: "Электронные табло для отображения цен",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    value: "surveillance",
    label: "Видеонаблюдение", 
    description: "Системы видеонаблюдения и безопасности",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    value: "audio_system",
    label: "Звуковое сопровождение",
    description: "Аудиосистемы и оповещение",
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Ключ для хранения в localStorage
const SYSTEM_TYPES_KEY = 'systemTypes';

// Функции для работы с данными
function getSystemTypesFromStorage(): SystemType[] {
  try {
    const stored = localStorage.getItem(SYSTEM_TYPES_KEY);
    if (!stored) {
      // Если данных нет, сохраняем базовые типы
      localStorage.setItem(SYSTEM_TYPES_KEY, JSON.stringify(defaultSystemTypes));
      return defaultSystemTypes;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading system types from storage:', error);
    return defaultSystemTypes;
  }
}

function saveSystemTypesToStorage(types: SystemType[]): void {
  try {
    localStorage.setItem(SYSTEM_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving system types to storage:', error);
  }
}

// API для системных типов
export const systemTypesAPI = {
  // Получить все активные системные типы
  async list(): Promise<SystemType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getSystemTypesFromStorage().filter(type => type.isActive);
  },

  // Получить все системные типы (включая неактивные)
  async listAll(): Promise<SystemType[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getSystemTypesFromStorage();
  },

  // Получить системный тип по ID
  async get(id: string): Promise<SystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getSystemTypesFromStorage().find(type => type.id === id) || null;
  },

  // Получить системный тип по value
  async getByValue(value: string): Promise<SystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return getSystemTypesFromStorage().find(type => type.value === value) || null;
  },

  // Создать новый системный тип
  async create(input: SystemTypeInput): Promise<SystemType> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getSystemTypesFromStorage();
    
    // Проверка уникальности value
    if (types.some(type => type.value === input.value)) {
      throw new Error(`Системный тип с кодом "${input.value}" уже существует`);
    }

    const newType: SystemType = {
      ...input,
      id: Date.now().toString(),
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString()
    };

    const updatedTypes = [...types, newType];
    saveSystemTypesToStorage(updatedTypes);
    
    return newType;
  },

  // Обновить системный тип
  async update(id: string, input: SystemTypeUpdateInput): Promise<SystemType | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getSystemTypesFromStorage();
    const index = types.findIndex(type => type.id === id);
    
    if (index === -1) return null;
    
    // Проверка уникальности value (исключая редактируемый элемент)
    if (input.value && types.some(type => type.value === input.value && type.id !== id)) {
      throw new Error(`Системный тип с кодом "${input.value}" уже существует`);
    }

    const updatedType: SystemType = {
      ...types[index],
      ...input,
      updatedAt: new Date().toISOString()
    };

    types[index] = updatedType;
    saveSystemTypesToStorage(types);
    
    return updatedType;
  },

  // Удалить системный тип
  async delete(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getSystemTypesFromStorage();
    const typeToDelete = types.find(type => type.id === id);
    
    if (!typeToDelete) return false;

    // TODO: Добавить проверку на использование типа в существующих шаблонах оборудования
    // Пока что просто помечаем как неактивный вместо удаления
    typeToDelete.isActive = false;
    typeToDelete.updatedAt = new Date().toISOString();
    
    saveSystemTypesToStorage(types);
    return true;
  },

  // Восстановить системный тип (сделать активным)
  async restore(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const types = getSystemTypesFromStorage();
    const typeToRestore = types.find(type => type.id === id);
    
    if (!typeToRestore) return false;

    typeToRestore.isActive = true;
    typeToRestore.updatedAt = new Date().toISOString();
    
    saveSystemTypesToStorage(types);
    return true;
  },

  // Получить опции для dropdown (активные типы)
  async getOptions(): Promise<Array<{value: string, label: string}>> {
    const activeTypes = await this.list();
    return activeTypes.map(type => ({
      value: type.value,
      label: type.label
    }));
  }
};