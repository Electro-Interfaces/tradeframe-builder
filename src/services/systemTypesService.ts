/**
 * Сервис для управления системными типами оборудования
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией
 * Поддерживает переключение между localStorage и Supabase
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';
import { systemTypesSupabaseService } from './systemTypesSupabaseService';

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

// ❌ MOCK И LOCALSTORAGE УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// Используйте systemTypesSupabaseService

function getSystemTypesFromStorage(): SystemType[] {
  throw new Error('Локальное хранение заблокировано - используйте systemTypesSupabaseService');
}

function saveSystemTypesToStorage(types: SystemType[]): void {
  throw new Error('Локальное сохранение заблокировано - используйте systemTypesSupabaseService');
  try {
    localStorage.setItem(SYSTEM_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving system types to storage:', error);
  }
}

// Новый API для системных типов с централизованной конфигурацией
export const systemTypesService = {
  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ SystemTypesService инициализирован');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации SystemTypesService:', error);
    }
  },

  async isMockMode(): Promise<boolean> {
    try {
      return await apiConfigServiceDB.isMockMode();
    } catch (error) {
      return true;
    }
  },

  async getAllSystemTypes(): Promise<SystemType[]> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService: Используется localStorage режим');
        return getSystemTypesFromStorage().filter(type => type.isActive);
      } else {
        console.log('🔄 SystemTypesService: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.list();
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return getSystemTypesFromStorage().filter(type => type.isActive);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка получения системных типов:', error);
      return getSystemTypesFromStorage().filter(type => type.isActive);
    }
  },

  // Получить все активные системные типы (совместимость)
  async list(): Promise<SystemType[]> {
    return this.getAllSystemTypes();
  },

  // Получить все системные типы (включая неактивные)
  async listAll(): Promise<SystemType[]> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService.listAll: Используется localStorage режим');
        return getSystemTypesFromStorage();
      } else {
        console.log('🔄 SystemTypesService.listAll: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.listAll();
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return getSystemTypesFromStorage();
        }
      }
    } catch (error) {
      console.error('❌ Ошибка получения всех системных типов:', error);
      return getSystemTypesFromStorage();
    }
  },

  // Получить системный тип по ID
  async get(id: string): Promise<SystemType | null> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return getSystemTypesFromStorage().find(type => type.id === id) || null;
      } else {
        try {
          return await systemTypesSupabaseService.get(id);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return getSystemTypesFromStorage().find(type => type.id === id) || null;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка получения системного типа ${id}:`, error);
      return getSystemTypesFromStorage().find(type => type.id === id) || null;
    }
  },

  // Получить системный тип по value
  async getByValue(value: string): Promise<SystemType | null> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return getSystemTypesFromStorage().find(type => type.value === value) || null;
      } else {
        try {
          return await systemTypesSupabaseService.getByValue(value);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return getSystemTypesFromStorage().find(type => type.value === value) || null;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка получения системного типа ${value}:`, error);
      return getSystemTypesFromStorage().find(type => type.value === value) || null;
    }
  },

  // Создать новый системный тип
  async create(input: SystemTypeInput): Promise<SystemType> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService.create: Используется localStorage режим');
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
      } else {
        console.log('🔄 SystemTypesService.create: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.create(input);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          // Fallback на localStorage
          const types = getSystemTypesFromStorage();
          
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
        }
      }
    } catch (error) {
      console.error('❌ Ошибка создания системного типа:', error);
      throw error;
    }
  },

  // Обновить системный тип
  async update(id: string, input: SystemTypeUpdateInput): Promise<SystemType | null> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService.update: Используется localStorage режим');
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
      } else {
        console.log('🔄 SystemTypesService.update: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.update(id, input);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          // Fallback на localStorage
          const types = getSystemTypesFromStorage();
          const index = types.findIndex(type => type.id === id);
          
          if (index === -1) return null;
          
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
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления системного типа ${id}:`, error);
      throw error;
    }
  },

  // Удалить системный тип
  async delete(id: string): Promise<boolean> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService.delete: Используется localStorage режим');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const types = getSystemTypesFromStorage();
        const typeToDelete = types.find(type => type.id === id);
        
        if (!typeToDelete) return false;

        typeToDelete.isActive = false;
        typeToDelete.updatedAt = new Date().toISOString();
        
        saveSystemTypesToStorage(types);
        return true;
      } else {
        console.log('🔄 SystemTypesService.delete: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.delete(id);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          // Fallback на localStorage
          const types = getSystemTypesFromStorage();
          const typeToDelete = types.find(type => type.id === id);
          
          if (!typeToDelete) return false;

          typeToDelete.isActive = false;
          typeToDelete.updatedAt = new Date().toISOString();
          
          saveSystemTypesToStorage(types);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка удаления системного типа ${id}:`, error);
      return false;
    }
  },

  // Восстановить системный тип (сделать активным)
  async restore(id: string): Promise<boolean> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 SystemTypesService.restore: Используется localStorage режим');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const types = getSystemTypesFromStorage();
        const typeToRestore = types.find(type => type.id === id);
        
        if (!typeToRestore) return false;

        typeToRestore.isActive = true;
        typeToRestore.updatedAt = new Date().toISOString();
        
        saveSystemTypesToStorage(types);
        return true;
      } else {
        console.log('🔄 SystemTypesService.restore: Используется Supabase режим');
        try {
          return await systemTypesSupabaseService.restore(id);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          // Fallback на localStorage
          const types = getSystemTypesFromStorage();
          const typeToRestore = types.find(type => type.id === id);
          
          if (!typeToRestore) return false;

          typeToRestore.isActive = true;
          typeToRestore.updatedAt = new Date().toISOString();
          
          saveSystemTypesToStorage(types);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка восстановления системного типа ${id}:`, error);
      return false;
    }
  },

  // Получить опции для dropdown (активные типы)
  async getOptions(): Promise<Array<{value: string, label: string}>> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        const activeTypes = await this.list();
        return activeTypes.map(type => ({
          value: type.value,
          label: type.label
        }));
      } else {
        try {
          return await systemTypesSupabaseService.getOptions();
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          const activeTypes = await this.list();
          return activeTypes.map(type => ({
            value: type.value,
            label: type.label
          }));
        }
      }
    } catch (error) {
      console.error('❌ Ошибка получения опций системных типов:', error);
      return [];
    }
  }
};

// Совместимость со старым API
export const systemTypesAPI = systemTypesService;