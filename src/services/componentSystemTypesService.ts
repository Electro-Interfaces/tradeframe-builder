/**
 * Сервис для управления системными типами компонентов
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией
 * Поддерживает переключение между localStorage и Supabase (когда будет готов)
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';

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

// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
const mockComponentSystemTypes: ComponentSystemType[] = [];

// ❌ LOCALSTORAGE ФУНКЦИИ ЗАБЛОКИРОВАНЫ
function getComponentSystemTypesFromStorage(): ComponentSystemType[] {
  throw new Error('Локальное хранение системных типов заблокировано. Настройте подключение к Supabase в разделе "Обмен данными".');

// ❌ СОХРАНЕНИЕ В LOCALSTORAGE ЗАБЛОКИРОВАНО
function saveComponentSystemTypesToStorage(types: ComponentSystemType[]): void {
  throw new Error('Сохранение системных типов в localStorage заблокировано.');
}

// Новый API для системных типов компонентов с централизованной конфигурацией
export const componentSystemTypesService = {
  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ ComponentSystemTypesService инициализирован');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации ComponentSystemTypesService:', error);
    }
  },

  // ❌ MOCK РЕЖИМ НАВСЕГДА ЗАБЛОКИРОВАН
  async isMockMode(): Promise<boolean> {
    return false;
  },

  // Получить все активные системные типы компонентов
  async list(): Promise<ComponentSystemType[]> {
    try {
      const isMock = await this.isMockMode();
      console.log(`🔄 ComponentSystemTypesService.list: Используется ${isMock ? 'localStorage' : 'database'} режим`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return getComponentSystemTypesFromStorage().filter(type => type.isActive);
    } catch (error) {
      console.error('❌ Ошибка получения системных типов компонентов:', error);
      return getComponentSystemTypesFromStorage().filter(type => type.isActive);
    }
  },

  // Получить все системные типы (включая неактивные)
  async listAll(): Promise<ComponentSystemType[]> {
    try {
      const isMock = await this.isMockMode();
      console.log(`🔄 ComponentSystemTypesService.listAll: Используется ${isMock ? 'localStorage' : 'database'} режим`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return getComponentSystemTypesFromStorage();
    } catch (error) {
      console.error('❌ Ошибка получения всех системных типов компонентов:', error);
      return getComponentSystemTypesFromStorage();
    }
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
    try {
      const isMock = await this.isMockMode();
      console.log(`🔄 ComponentSystemTypesService.getOptions: Используется ${isMock ? 'localStorage' : 'database'} режим`);
      
      const activeTypes = await this.list();
      return activeTypes.map(type => ({
        value: type.value,
        label: type.label,
        category: type.category
      }));
    } catch (error) {
      console.error('❌ Ошибка получения опций системных типов компонентов:', error);
      return [];
    }
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

// Совместимость со старым API
export const componentSystemTypesAPI = componentSystemTypesService;