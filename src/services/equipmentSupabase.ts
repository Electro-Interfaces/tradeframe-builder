/**
 * Equipment Service - Supabase Integration
 * Использует Service Role Key для полного доступа к базе данных
 * Исправлена схема: is_active вместо status, правильные UUID
 */

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

import { supabaseService as supabase } from './supabaseServiceClient';

// Утилита для генерации UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Equipment Templates API - Supabase
 */
export const supabaseEquipmentTemplatesAPI = {
  /**
   * Получить список шаблонов оборудования
   */
  async list(): Promise<EquipmentTemplate[]> {
    const { data, error } = await supabase
      .from('equipment_templates')
      .select('*');

    if (error) {
      console.error('❌ Equipment templates list error:', error);
      throw new Error(`Failed to fetch equipment templates: ${error.message}`);
    }

    // Маппинг данных из Supabase в формат приложения
    const templates = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      system_type: item.system_type,
      technical_code: item.technical_code,
      status: item.is_active ?? true, // ✅ Исправлено: is_active -> status
      description: item.description || '',
      default_params: item.default_params || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      allow_component_template_ids: item.allow_component_template_ids || []
    })) as EquipmentTemplate[];

    return templates;
  },

  /**
   * Получить шаблон по ID
   */
  async get(id: string): Promise<EquipmentTemplate> {
    const { data, error } = await supabase
      .from('equipment_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`❌ Equipment template get error (${id}):`, error);
      throw new Error(`Failed to fetch equipment template: ${error.message}`);
    }

    const item = data;
    if (!item) {
      throw new Error(`Equipment template not found: ${id}`);
    }

    // Маппинг данных из Supabase в формат приложения
    const template: EquipmentTemplate = {
      id: item.id,
      name: item.name,
      system_type: item.system_type,
      technical_code: item.technical_code,
      status: item.is_active ?? true, // ✅ Исправлено: is_active -> status
      description: item.description || '',
      default_params: item.default_params || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      allow_component_template_ids: item.allow_component_template_ids || []
    };

    console.log(`✅ Loaded equipment template: ${template.name}`);
    return template;
  },

  /**
   * Создать новый шаблон оборудования
   */
  async create(data: Omit<EquipmentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EquipmentTemplate> {
    const id = generateUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      name: data.name,
      system_type: data.system_type,
      technical_code: data.technical_code,
      is_active: data.status ?? true, // ✅ Исправлено: status -> is_active
      description: data.description || '',
      default_params: data.default_params || {},
      allow_component_template_ids: data.allow_component_template_ids || null,
      created_at: now,
      updated_at: now
    };

    console.log('🔧 Creating equipment template:', payload);

    const result = await supabase.insert('equipment_templates', payload);

    if (result.error) {
      console.error('❌ Equipment template create error:', result.error);
      throw new Error(`Failed to create equipment template: ${result.error}`);
    }

    const created = result.data?.[0];
    if (!created) {
      throw new Error('Equipment template creation failed - no data returned');
    }

    console.log('✅ Equipment template created:', created.name);
    return this.get(id);
  },

  /**
   * Обновить шаблон оборудования
   */
  async update(id: string, data: Partial<Omit<EquipmentTemplate, 'id' | 'created_at'>>): Promise<EquipmentTemplate> {
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Маппинг полей
    if (data.name) payload.name = data.name;
    if (data.system_type) payload.system_type = data.system_type;
    if (data.technical_code) payload.technical_code = data.technical_code;
    if (data.status !== undefined) payload.is_active = data.status; // ✅ Исправлено
    if (data.description !== undefined) payload.description = data.description;
    if (data.default_params) payload.default_params = data.default_params;
    if (data.allow_component_template_ids !== undefined) {
      payload.allow_component_template_ids = data.allow_component_template_ids;
    }

    console.log('🔧 Updating equipment template:', id, payload);

    const result = await supabase.update('equipment_templates', payload, { id });

    if (result.error) {
      console.error(`❌ Equipment template update error (${id}):`, result.error);
      throw new Error(`Failed to update equipment template: ${result.error}`);
    }

    console.log('✅ Equipment template updated:', id);
    return this.get(id);
  },

  /**
   * Удалить шаблон оборудования
   */
  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting equipment template:', id);

    const result = await supabase.delete('equipment_templates', { id });

    if (result.error) {
      console.error(`❌ Equipment template delete error (${id}):`, result.error);
      throw new Error(`Failed to delete equipment template: ${result.error}`);
    }

    console.log('✅ Equipment template deleted:', id);
  }
};

