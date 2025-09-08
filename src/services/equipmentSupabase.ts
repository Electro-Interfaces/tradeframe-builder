/**
 * Equipment Service - Supabase Integration
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией из раздела "Обмен данными"
 * Использует SupabaseConnectionHelper для проверки подключений
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

// НОВОЕ: Используем специализированный клиент для базы данных Supabase
import { supabaseDatabaseClient } from './supabaseDatabaseClient';
import { SupabaseConnectionHelper, executeSupabaseOperation } from './supabaseConnectionHelper';

// Утилита для генерации UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Equipment Templates API - Supabase с централизованной конфигурацией
 */
export const supabaseEquipmentTemplatesAPI = {
  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    await SupabaseConnectionHelper.initialize();
  },

  /**
   * Получить список шаблонов оборудования
   */
  async list(): Promise<EquipmentTemplate[]> {
    const response = await supabaseDatabaseClient.get('/rest/v1/equipment_templates', {
      queryParams: { select: '*' }
    });

    if (!response.success) {
      const error = new Error(response.error || 'Failed to fetch equipment templates');
      console.error('❌ Equipment templates list error:', error);
      throw error;
    }

    const data = response.data || [];
    
    // Маппинг данных из Supabase в формат приложения
    const templates = data.map(item => ({
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

    console.log(`✅ Loaded ${templates.length} equipment templates from Supabase`);
    return templates;
  },

  /**
   * Получить шаблон по ID
   */
  async get(id: string): Promise<EquipmentTemplate> {
    const response = await supabaseDatabaseClient.get('/rest/v1/equipment_templates', {
      queryParams: { 
        select: '*',
        id: `eq.${id}`
      }
    });

    if (!response.success) {
      const error = new Error(response.error || `Failed to fetch equipment template: ${id}`);
      console.error(`❌ Equipment template get error (${id}):`, error);
      throw error;
    }

    const data = response.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`Equipment template not found: ${id}`);
    }

    const item = data[0];
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

    const response = await supabaseDatabaseClient.post('/rest/v1/equipment_templates', payload);

    if (!response.success) {
      console.error('❌ Equipment template create error:', response.error);
      throw new Error(`Failed to create equipment template: ${response.error}`);
    }

    if (!response.data) {
      throw new Error('Equipment template creation failed - no data returned');
    }

    console.log('✅ Equipment template created:', payload.name);
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

    const response = await supabaseDatabaseClient.patch(`/rest/v1/equipment_templates?id=eq.${id}`, payload);

    if (!response.success) {
      console.error(`❌ Equipment template update error (${id}):`, response.error);
      throw new Error(`Failed to update equipment template: ${response.error}`);
    }

    console.log('✅ Equipment template updated:', id);
    return this.get(id);
  },

  /**
   * Удалить шаблон оборудования
   */
  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting equipment template:', id);

    const response = await supabaseDatabaseClient.delete(`/rest/v1/equipment_templates?id=eq.${id}`);

    if (!response.success) {
      console.error(`❌ Equipment template delete error (${id}):`, response.error);
      throw new Error(`Failed to delete equipment template: ${response.error}`);
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

    // Используем специализированный метод для получения оборудования
    const dbFilters: Record<string, any> = {};
    if (params.trading_point_id) {
      dbFilters.trading_point_id = params.trading_point_id;
    }
    if (params.system_type) {
      dbFilters.system_type = params.system_type;
    }
    if (params.template_id) {
      dbFilters.template_id = params.template_id;
    }
    
    const response = await supabaseDatabaseClient.getEquipment(dbFilters);

    if (!response.success) {
      const error = new Error(response.error || 'Failed to fetch equipment');
      console.error('❌ Equipment list error:', error);
      throw error;
    }

    const data = response.data;

    // Добавляем детальное логирование для отладки цен
    console.log(`🔍 [EQUIPMENT API] Raw query result:`, {
      count: data?.length || 0,
      params: params
    });
    
    if (data && data.length > 0) {
      console.log(`📋 [EQUIPMENT API] Первые 3 записи:`, data.slice(0, 3));
      // Показываем детали для резервуаров
      const tanks = data.filter(item => item.system_type === 'fuel_tank');
      console.log(`🛢️ [EQUIPMENT API] Найдено ${tanks.length} резервуаров для ТП ${params.trading_point_id}`);
      tanks.forEach((tank, i) => {
        console.log(`  Резервуар ${i + 1}: ${tank.name} | status=${tank.status} | fuel_type=${tank.params?.['Тип топлива'] || 'НЕТ'}`);
      });
    } else {
      console.warn(`⚠️ [EQUIPMENT API] Данные не найдены для параметров:`, params);
    }

    // Маппинг данных в правильном формате
    const items = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      system_type: item.system_type,
      template_id: item.template_id,
      trading_point_id: item.trading_point_id,
      display_name: item.display_name,
      serial_number: item.serial_number,
      external_id: item.external_id,
      status: item.status, // Используем status напрямую
      installation_date: item.installation_date,
      params: item.params || {},
      bindings: item.bindings || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      deleted_at: item.deleted_at,
      created_from_template: item.created_from_template
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
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.display_name && item.display_name.toLowerCase().includes(searchLower)) ||
        (item.serial_number && item.serial_number.toLowerCase().includes(searchLower))
      );
    }

    console.log(`✅ Loaded ${filteredItems.length} equipment items from Supabase`);

    return {
      data: filteredItems,
      total: filteredItems.length,
      page: params.page || 1,
      limit: params.limit || 50,
      has_more: false
    };
  },

  /**
   * Получить оборудование по ID
   */
  async get(id: string): Promise<Equipment> {
    const response = await supabaseDatabaseClient.get('/rest/v1/equipment', {
      queryParams: { 
        select: '*',
        id: `eq.${id}`
      }
    });

    if (!response.success) {
      console.error(`❌ Equipment get error (${id}):`, response.error);
      throw new Error(`Failed to fetch equipment: ${response.error}`);
    }

    const data = response.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`Equipment not found: ${id}`);
    }

    const item = data[0];
    if (!item) {
      throw new Error(`Equipment not found: ${id}`);
    }

    const equipment: Equipment = {
      id: item.id,
      name: item.name,
      system_type: item.system_type,
      template_id: item.template_id,
      trading_point_id: item.trading_point_id,
      display_name: item.display_name,
      serial_number: item.serial_number,
      external_id: item.external_id,
      status: item.status, // Используем status напрямую
      installation_date: item.installation_date,
      params: item.params || {},
      bindings: item.bindings || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      deleted_at: item.deleted_at,
      created_from_template: item.created_from_template
    };

    console.log(`✅ Loaded equipment: ${equipment.display_name || equipment.name}`);
    return equipment;
  },

  /**
   * Создать оборудование
   */
  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    const id = generateUUID();
    const now = new Date().toISOString();

    // Получаем данные шаблона
    let template: EquipmentTemplate | null = null;
    try {
      template = await supabaseEquipmentTemplatesAPI.get(data.template_id);
    } catch (error) {
      console.warn(`⚠️ Template not found: ${data.template_id}, creating equipment without template`);
    }

    // Объединяем параметры шаблона с кастомными параметрами
    const combinedParams = {
      ...(template?.default_params || {}),
      ...(data.custom_params || {})
    };

    const payload = {
      id,
      name: template?.name || data.display_name, // Используем имя шаблона или display_name
      system_type: template?.system_type || 'fuel_tank', // Используем тип из шаблона или fallback
      template_id: data.template_id,
      trading_point_id: data.trading_point_id,
      display_name: data.display_name,
      serial_number: data.serial_number,
      external_id: data.external_id,
      status: 'offline', // Новое оборудование начинает в статусе offline
      installation_date: data.installation_date || now,
      params: combinedParams,
      bindings: data.bindings || {},
      created_at: now,
      updated_at: now
    };

    console.log('🔧 Creating equipment:', payload);

    const response = await supabaseDatabaseClient.post('/rest/v1/equipment', payload);

    if (!response.success) {
      console.error('❌ Equipment create error:', response.error);
      throw new Error(`Failed to create equipment: ${response.error}`);
    }

    console.log('✅ Equipment created:', payload.display_name);
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
    if (data.display_name) payload.display_name = data.display_name;
    if (data.serial_number !== undefined) payload.serial_number = data.serial_number;
    if (data.external_id !== undefined) payload.external_id = data.external_id;
    if (data.params) payload.params = data.params;
    if (data.bindings) payload.bindings = data.bindings;
    if (data.installation_date) payload.installation_date = data.installation_date;

    console.log('🔧 Updating equipment:', id, payload);

    const response = await supabaseDatabaseClient.patch(`/rest/v1/equipment?id=eq.${id}`, payload);

    if (!response.success) {
      console.error(`❌ Equipment update error (${id}):`, response.error);
      throw new Error(`Failed to update equipment: ${response.error}`);
    }

    console.log('✅ Equipment updated:', id);
    return this.get(id);
  },

  /**
   * Изменить статус оборудования
   */
  async setStatus(id: string, action: EquipmentStatusAction): Promise<void> {
    let status: string;
    let deleted_at: string | null = null;

    switch (action) {
      case 'enable':
        status = 'online';
        break;
      case 'disable':
        status = 'disabled';
        break;
      case 'archive':
        status = 'archived';
        deleted_at = new Date().toISOString();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`🔧 Setting equipment status: ${id} -> ${action} (status: ${status})`);

    const response = await supabaseDatabaseClient.patch(`/rest/v1/equipment?id=eq.${id}`, {
      status,
      deleted_at,
      updated_at: new Date().toISOString()
    });

    if (!response.success) {
      console.error(`❌ Equipment status update error (${id}):`, response.error);
      throw new Error(`Failed to update equipment status: ${response.error}`);
    }

    console.log(`✅ Equipment status updated: ${id} -> ${action}`);
  },

  /**
   * Удалить оборудование
   */
  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting equipment:', id);

    const response = await supabaseDatabaseClient.delete(`/rest/v1/equipment?id=eq.${id}`);

    if (!response.success) {
      console.error(`❌ Equipment delete error (${id}):`, response.error);
      throw new Error(`Failed to delete equipment: ${response.error}`);
    }

    console.log('✅ Equipment deleted:', id);
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
export const equipmentSupabaseService = supabaseEquipmentAPI;
export const currentSupabaseEquipmentTemplatesAPI = supabaseEquipmentTemplatesAPI;