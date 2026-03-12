// Сервис для работы с шаблонами оборудования из БД
// Обеспечивает связь между разделом "Типы оборудования" и страницей "Оборудование"

import { supabaseService as supabase } from './supabaseServiceClient'

export interface EquipmentType {
  id: string;
  name: string;
  code: string;
  description?: string;
  systemType: string;
  isActive: boolean;
  availableCommandIds?: string[];
  defaultParams?: Record<string, any>;
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  technical_code: string;
  system_type: string;
  status: boolean;
  description?: string;
  default_params?: Record<string, any>;
  allow_component_template_ids?: string[];
  created_at: string;
  updated_at: string;
}

// Конвертер из EquipmentTemplate (БД) в EquipmentType (legacy интерфейс)
function convertFromEquipmentTemplate(template: EquipmentTemplate): EquipmentType {
  return {
    id: template.id,
    name: template.name,
    code: template.technical_code,
    description: template.description,
    systemType: template.system_type,
    isActive: template.status,
    availableCommandIds: template.allow_component_template_ids || [],
    defaultParams: template.default_params || {}
  };
}

// Функции для работы с БД
async function getEquipmentTemplatesFromDB(): Promise<EquipmentTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_templates')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching equipment templates:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching equipment templates from DB:', error)
    return []
  }
}


// API для получения типов оборудования (из таблицы equipment_templates)
export const equipmentTypesAPI = {
  async list(): Promise<EquipmentType[]> {
    try {
      const templates = await getEquipmentTemplatesFromDB()
      const activeTemplates = templates
      const convertedTypes = activeTemplates.map(convertFromEquipmentTemplate)
      return convertedTypes
    } catch (error) {
      console.error('❌ Error in equipmentTypesAPI.list():', error)
      return []
    }
  },

  async get(id: string): Promise<EquipmentType | null> {
    try {
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error || !data) {
        console.error('Error fetching equipment template by id:', error)
        return null
      }
      
      return convertFromEquipmentTemplate(data)
    } catch (error) {
      console.error('Error in equipmentTypesAPI.get():', error)
      return null
    }
  },

  async create(type: Omit<EquipmentType, 'id'>): Promise<EquipmentType> {
    try {
      const templateData = {
        name: type.name,
        technical_code: type.code,
        system_type: type.systemType,
        description: type.description || null,
        status: type.isActive,
        default_params: type.defaultParams || {},
        allow_component_template_ids: type.availableCommandIds || []
      }
      
      const { data, error } = await supabase
        .from('equipment_templates')
        .insert([templateData])
        .select()
        .single()
      
      if (error || !data) {
        console.error('Error creating equipment template:', error)
        throw new Error('Failed to create equipment template')
      }
      
      return convertFromEquipmentTemplate(data)
    } catch (error) {
      console.error('Error in equipmentTypesAPI.create():', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<EquipmentType>): Promise<EquipmentType | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.code !== undefined) updateData.technical_code = updates.code
      if (updates.systemType !== undefined) updateData.system_type = updates.systemType
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.isActive !== undefined) updateData.status = updates.isActive
      if (updates.defaultParams !== undefined) updateData.default_params = updates.defaultParams
      if (updates.availableCommandIds !== undefined) updateData.allow_component_template_ids = updates.availableCommandIds
      
      const { data, error } = await supabase
        .from('equipment_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error || !data) {
        console.error('Error updating equipment template:', error)
        return null
      }
      
      return convertFromEquipmentTemplate(data)
    } catch (error) {
      console.error('Error in equipmentTypesAPI.update():', error)
      return null
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('equipment_templates')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting equipment template:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in equipmentTypesAPI.delete():', error)
      return false
    }
  }
};

// API для получения шаблонов оборудования напрямую из БД
export const equipmentTemplatesFromTypesAPI = {
  async list(): Promise<EquipmentTemplate[]> {
    try {
      const templates = await getEquipmentTemplatesFromDB()
      return templates
    } catch (error) {
      console.error('Error in equipmentTemplatesFromTypesAPI.list():', error)
      return []
    }
  },

  async get(id: string): Promise<EquipmentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('equipment_templates')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error || !data) {
        console.error('Error fetching equipment template by id:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in equipmentTemplatesFromTypesAPI.get():', error)
      return null
    }
  }
};