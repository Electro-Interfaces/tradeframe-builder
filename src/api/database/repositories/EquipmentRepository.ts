/**
 * Equipment Repository
 * Handles all database operations for equipment management
 */

import { supabase } from '@/services/supabaseClient';
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

export class EquipmentRepository {
  // ================================================
  // EQUIPMENT TEMPLATES
  // ================================================

  async getTemplates(): Promise<EquipmentTemplate[]> {
    const { data, error } = await supabase
      .from('equipment_templates')
      .select('*')
      .eq('status', true)
      .order('name');

    if (error) {
      console.error('Error fetching equipment templates:', error);
      throw new Error(`Failed to fetch equipment templates: ${error.message}`);
    }

    return data || [];
  }

  async getTemplateById(id: string): Promise<EquipmentTemplate | null> {
    const { data, error } = await supabase
      .from('equipment_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching equipment template:', error);
      throw new Error(`Failed to fetch equipment template: ${error.message}`);
    }

    return data;
  }

  // ================================================
  // EQUIPMENT CRUD
  // ================================================

  async list(params: ListEquipmentParams, userNetworkId?: string): Promise<ListEquipmentResponse> {
    let query = supabase
      .from('equipment')
      .select(`
        *,
        template:equipment_templates(name, display_name, system_type),
        trading_point:trading_points(name, network_id)
      `)
      .eq('trading_point_id', params.trading_point_id);

    // Network access control
    if (userNetworkId) {
      query = query.eq('trading_point.network_id', userNetworkId);
    }

    // Apply filters
    if (params.search) {
      query = query.or(`display_name.ilike.%${params.search}%,serial_number.ilike.%${params.search}%,external_id.ilike.%${params.search}%`);
    }

    if (params.system_type) {
      query = query.eq('system_type', params.system_type);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.template_id) {
      query = query.eq('template_id', params.template_id);
    }

    // Exclude soft-deleted items
    query = query.is('deleted_at', null);

    // Pagination
    const limit = params.limit || 50;
    const offset = ((params.page || 1) - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Sorting
    query = query.order('display_name');

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing equipment:', error);
      throw new Error(`Failed to list equipment: ${error.message}`);
    }

    const total = count || 0;
    const currentPage = params.page || 1;
    const hasMore = offset + limit < total;

    return {
      data: data || [],
      total,
      page: currentPage,
      limit,
      has_more: hasMore
    };
  }

  async getById(id: string, userNetworkId?: string): Promise<Equipment | null> {
    let query = supabase
      .from('equipment')
      .select(`
        *,
        template:equipment_templates(name, display_name, system_type),
        trading_point:trading_points(name, network_id)
      `)
      .eq('id', id)
      .is('deleted_at', null);

    // Network access control
    if (userNetworkId) {
      query = query.eq('trading_point.network_id', userNetworkId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching equipment by ID:', error);
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    return data;
  }

  async create(data: CreateEquipmentRequest, userId?: string): Promise<Equipment> {
    // First, get the template to copy default parameters
    const template = await this.getTemplateById(data.template_id);
    if (!template) {
      throw new Error('Equipment template not found');
    }

    // Merge template default params with custom params
    const mergedParams = {
      ...template.default_params,
      ...data.custom_params
    };

    const equipmentData = {
      trading_point_id: data.trading_point_id,
      template_id: data.template_id,
      name: template.name,
      display_name: data.display_name,
      system_type: template.system_type,
      serial_number: data.serial_number,
      external_id: data.external_id,
      installation_date: data.installation_date,
      params: mergedParams,
      bindings: data.bindings,
      available_command_ids: template.available_command_ids || [],
      status: 'offline', // New equipment starts as offline
      created_from_template: data.template_id,
      created_by: userId,
      updated_by: userId
    };

    const { data: newEquipment, error } = await supabase
      .from('equipment')
      .insert([equipmentData])
      .select(`
        *,
        template:equipment_templates(name, display_name, system_type)
      `)
      .single();

    if (error) {
      console.error('Error creating equipment:', error);
      throw new Error(`Failed to create equipment: ${error.message}`);
    }

    return newEquipment;
  }

  async update(id: string, data: UpdateEquipmentRequest, userNetworkId?: string, userId?: string): Promise<Equipment | null> {
    // First check if equipment exists and user has access
    const existing = await this.getById(id, userNetworkId);
    if (!existing) {
      return null;
    }

    const updateData = {
      ...data,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEquipment, error } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        template:equipment_templates(name, display_name, system_type)
      `)
      .single();

    if (error) {
      console.error('Error updating equipment:', error);
      throw new Error(`Failed to update equipment: ${error.message}`);
    }

    return updatedEquipment;
  }

  async setStatus(id: string, action: EquipmentStatusAction, userNetworkId?: string, userId?: string): Promise<boolean> {
    // First check if equipment exists and user has access
    const existing = await this.getById(id, userNetworkId);
    if (!existing) {
      return false;
    }

    let newStatus: string;
    let deletedAt: string | null = null;

    switch (action) {
      case 'enable':
        newStatus = 'online';
        break;
      case 'disable':
        newStatus = 'disabled';
        break;
      case 'archive':
        newStatus = 'archived';
        deletedAt = new Date().toISOString();
        break;
      default:
        throw new Error(`Invalid status action: ${action}`);
    }

    const updateData = {
      status: newStatus,
      deleted_at: deletedAt,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating equipment status:', error);
      throw new Error(`Failed to update equipment status: ${error.message}`);
    }

    return true;
  }

  async delete(id: string, userNetworkId?: string, userId?: string): Promise<boolean> {
    // First check if equipment exists and user has access
    const existing = await this.getById(id, userNetworkId);
    if (!existing) {
      return false;
    }

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting equipment:', error);
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }

    return true;
  }

  // ================================================
  // EQUIPMENT EVENTS
  // ================================================

  async getEvents(equipmentId: string, userNetworkId?: string, options?: { page?: number; limit?: number }): Promise<EquipmentEvent[]> {
    // First check if user has access to this equipment
    if (userNetworkId) {
      const equipment = await this.getById(equipmentId, userNetworkId);
      if (!equipment) {
        throw new Error('Equipment not found or access denied');
      }
    }

    let query = supabase
      .from('equipment_events')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('timestamp', { ascending: false });

    // Pagination
    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching equipment events:', error);
      throw new Error(`Failed to fetch equipment events: ${error.message}`);
    }

    return data || [];
  }

  // ================================================
  // EQUIPMENT COMPONENTS
  // ================================================

  async getComponents(equipmentId: string, userNetworkId?: string) {
    // First check if user has access to this equipment
    if (userNetworkId) {
      const equipment = await this.getById(equipmentId, userNetworkId);
      if (!equipment) {
        throw new Error('Equipment not found or access denied');
      }
    }

    const { data, error } = await supabase
      .from('equipment_components')
      .select(`
        *,
        template:component_templates(name, display_name)
      `)
      .eq('equipment_id', equipmentId)
      .order('display_name');

    if (error) {
      console.error('Error fetching equipment components:', error);
      throw new Error(`Failed to fetch equipment components: ${error.message}`);
    }

    return data || [];
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  async checkTradingPointAccess(tradingPointId: string, userNetworkId?: string): Promise<boolean> {
    if (!userNetworkId) return true; // Admin access

    const { data, error } = await supabase
      .from('trading_points')
      .select('network_id')
      .eq('id', tradingPointId)
      .single();

    if (error) {
      console.error('Error checking trading point access:', error);
      return false;
    }

    return data?.network_id === userNetworkId;
  }

  async getEquipmentByTradingPoint(tradingPointId: string, userNetworkId?: string): Promise<Equipment[]> {
    const result = await this.list({
      trading_point_id: tradingPointId,
      limit: 1000 // Get all equipment for the trading point
    }, userNetworkId);

    return result.data;
  }

  async getEquipmentBySystemType(systemType: string, userNetworkId?: string): Promise<Equipment[]> {
    let query = supabase
      .from('equipment')
      .select(`
        *,
        template:equipment_templates(name, display_name),
        trading_point:trading_points(name, network_id)
      `)
      .eq('system_type', systemType)
      .is('deleted_at', null);

    // Network access control
    if (userNetworkId) {
      query = query.eq('trading_point.network_id', userNetworkId);
    }

    const { data, error } = await query.order('display_name');

    if (error) {
      console.error('Error fetching equipment by system type:', error);
      throw new Error(`Failed to fetch equipment by system type: ${error.message}`);
    }

    return data || [];
  }

  // ================================================
  // HEALTH CHECK METHODS
  // ================================================

  async getHealthStatus(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('equipment')
        .select('count()')
        .limit(1);

      if (error) {
        throw error;
      }

      // Get some basic statistics
      const stats = await this.getStatistics();

      return {
        healthy: true,
        details: {
          message: 'Equipment repository is healthy',
          statistics: stats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          message: 'Equipment repository is unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async getStatistics() {
    const [equipmentCount, templatesCount, eventsCount] = await Promise.allSettled([
      supabase.from('equipment').select('count()').is('deleted_at', null),
      supabase.from('equipment_templates').select('count()').eq('status', true),
      supabase.from('equipment_events').select('count()')
    ]);

    return {
      equipmentCount: equipmentCount.status === 'fulfilled' ? equipmentCount.value.data?.[0]?.count : 0,
      templatesCount: templatesCount.status === 'fulfilled' ? templatesCount.value.data?.[0]?.count : 0,
      eventsCount: eventsCount.status === 'fulfilled' ? eventsCount.value.data?.[0]?.count : 0
    };
  }
}