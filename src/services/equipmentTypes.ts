// Сервис для работы с шаблонами оборудования через backend API

import { adminApiRequest } from './adminApiClient'

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

export const equipmentTypesAPI = {
  async list(): Promise<EquipmentType[]> {
    try {
      const templates: EquipmentTemplate[] = await adminApiRequest('/equipment-templates');
      return (templates || []).map(convertFromEquipmentTemplate);
    } catch (error) {
      console.error('Error in equipmentTypesAPI.list():', error);
      return [];
    }
  },

  async get(id: string): Promise<EquipmentType | null> {
    try {
      const template: EquipmentTemplate = await adminApiRequest(`/equipment-templates/${id}`);
      return template ? convertFromEquipmentTemplate(template) : null;
    } catch (error) {
      console.error('Error in equipmentTypesAPI.get():', error);
      return null;
    }
  },

  async create(type: Omit<EquipmentType, 'id'>): Promise<EquipmentType> {
    const template = await adminApiRequest('/equipment-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: type.name,
        technical_code: type.code,
        system_type: type.systemType,
        description: type.description || null,
        status: type.isActive,
        default_params: type.defaultParams || {},
        allow_component_template_ids: type.availableCommandIds || []
      }),
    });
    return convertFromEquipmentTemplate(template);
  },

  async update(id: string, updates: Partial<EquipmentType>): Promise<EquipmentType | null> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.code !== undefined) updateData.technical_code = updates.code;
      if (updates.systemType !== undefined) updateData.system_type = updates.systemType;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.status = updates.isActive;
      if (updates.defaultParams !== undefined) updateData.default_params = updates.defaultParams;
      if (updates.availableCommandIds !== undefined) updateData.allow_component_template_ids = updates.availableCommandIds;

      const template = await adminApiRequest(`/equipment-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return template ? convertFromEquipmentTemplate(template) : null;
    } catch (error) {
      console.error('Error in equipmentTypesAPI.update():', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await adminApiRequest(`/equipment-templates/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error in equipmentTypesAPI.delete():', error);
      return false;
    }
  }
};

export const equipmentTemplatesFromTypesAPI = {
  async list(): Promise<EquipmentTemplate[]> {
    try {
      return await adminApiRequest('/equipment-templates') || [];
    } catch (error) {
      console.error('Error in equipmentTemplatesFromTypesAPI.list():', error);
      return [];
    }
  },

  async get(id: string): Promise<EquipmentTemplate | null> {
    try {
      return await adminApiRequest(`/equipment-templates/${id}`);
    } catch (error) {
      console.error('Error in equipmentTemplatesFromTypesAPI.get():', error);
      return null;
    }
  }
};
