/**
 * System Types Supabase Service - Прямая работа с базой данных
 * УПРОЩЕН: Убраны checkConnection и все проверки подключения
 * Прямые вызовы Supabase с четкими ошибками
 */

import { supabaseClientBrowser } from './supabaseClientBrowser';
import { SystemType, SystemTypeInput, SystemTypeUpdateInput } from './systemTypesService';

// Интерфейс для работы с Supabase
interface SupabaseSystemType {
  id: string;
  value: string;
  label: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class SystemTypesSupabaseService {

  /**
   * Получить все активные системные типы
   */
  async list(): Promise<SystemType[]> {
    console.log('🔍 SystemTypesSupabaseService.list() called');
    
    const { data, error } = await supabaseClientBrowser
      .from('system_types')
      .select('*')
      .eq('is_active', true)
      .order('label', { ascending: true });

    if (error) {
      console.error('❌ Database error loading system types:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Loaded active system types from Supabase:', data?.length || 0);
    return (data || []).map(this.transformSupabaseToSystemType);
  }

  /**
   * Получить все системные типы (включая неактивные)
   */
  async listAll(): Promise<SystemType[]> {
    console.log('🔍 SystemTypesSupabaseService.listAll() called');
    try {
      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .select('*')
        .order('label', { ascending: true });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded all system types from Supabase:', data?.length || 0);
      return (data || []).map(this.transformSupabaseToSystemType);
    } catch (error) {
      console.error('❌ SystemTypesSupabaseService.listAll error:', error);
      throw error;
    }
  }

  /**
   * Получить системный тип по ID
   */
  async get(id: string): Promise<SystemType | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformSupabaseToSystemType(data);
    } catch (error) {
      console.error(`❌ SystemTypesSupabaseService.get(${id}) error:`, error);
      return null;
    }
  }

  /**
   * Получить системный тип по value
   */
  async getByValue(value: string): Promise<SystemType | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .select('*')
        .eq('value', value)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformSupabaseToSystemType(data);
    } catch (error) {
      console.error(`❌ SystemTypesSupabaseService.getByValue(${value}) error:`, error);
      return null;
    }
  }

  /**
   * Создать новый системный тип
   */
  async create(input: SystemTypeInput): Promise<SystemType> {
    console.log('📝 Создание нового системного типа');

    // Проверяем уникальность value
    const existing = await this.getByValue(input.value);
    if (existing) {
      throw new Error(`Системный тип с кодом "${input.value}" уже существует`);
    }

    const supabaseData: Partial<SupabaseSystemType> = {
      value: input.value,
      label: input.label,
      description: input.description,
      is_active: input.isActive ?? true
    };

    const { data, error } = await supabaseClientBrowser
      .from('system_types')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating system type:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Created system type:', data.value);
    return this.transformSupabaseToSystemType(data);
  }

  /**
   * Обновить системный тип
   */
  async update(id: string, input: SystemTypeUpdateInput): Promise<SystemType | null> {
    try {
      // Проверяем уникальность value (исключая редактируемый элемент)
      if (input.value) {
        const { data: existingData } = await supabaseClientBrowser
          .from('system_types')
          .select('id')
          .eq('value', input.value)
          .neq('id', id);

        if (existingData && existingData.length > 0) {
          throw new Error(`Системный тип с кодом "${input.value}" уже существует`);
        }
      }

      const updateData: Partial<SupabaseSystemType> = {
        updated_at: new Date().toISOString()
      };

      if (input.value) updateData.value = input.value;
      if (input.label) updateData.label = input.label;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      console.log('✅ Updated system type:', data.value);
      return this.transformSupabaseToSystemType(data);
    } catch (error) {
      console.error(`❌ SystemTypesSupabaseService.update(${id}) error:`, error);
      throw error;
    }
  }

  /**
   * Удалить системный тип (помечаем как неактивный)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('value')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
      }

      console.log('✅ Deactivated system type:', data.value);
      return true;
    } catch (error) {
      console.error(`❌ SystemTypesSupabaseService.delete(${id}) error:`, error);
      return false;
    }
  }

  /**
   * Восстановить системный тип (сделать активным)
   */
  async restore(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('system_types')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('value')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
      }

      console.log('✅ Restored system type:', data.value);
      return true;
    } catch (error) {
      console.error(`❌ SystemTypesSupabaseService.restore(${id}) error:`, error);
      return false;
    }
  }

  /**
   * Получить опции для dropdown (активные типы)
   */
  async getOptions(): Promise<Array<{value: string, label: string}>> {
    try {
      const activeTypes = await this.list();
      return activeTypes.map(type => ({
        value: type.value,
        label: type.label
      }));
    } catch (error) {
      console.error('❌ SystemTypesSupabaseService.getOptions error:', error);
      return [];
    }
  }

  // Приватные методы трансформации данных

  private transformSupabaseToSystemType(data: SupabaseSystemType): SystemType {
    return {
      id: data.id,
      value: data.value,
      label: data.label,
      description: data.description,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// Создаем singleton экземпляр
export const systemTypesSupabaseService = new SystemTypesSupabaseService();

// Создаем совместимую обертку для старого API
export const systemTypesAPI = {
  async list() {
    return await systemTypesSupabaseService.list();
  },

  async listAll() {
    return await systemTypesSupabaseService.listAll();
  },

  async get(id: string) {
    return await systemTypesSupabaseService.get(id);
  },

  async getByValue(value: string) {
    return await systemTypesSupabaseService.getByValue(value);
  },

  async create(input: SystemTypeInput) {
    return await systemTypesSupabaseService.create(input);
  },

  async update(id: string, input: SystemTypeUpdateInput) {
    return await systemTypesSupabaseService.update(id, input);
  },

  async delete(id: string) {
    return await systemTypesSupabaseService.delete(id);
  },

  async restore(id: string) {
    return await systemTypesSupabaseService.restore(id);
  },

  async getOptions() {
    return await systemTypesSupabaseService.getOptions();
  }
};