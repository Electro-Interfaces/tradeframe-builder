/**
 * Command Templates Service - Прямое подключение к Supabase
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией
 * Поддерживает переключение между database и fallback режимами
 * Замена HTTP API версии для работы напрямую с базой данных
 */

import { 
  CommandTemplate,
  CommandTemplateId,
  CreateCommandTemplateRequest,
  UpdateCommandTemplateRequest,
  ListCommandTemplatesParams,
  ListCommandTemplatesResponse
} from '@/types/commandTemplate';
import { supabaseService } from './supabaseServiceClient';
import { SupabaseConnectionHelper, executeSupabaseOperation } from './supabaseConnectionHelper';

class CommandTemplatesSupabaseService {
  private tableName = 'command_templates';

  /**
   * Получить список шаблонов команд
   */
  async list(params?: ListCommandTemplatesParams): Promise<ListCommandTemplatesResponse> {
    return await executeSupabaseOperation(
      'Загрузка шаблонов команд',
      async () => {
        let query = supabaseService
          .from(this.tableName)
          .select('*', { count: 'exact' });

        // Применяем фильтры
        if (params?.category) {
          query = query.eq('category', params.category);
        }
        if (params?.equipment_type) {
          query = query.eq('equipment_type', params.equipment_type);
        }
        if (params?.is_system !== undefined) {
          query = query.eq('is_system', params.is_system);
        }
        if (params?.search) {
          query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
        }

        // Пагинация
        const limit = params?.limit || 100;
        const offset = ((params?.page || 1) - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        // Сортировка
        query = query.order('name');

        const { data, error, count } = await query;

        if (error) {
          throw error;
        }

        return {
          data: data || [],
          pagination: {
            page: params?.page || 1,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
          }
        };
      }
      // ❌ FALLBACK УДАЛЕН
    );
  }

  /**
   * Получить шаблон команды по ID
   */
  async get(id: CommandTemplateId): Promise<CommandTemplate> {
    return await executeSupabaseOperation(
      `Загрузка шаблона команды ${id}`,
      async () => {
        const { data, error } = await supabaseService
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        return data;
      }
      // ❌ FALLBACK УДАЛЕН
    );
  }

  /**
   * Создать новый шаблон команды
   */
  async create(request: CreateCommandTemplateRequest): Promise<CommandTemplate> {
    return await executeSupabaseOperation(
      'Создание нового шаблона команды',
      async () => {
        const newTemplate = {
          ...request,
          id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          is_system: false, // Пользовательские шаблоны не системные
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService
          .from(this.tableName)
          .insert([newTemplate])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      }
      // ❌ FALLBACK УДАЛЕН
    );
  }

  /**
   * Обновить шаблон команды
   */
  async update(id: CommandTemplateId, request: UpdateCommandTemplateRequest): Promise<CommandTemplate> {
    return await executeSupabaseOperation(
      `Обновление шаблона команды ${id}`,
      async () => {
        // Проверяем, что это не системный шаблон
        const existingTemplate = await this.get(id);
        if (existingTemplate.is_system) {
          throw new Error('System templates cannot be modified');
        }

        const updateData = {
          ...request,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService
          .from(this.tableName)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      }
      // ❌ FALLBACK УДАЛЕН
    );
  }

  /**
   * Удалить шаблон команды
   */
  async delete(id: CommandTemplateId): Promise<void> {
    return await executeSupabaseOperation(
      `Удаление шаблона команды ${id}`,
      async () => {
        // Проверяем, что это не системный шаблон
        const existingTemplate = await this.get(id);
        if (existingTemplate.is_system) {
          throw new Error('System templates cannot be deleted');
        }

        const { error } = await supabaseService
          .from(this.tableName)
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }
      }
      // ❌ FALLBACK УДАЛЕН
    );
  }

  /**
   * Получить шаблоны по категории
   */
  async getByCategory(category: string): Promise<CommandTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .eq('category', category)
        .order('name');

      if (error) {
        console.error('❌ Failed to fetch templates by category:', error);
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching templates by category:', error);
      throw error;
    }
  }

  /**
   * Получить шаблоны для конкретного типа оборудования
   */
  async getByEquipmentType(equipmentType: string): Promise<CommandTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .eq('equipment_type', equipmentType)
        .order('name');

      if (error) {
        console.error('❌ Failed to fetch templates by equipment type:', error);
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching templates by equipment type:', error);
      throw error;
    }
  }

