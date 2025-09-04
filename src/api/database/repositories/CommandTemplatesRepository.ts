/**
 * Repository для работы с шаблонами команд
 */

import { supabaseService as supabase } from '../../services/supabaseServiceClient';

export class CommandTemplatesRepository {
  /**
   * Получить список классических шаблонов команд
   */
  async list(filters: {
    category?: string;
    status?: string;
    search?: string;
    is_system?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      let query = supabase
        .from('command_templates')
        .select('*', { count: 'exact' });

      // Применяем фильтры
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.is_system !== undefined) {
        query = query.eq('is_system', filters.is_system);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Пагинация
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch command templates: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        has_more: ((page * limit) < (count || 0))
      };
    } catch (error) {
      console.error('CommandTemplatesRepository.list error:', error);
      throw error;
    }
  }

  /**
   * Получить шаблон команды по ID
   */
  async findById(id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('command_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch command template: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('CommandTemplatesRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Создать новый шаблон команды
   */
  async create(data: any, userId?: string): Promise<any> {
    try {
      const templateData = {
        ...data,
        created_by: userId,
        updated_by: userId
      };

      const { data: newTemplate, error } = await supabase
        .from('command_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create command template: ${error.message}`);
      }

      return newTemplate;
    } catch (error) {
      console.error('CommandTemplatesRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Обновить шаблон команды
   */
  async update(id: string, data: any, userId?: string): Promise<any> {
    try {
      const updateData = {
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data: updatedTemplate, error } = await supabase
        .from('command_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update command template: ${error.message}`);
      }

      return updatedTemplate;
    } catch (error) {
      console.error('CommandTemplatesRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Удалить шаблон команды
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('command_templates')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete command template: ${error.message}`);
      }
    } catch (error) {
      console.error('CommandTemplatesRepository.delete error:', error);
      throw error;
    }
  }
}

export class ApiTemplatesRepository {
  /**
   * Получить список шаблонов API команд
   */
  async list(filters: {
    scope?: string;
    mode?: string;
    status?: string;
    http_method?: string;
    search?: string;
    is_system?: boolean;
    tags?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      let query = supabase
        .from('api_templates')
        .select('*', { count: 'exact' });

      // Применяем фильтры
      if (filters.scope) {
        query = query.eq('scope', filters.scope);
      }
      if (filters.mode) {
        query = query.eq('mode', filters.mode);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.http_method) {
        query = query.eq('http_method', filters.http_method);
      }
      if (filters.is_system !== undefined) {
        query = query.eq('is_system', filters.is_system);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.tags) {
        query = query.contains('tags', [filters.tags]);
      }

      // Пагинация
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch API templates: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        has_more: ((page * limit) < (count || 0))
      };
    } catch (error) {
      console.error('ApiTemplatesRepository.list error:', error);
      throw error;
    }
  }

  /**
   * Получить шаблон API команды по ID
   */
  async findById(id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('api_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch API template: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ApiTemplatesRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Создать новый шаблон API команды
   */
  async create(data: any, userId?: string): Promise<any> {
    try {
      const templateData = {
        ...data,
        created_by: userId,
        updated_by: userId
      };

      const { data: newTemplate, error } = await supabase
        .from('api_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create API template: ${error.message}`);
      }

      return newTemplate;
    } catch (error) {
      console.error('ApiTemplatesRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Обновить шаблон API команды
   */
  async update(id: string, data: any, userId?: string): Promise<any> {
    try {
      const updateData = {
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data: updatedTemplate, error } = await supabase
        .from('api_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update API template: ${error.message}`);
      }

      return updatedTemplate;
    } catch (error) {
      console.error('ApiTemplatesRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Удалить шаблон API команды
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_templates')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete API template: ${error.message}`);
      }
    } catch (error) {
      console.error('ApiTemplatesRepository.delete error:', error);
      throw error;
    }
  }
}

// Создаем инстансы репозиториев
export const commandTemplatesRepository = new CommandTemplatesRepository();
export const apiTemplatesRepository = new ApiTemplatesRepository();