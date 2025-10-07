import { ComponentTemplate, ComponentTemplateId } from '@/types/componentTemplate';
import { supabaseService as supabase } from './supabaseServiceClient';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Маппинг данных из Supabase в формат ComponentTemplate
const mapFromSupabase = (data: any): ComponentTemplate => ({
  id: data.id,
  name: data.name,
  code: data.technical_code,
  description: data.description || '',
  systemType: data.system_type,
  statusValues: data.default_params?.statusValues || ['OK', 'ERROR', 'OFFLINE'],
  isActive: data.is_active,
  created_at: data.created_at,
  updated_at: data.updated_at
});

// Маппинг данных в формат Supabase
const mapToSupabase = (data: Partial<ComponentTemplate>) => ({
  name: data.name,
  technical_code: data.code,
  description: data.description,
  system_type: data.systemType,
  default_params: {
    statusValues: data.statusValues,
    // Дополнительные параметры можно добавить здесь
  },
  is_active: data.isActive,
  updated_at: new Date().toISOString()
});

export const componentTemplatesAPI = {
  // Получить все шаблоны
  async list(): Promise<ComponentTemplate[]> {
    await delay(300);
    
    try {
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .order('name');

      if (error) {
        console.error('Ошибка получения шаблонов компонентов:', error);
        throw error;
      }

      const mappedData = (data || []).map(mapFromSupabase);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.list:', error);
      throw error;
    }
  },

  // Получить шаблон по ID
  async get(id: ComponentTemplateId): Promise<ComponentTemplate | null> {
    await delay(200);
    
    try {
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Не найден
        }
        throw error;
      }

      const mappedData = mapFromSupabase(data);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.get:', error);
      return null;
    }
  },

  // Создать новый шаблон
  async create(data: Omit<ComponentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ComponentTemplate> {
    console.log('➕ Creating component template:', data.name);
    await delay(500);
    
    try {
      // Проверяем уникальность кода
      const { data: existingData } = await supabase
        .from('equipment_templates')
        .select('id')
        .eq('technical_code', data.code)
        .single();

      if (existingData) {
        throw new Error('Component template with this code already exists');
      }

      const supabaseData = mapToSupabase(data);
      const { data: insertedData, error } = await supabase
        .from('equipment_templates')
        .insert([supabaseData])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const mappedData = mapFromSupabase(insertedData);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.create:', error);
      throw error;
    }
  },

  // Обновить шаблон
  async update(id: ComponentTemplateId, data: Partial<Omit<ComponentTemplate, 'id' | 'created_at'>>): Promise<ComponentTemplate | null> {
    await delay(250);
    
    try {
      // Проверяем уникальность кода при обновлении
      if (data.code) {
        const { data: existingData } = await supabase
          .from('equipment_templates')
          .select('id')
          .eq('technical_code', data.code)
          .neq('id', id)
          .single();

        if (existingData) {
          throw new Error('Component template with this code already exists');
        }
      }

      const supabaseData = mapToSupabase(data);
      const { data: updatedData, error } = await supabase
        .from('equipment_templates')
        .update(supabaseData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const mappedData = mapFromSupabase(updatedData);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.update:', error);
      throw error;
    }
  },

  // Удалить шаблон
  async delete(id: ComponentTemplateId): Promise<boolean> {
    await delay(200);
    
    try {
      const { error } = await supabase
        .from('equipment_templates')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.delete:', error);
      throw error;
    }
  },

  // Получить активные шаблоны
  async getActive(): Promise<ComponentTemplate[]> {
    await delay(150);
    
    try {
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      const mappedData = (data || []).map(mapFromSupabase);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.getActive:', error);
      throw error;
    }
  },

  // Поиск шаблонов
  async search(query: string): Promise<ComponentTemplate[]> {
    await delay(200);
    
    if (!query.trim()) {
      return this.list();
    }
    
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .or(`name.ilike.${searchTerm},technical_code.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .order('name');

      if (error) {
        throw error;
      }

      const mappedData = (data || []).map(mapFromSupabase);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в componentTemplatesAPI.search:', error);
      throw error;
    }
  }
};

// Экспорт основного API
export const currentComponentTemplatesAPI = componentTemplatesAPI;