/**
 * Equipment API - Supabase 
 */
export const supabaseEquipmentAPI = {
  /**
   * Получить список оборудования
   */
  async list(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
    console.log('🔍 Fetching equipment list with params:', params);

    const options: any = {
      select: '*'
    };

    // Добавляем фильтры
    if (params.trading_point_id) {
      options.eq = { ...options.eq, trading_point_id: params.trading_point_id };
    }

    // Лимиты и пагинация
    if (params.limit) {
      options.limit = params.limit;
    }
    if (params.offset) {
      options.offset = params.offset;
    }

    let query = supabase.from('equipment').select('*');
    
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('❌ Equipment list error:', error);
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    // Маппинг данных
    const items = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      template_id: item.template_id,
      trading_point_id: item.trading_point_id,
      status: item.is_active ? 'active' : 'inactive', // ✅ Исправлено
      config: item.config || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      description: item.description || ''
    })) as Equipment[];

    // Фильтрация по статусу если нужно
    let filteredItems = items;
    if (params.status) {
      filteredItems = items.filter(item => item.status === params.status);
    }

    // Поиск по имени если нужно
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    console.log(`✅ Loaded ${filteredItems.length} equipment items`);

    return {
      items: filteredItems,
      total: filteredItems.length,
      hasMore: false // Пока что простая реализация без пагинации
    };
  },

  /**
   * Получить оборудование по ID
   */
  async get(id: string): Promise<Equipment> {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`❌ Equipment get error (${id}):`, error);
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    const item = data;
    if (!item) {
      throw new Error(`Equipment not found: ${id}`);
    }

    const equipment: Equipment = {
      id: item.id,
      name: item.name,
      template_id: item.template_id,
      trading_point_id: item.trading_point_id,
      status: item.is_active ? 'active' : 'inactive', // ✅ Исправлено
      config: item.config || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      description: item.description || ''
    };

    console.log(`✅ Loaded equipment: ${equipment.name}`);
    return equipment;
  },

  /**
   * Создать оборудование
   */
  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    const id = generateUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      name: data.name,
      template_id: data.template_id,
      trading_point_id: data.trading_point_id,
      is_active: true, // ✅ Исправлено: новое оборудование активно по умолчанию
      config: data.config || {},
      description: data.description || '',
      created_at: now,
      updated_at: now
    };

    console.log('🔧 Creating equipment:', payload);

    const result = await supabase.insert('equipment', payload);

    if (result.error) {
      console.error('❌ Equipment create error:', result.error);
      throw new Error(`Failed to create equipment: ${result.error}`);
    }

    console.log('✅ Equipment created:', data.name);
    return this.get(id);
  },

  /**
   * Обновить оборудование
   */
  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Маппинг полей
    if (data.name) payload.name = data.name;
    if (data.config) payload.config = data.config;
    if (data.description !== undefined) payload.description = data.description;

    console.log('🔧 Updating equipment:', id, payload);

    const result = await supabase.update('equipment', payload, { id });

    if (result.error) {
      console.error(`❌ Equipment update error (${id}):`, result.error);
      throw new Error(`Failed to update equipment: ${result.error}`);
    }

    console.log('✅ Equipment updated:', id);
    return this.get(id);
  },

  /**
   * Изменить статус оборудования
   */
  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    const is_active = action === 'enable';

    console.log(`🔧 Setting equipment status: ${id} -> ${action}`);

    const result = await supabase.update('equipment', 
      { 
        is_active, // ✅ Исправлено
        updated_at: new Date().toISOString()
      }, 
      { id }
    );

    if (result.error) {
      console.error(`❌ Equipment status update error (${id}):`, result.error);
      throw new Error(`Failed to update equipment status: ${result.error}`);
    }

    console.log(`✅ Equipment status updated: ${id} -> ${action}`);
  },

  /**
   * Получить события оборудования (заглушка)
   */
  async getEvents(id: string): Promise<EquipmentEvent[]> {
    console.log(`📋 Getting events for equipment: ${id}`);
    
    // В будущем здесь будет реальная логика получения событий
    // Пока возвращаем пустой массив
    return [];
  }
};

// Экспорт для использования в приложении
export const currentSupabaseEquipmentAPI = supabaseEquipmentAPI;
export const currentSupabaseEquipmentTemplatesAPI = supabaseEquipmentTemplatesAPI;