/**
 * Components Service - Прямое подключение к Supabase
 * Замена HTTP API версии для работы напрямую с базой данных
 */

import { 
  Component, 
  ComponentTemplate,
  CreateComponentRequest, 
  UpdateComponentRequest,
  ComponentFilters,
  ListComponentsParams,
  ListComponentsResponse,
  ComponentStatusAction,
  ComponentEvent
} from '@/types/component';
import { httpClient } from './universalHttpClient';

class ComponentsSupabaseService {
  private tableName = 'components';
  private templatesTableName = 'component_templates';
  private eventsTableName = 'component_events';

  /**
   * Получить список компонентов
   */
  async list(params?: ListComponentsParams): Promise<ListComponentsResponse> {
    try {
      // Строим параметры для REST API
      let selectParams = 'select=*';
      const filters = [];
      
      // Применяем фильтры
      if (params?.equipment_id) {
        filters.push(`equipment_id=eq.${params.equipment_id}`);
      }
      if (params?.trading_point_id) {
        filters.push(`trading_point_id=eq.${params.trading_point_id}`);
      }
      if (params?.status) {
        filters.push(`status=eq.${params.status}`);
      }
      if (params?.component_type) {
        filters.push(`component_type=eq.${params.component_type}`);
      }

      // Пагинация
      const limit = params?.limit || 100;
      const offset = ((params?.page || 1) - 1) * limit;
      filters.push(`limit=${limit}`);
      if (offset > 0) {
        filters.push(`offset=${offset}`);
      }

      // Сортировка
      filters.push(`order=created_at.desc`);

      const queryParams = [selectParams, ...filters].join('&');
      
      // Используем универсальный HTTP клиент
      const response = await httpClient.get(`/${this.tableName}?${queryParams}`, {
        destination: 'supabase'
      });

      if (!response.success) {
        const error = new Error(response.error || 'Failed to fetch components');
        console.error('❌ Failed to fetch components:', error);
        throw error;
      }

      const data = response.data || [];

      return {
        data: data,
        pagination: {
          page: params?.page || 1,
          limit,
          total: data.length,
          pages: Math.ceil(data.length / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error in components list:', error);
      throw error;
    }
  }

  /**
   * Получить компонент по ID
   */
  async get(id: string): Promise<Component> {
    try {
      const { data, error } = await supabaseService
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Failed to fetch component:', error);
        throw new Error(`Component not found: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching component:', error);
      throw error;
    }
  }

  /**
   * Создать новый компонент
   */
  async create(request: CreateComponentRequest): Promise<Component> {
    try {
      const newComponent = {
        ...request,
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseService
        .from(this.tableName)
        .insert([newComponent])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create component:', error);
        throw new Error(`Failed to create component: ${error.message}`);
      }

      // Записываем событие
      await this.recordEvent(data.id, 'created', {
        component_data: data
      });

      return data;
    } catch (error) {
      console.error('❌ Error creating component:', error);
      throw error;
    }
  }

  /**
   * Обновить компонент
   */
  async update(id: string, request: UpdateComponentRequest): Promise<Component> {
    try {
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
        console.error('❌ Failed to update component:', error);
        throw new Error(`Failed to update component: ${error.message}`);
      }

      // Записываем событие
      await this.recordEvent(id, 'updated', {
        changes: request
      });

      return data;
    } catch (error) {
      console.error('❌ Error updating component:', error);
      throw error;
    }
  }

  /**
   * Удалить компонент
   */
  async delete(id: string): Promise<void> {
    try {
      // Сначала получаем компонент для логирования
      const component = await this.get(id);

      const { error } = await supabaseService
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete component:', error);
        throw new Error(`Failed to delete component: ${error.message}`);
      }

      // Записываем событие
      await this.recordEvent(id, 'deleted', {
        deleted_component: component
      });

    } catch (error) {
      console.error('❌ Error deleting component:', error);
      throw error;
    }
  }

  /**
   * Изменить статус компонента
   */
  async changeStatus(id: string, action: ComponentStatusAction): Promise<Component> {
    try {
      const statusMap = {
        activate: 'active',
        deactivate: 'inactive',
        suspend: 'suspended',
        restore: 'active'
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        throw new Error(`Invalid status action: ${action}`);
      }

      const { data, error } = await supabaseService
        .from(this.tableName)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to change component status:', error);
        throw new Error(`Failed to change status: ${error.message}`);
      }

      // Записываем событие
      await this.recordEvent(id, action, {
        old_status: data.status,
        new_status: newStatus
      });

      return data;
    } catch (error) {
      console.error('❌ Error changing component status:', error);
      throw error;
    }
  }

  /**
   * Получить события компонента
   */
  async getEvents(id: string, limit: number = 10): Promise<ComponentEvent[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.eventsTableName)
        .select('*')
        .eq('component_id', id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch component events:', error);
        throw new Error(`Failed to fetch events: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching component events:', error);
      throw error;
    }
  }

  /**
   * Записать событие компонента
   */
  private async recordEvent(
    componentId: string, 
    eventType: string, 
    details?: any
  ): Promise<void> {
    try {
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        component_id: componentId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        details: details || {}
      };

      const { error } = await supabaseService
        .from(this.eventsTableName)
        .insert([event]);

      if (error) {
        console.error('⚠️ Failed to record component event:', error);
        // Не прерываем основную операцию при ошибке записи события
      }
    } catch (error) {
      console.error('⚠️ Error recording component event:', error);
      // Не прерываем основную операцию при ошибке записи события
    }
  }

  /**
   * Получить шаблоны компонентов
   */
  async getTemplates(): Promise<ComponentTemplate[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.templatesTableName)
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Failed to fetch component templates:', error);
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching component templates:', error);
      throw error;
    }
  }

  /**
   * Получить шаблон по ID
   */
  async getTemplate(id: string): Promise<ComponentTemplate> {
    try {
      const { data, error } = await supabaseService
        .from(this.templatesTableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Failed to fetch component template:', error);
        throw new Error(`Template not found: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching component template:', error);
      throw error;
    }
  }

  /**
   * Создать компоненты из шаблона
   */
  async createFromTemplate(
    templateId: string, 
    equipmentId: string,
    tradingPointId: string
  ): Promise<Component[]> {
    try {
      const template = await this.getTemplate(templateId);
      
      const components: Component[] = [];
      
      // Создаем компоненты согласно шаблону
      for (const componentDef of template.components || []) {
        const component = await this.create({
          equipment_id: equipmentId,
          trading_point_id: tradingPointId,
          name: componentDef.name,
          display_name: componentDef.display_name || componentDef.name,
          component_type: componentDef.type,
          system_type: template.system_type,
          metadata: {
            ...componentDef.metadata,
            template_id: templateId,
            template_name: template.name
          }
        });
        components.push(component);
      }

      return components;
    } catch (error) {
      console.error('❌ Error creating components from template:', error);
      throw error;
    }
  }
}

// Экспортируем singleton экземпляр сервиса
export const componentsSupabaseService = new ComponentsSupabaseService();

// Экспорт для обратной совместимости
export const componentsSupabaseAPI = {
  list: (params?: ListComponentsParams) => componentsSupabaseService.list(params),
  get: (id: string) => componentsSupabaseService.get(id),
  create: (data: CreateComponentRequest) => componentsSupabaseService.create(data),
  update: (id: string, data: UpdateComponentRequest) => componentsSupabaseService.update(id, data),
  delete: (id: string) => componentsSupabaseService.delete(id),
  changeStatus: (id: string, action: ComponentStatusAction) => componentsSupabaseService.changeStatus(id, action),
  getEvents: (id: string, limit?: number) => componentsSupabaseService.getEvents(id, limit),
  getTemplates: () => componentsSupabaseService.getTemplates(),
  getTemplate: (id: string) => componentsSupabaseService.getTemplate(id),
  createFromTemplate: (templateId: string, equipmentId: string, tradingPointId: string) => 
    componentsSupabaseService.createFromTemplate(templateId, equipmentId, tradingPointId)
};