  /**
   * Клонировать шаблон команды
   */
  async clone(id: CommandTemplateId, newName: string): Promise<CommandTemplate> {
    try {
      const originalTemplate = await this.get(id);
      
      // Создаем копию без системных полей
      const cloneData: CreateCommandTemplateRequest = {
        name: newName,
        description: `${originalTemplate.description} (копия)`,
        category: originalTemplate.category,
        equipment_type: originalTemplate.equipment_type,
        command_schema: originalTemplate.command_schema,
        default_values: originalTemplate.default_values,
        validation_rules: originalTemplate.validation_rules,
        tags: originalTemplate.tags,
        metadata: {
          ...originalTemplate.metadata,
          cloned_from: id,
          cloned_at: new Date().toISOString()
        }
      };

      return await this.create(cloneData);
    } catch (error) {
      console.error('❌ Error cloning command template:', error);
      throw error;
    }
  }

  /**
   * Получить системные шаблоны
   */
  async getSystemTemplates(): Promise<CommandTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .eq('is_system', true)
        .order('name');

      if (error) {
        console.error('❌ Failed to fetch system templates:', error);
        throw new Error(`Failed to fetch system templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching system templates:', error);
      throw error;
    }
  }

  /**
   * Получить пользовательские шаблоны
   */
  async getUserTemplates(): Promise<CommandTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .eq('is_system', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch user templates:', error);
        throw new Error(`Failed to fetch user templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching user templates:', error);
      throw error;
    }
  }

  /**
   * Поиск шаблонов по тексту
   */
  async search(query: string): Promise<CommandTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.ilike.%${query}%`)
        .order('name');

      if (error) {
        console.error('❌ Failed to search templates:', error);
        throw new Error(`Failed to search templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error searching templates:', error);
      throw error;
    }
  }

  /**
   * Валидация шаблона
   */
  async validate(template: CreateCommandTemplateRequest | UpdateCommandTemplateRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Базовая валидация
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.category || template.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (!template.command_schema || Object.keys(template.command_schema).length === 0) {
      errors.push('Command schema is required');
    }

    // Валидация схемы команды
    if (template.command_schema) {
      try {
        // Проверяем, что схема содержит обязательные поля
        const schema = template.command_schema;
        if (!schema.type) {
          errors.push('Command schema must have a type field');
        }
        if (!schema.properties) {
          errors.push('Command schema must have properties');
        }
      } catch (error) {
        errors.push('Invalid command schema format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Экспортируем singleton экземпляр сервиса
export const commandTemplatesSupabaseService = new CommandTemplatesSupabaseService();

// Экспорт для обратной совместимости
export const commandTemplatesSupabaseAPI = {
  list: (params?: ListCommandTemplatesParams) => commandTemplatesSupabaseService.list(params),
  get: (id: CommandTemplateId) => commandTemplatesSupabaseService.get(id),
  create: (data: CreateCommandTemplateRequest) => commandTemplatesSupabaseService.create(data),
  update: (id: CommandTemplateId, data: UpdateCommandTemplateRequest) => commandTemplatesSupabaseService.update(id, data),
  delete: (id: CommandTemplateId) => commandTemplatesSupabaseService.delete(id),
  getByCategory: (category: string) => commandTemplatesSupabaseService.getByCategory(category),
  getByEquipmentType: (type: string) => commandTemplatesSupabaseService.getByEquipmentType(type),
  clone: (id: CommandTemplateId, newName: string) => commandTemplatesSupabaseService.clone(id, newName),
  getSystemTemplates: () => commandTemplatesSupabaseService.getSystemTemplates(),
  getUserTemplates: () => commandTemplatesSupabaseService.getUserTemplates(),
  search: (query: string) => commandTemplatesSupabaseService.search(query),
  validate: (template: CreateCommandTemplateRequest | UpdateCommandTemplateRequest) => 
    commandTemplatesSupabaseService.validate(template)
};