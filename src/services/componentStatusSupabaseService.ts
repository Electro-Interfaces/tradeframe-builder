/**
 * Component Status Supabase Service - Прямая работа с базой данных
 * Заменяет localStorage на реальные данные из Supabase
 */

import { supabaseClientBrowser } from './supabaseClientBrowser';
import { ComponentStatus } from '@/types/component';
import {
  ComponentStatusRecord,
  ComponentStatusInput,
  ComponentHealthMetrics
} from './componentStatusService';

// Интерфейс для работы с Supabase
interface SupabaseComponentStatus {
  id: string;
  component_id: string;
  equipment_id?: string;
  status: ComponentStatus;
  status_message?: string;
  last_online: string;
  last_offline?: string;
  uptime: number;
  downtime: number;
  error_count: number;
  last_error?: string;
  last_error_time?: string;
  response_time?: number;
  signal_strength?: number;
  temperature?: number;
  voltage?: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

class ComponentStatusSupabaseService {
  /**
   * Получить все статусы компонентов
   */
  async getAll(): Promise<ComponentStatusRecord[]> {
    console.log('🔍 ComponentStatusSupabaseService.getAll() called');
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded component statuses from Supabase:', data?.length || 0);
      return (data || []).map(this.transformSupabaseToComponentStatus);
    } catch (error) {
      console.error('❌ ComponentStatusSupabaseService.getAll error:', error);
      throw error;
    }
  }

  /**
   * Получить статус компонента по ID
   */
  async getById(id: string): Promise<ComponentStatusRecord | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformSupabaseToComponentStatus(data);
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.getById(${id}) error:`, error);
      return null;
    }
  }

  /**
   * Получить статус по ID компонента
   */
  async getByComponentId(componentId: string): Promise<ComponentStatusRecord | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .eq('component_id', componentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformSupabaseToComponentStatus(data);
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.getByComponentId(${componentId}) error:`, error);
      return null;
    }
  }

  /**
   * Получить статусы по ID оборудования
   */
  async getByEquipmentId(equipmentId: string): Promise<ComponentStatusRecord[]> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformSupabaseToComponentStatus);
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.getByEquipmentId(${equipmentId}) error:`, error);
      return [];
    }
  }

  /**
   * Получить статусы по статусу
   */
  async getByStatus(status: ComponentStatus): Promise<ComponentStatusRecord[]> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .eq('status', status)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformSupabaseToComponentStatus);
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.getByStatus(${status}) error:`, error);
      return [];
    }
  }

  /**
   * Создать или обновить статус компонента
   */
  async upsert(input: ComponentStatusInput): Promise<ComponentStatusRecord> {
    try {
      // Сначала пытаемся найти существующую запись
      const { data: existing } = await supabaseClientBrowser
        .from('component_statuses')
        .select('*')
        .eq('component_id', input.componentId)
        .single();

      const now = new Date();
      const nowISO = now.toISOString();

      if (existing) {
        // Обновляем существующий статус
        const wasOnline = existing.status === 'online';
        const isOnline = input.status === 'online';
        
        // Вычисляем время работы/простоя
        const timeSinceLastUpdate = now.getTime() - new Date(existing.updated_at).getTime();
        const timeInSeconds = Math.floor(timeSinceLastUpdate / 1000);
        
        let uptime = existing.uptime;
        let downtime = existing.downtime;
        
        if (wasOnline) {
          uptime += timeInSeconds;
        } else {
          downtime += timeInSeconds;
        }
        
        // Увеличиваем счетчик ошибок если статус изменился на error
        let errorCount = existing.error_count;
        let lastError = existing.last_error;
        let lastErrorTime = existing.last_error_time;
        
        if (input.status === 'error' && existing.status !== 'error') {
          errorCount++;
          lastError = input.statusMessage || 'Unknown error';
          lastErrorTime = nowISO;
        }

        const updateData = {
          status: input.status,
          status_message: input.statusMessage,
          last_online: isOnline ? nowISO : existing.last_online,
          last_offline: !isOnline && wasOnline ? nowISO : existing.last_offline,
          uptime,
          downtime,
          error_count: errorCount,
          last_error: lastError,
          last_error_time: lastErrorTime,
          response_time: input.responseTime ?? existing.response_time,
          signal_strength: input.signalStrength ?? existing.signal_strength,
          temperature: input.temperature ?? existing.temperature,
          voltage: input.voltage ?? existing.voltage,
          metadata: { ...existing.metadata, ...(input.metadata || {}) },
          updated_at: nowISO
        };

        const { data, error } = await supabaseClientBrowser
          .from('component_statuses')
          .update(updateData)
          .eq('component_id', input.componentId)
          .select()
          .single();

        if (error) throw error;
        return this.transformSupabaseToComponentStatus(data);
      } else {
        // Создаем новый статус
        const insertData = {
          component_id: input.componentId,
          equipment_id: input.equipmentId,
          status: input.status,
          status_message: input.statusMessage,
          last_online: input.status === 'online' ? nowISO : nowISO,
          uptime: 0,
          downtime: 0,
          error_count: input.status === 'error' ? 1 : 0,
          last_error: input.status === 'error' ? input.statusMessage : null,
          last_error_time: input.status === 'error' ? nowISO : null,
          response_time: input.responseTime,
          signal_strength: input.signalStrength,
          temperature: input.temperature,
          voltage: input.voltage,
          metadata: input.metadata || {}
        };

        const { data, error } = await supabaseClientBrowser
          .from('component_statuses')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return this.transformSupabaseToComponentStatus(data);
      }
    } catch (error) {
      console.error('❌ ComponentStatusSupabaseService.upsert error:', error);
      throw error;
    }
  }

  /**
   * Обновить статус компонента
   */
  async updateStatus(componentId: string, status: ComponentStatus, message?: string): Promise<ComponentStatusRecord | null> {
    return await this.upsert({
      componentId,
      status,
      statusMessage: message
    });
  }

  /**
   * Удалить статус компонента
   */
  async remove(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseClientBrowser
        .from('component_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.remove(${id}) error:`, error);
      return false;
    }
  }

  /**
   * Получить метрики здоровья компонента
   */
  async getHealthMetrics(componentId: string): Promise<ComponentHealthMetrics | null> {
    try {
      const status = await this.getByComponentId(componentId);
      if (!status) return null;
      
      const totalTime = status.uptime + status.downtime;
      const availability = totalTime > 0 ? (status.uptime / totalTime) * 100 : 0;
      
      // Простая оценка надежности на основе количества ошибок
      const hoursRunning = status.uptime / 3600;
      const errorsPerHour = hoursRunning > 0 ? status.errorCount / hoursRunning : 0;
      const reliability = Math.max(0, 100 - (errorsPerHour * 10));
      
      // Оценка производительности на основе времени отклика
      let performance = 100;
      if (status.responseTime) {
        if (status.responseTime > 1000) performance = 50;
        else if (status.responseTime > 500) performance = 70;
        else if (status.responseTime > 200) performance = 85;
      }
      
      return {
        availability,
        reliability,
        performance,
        avgResponseTime: status.responseTime || 0,
        avgUptime: status.uptime
      };
    } catch (error) {
      console.error(`❌ ComponentStatusSupabaseService.getHealthMetrics(${componentId}) error:`, error);
      return null;
    }
  }

  /**
   * Получить статистику по всем компонентам
   */
  async getOverallStatistics(): Promise<{
    totalComponents: number;
    componentsByStatus: Record<ComponentStatus, number>;
    avgAvailability: number;
    avgResponseTime: number;
    totalErrors: number;
    componentsByEquipment: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('component_statuses')
        .select('status, uptime, downtime, response_time, error_count, equipment_id');

      if (error) throw error;

      const statuses = data || [];
      const totalComponents = statuses.length;
      
      // Статистика по статусам
      const componentsByStatus = statuses.reduce((acc, cs) => {
        acc[cs.status as ComponentStatus] = (acc[cs.status as ComponentStatus] || 0) + 1;
        return acc;
      }, {} as Record<ComponentStatus, number>);
      
      // Средняя доступность
      const availabilities = statuses.map(cs => {
        const totalTime = cs.uptime + cs.downtime;
        return totalTime > 0 ? (cs.uptime / totalTime) * 100 : 0;
      });
      const avgAvailability = availabilities.length > 0 
        ? availabilities.reduce((sum, av) => sum + av, 0) / availabilities.length 
        : 0;
      
      // Среднее время отклика
      const responseTimes = statuses.filter(cs => cs.response_time).map(cs => cs.response_time!);
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0;
      
      // Общее количество ошибок
      const totalErrors = statuses.reduce((sum, cs) => sum + cs.error_count, 0);
      
      // Статистика по оборудованию
      const componentsByEquipment = statuses.reduce((acc, cs) => {
        if (cs.equipment_id) {
          acc[cs.equipment_id] = (acc[cs.equipment_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalComponents,
        componentsByStatus,
        avgAvailability,
        avgResponseTime,
        totalErrors,
        componentsByEquipment
      };
    } catch (error) {
      console.error('❌ ComponentStatusSupabaseService.getOverallStatistics error:', error);
      return {
        totalComponents: 0,
        componentsByStatus: {} as Record<ComponentStatus, number>,
        avgAvailability: 0,
        avgResponseTime: 0,
        totalErrors: 0,
        componentsByEquipment: {}
      };
    }
  }

  /**
   * Поиск статусов компонентов
   */
  async search(query: string, filters?: {
    status?: ComponentStatus;
    equipmentId?: string;
    hasErrors?: boolean;
  }): Promise<ComponentStatusRecord[]> {
    try {
      let queryBuilder = supabaseClientBrowser
        .from('component_statuses')
        .select('*');

      // Применяем фильтры
      if (filters?.status) {
        queryBuilder = queryBuilder.eq('status', filters.status);
      }
      if (filters?.equipmentId) {
        queryBuilder = queryBuilder.eq('equipment_id', filters.equipmentId);
      }
      if (filters?.hasErrors) {
        queryBuilder = queryBuilder.gt('error_count', 0);
      }

      // Поиск по тексту (Supabase поддерживает text search)
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`id.ilike.%${query}%,component_id.ilike.%${query}%,equipment_id.ilike.%${query}%,status_message.ilike.%${query}%,last_error.ilike.%${query}%`);
      }

      queryBuilder = queryBuilder.order('updated_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return (data || []).map(this.transformSupabaseToComponentStatus);
    } catch (error) {
      console.error('❌ ComponentStatusSupabaseService.search error:', error);
      return [];
    }
  }

  // Приватные методы трансформации данных

  private transformSupabaseToComponentStatus(data: SupabaseComponentStatus): ComponentStatusRecord {
    return {
      id: data.id,
      componentId: data.component_id,
      equipmentId: data.equipment_id,
      status: data.status,
      statusMessage: data.status_message,
      lastOnline: data.last_online,
      lastOffline: data.last_offline,
      uptime: data.uptime,
      downtime: data.downtime,
      errorCount: data.error_count,
      lastError: data.last_error,
      lastErrorTime: data.last_error_time,
      responseTime: data.response_time,
      signalStrength: data.signal_strength,
      temperature: data.temperature,
      voltage: data.voltage,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Экспорт класса и singleton экземпляра
export { ComponentStatusSupabaseService };
export const componentStatusSupabaseService = new ComponentStatusSupabaseService();

// Создаем совместимую обертку для старого API
export const componentStatusService = {
  async getAll() {
    return await componentStatusSupabaseService.getAll();
  },

  async getById(id: string) {
    return await componentStatusSupabaseService.getById(id);
  },

  async getByComponentId(componentId: string) {
    return await componentStatusSupabaseService.getByComponentId(componentId);
  },

  async getByEquipmentId(equipmentId: string) {
    return await componentStatusSupabaseService.getByEquipmentId(equipmentId);
  },

  async getByStatus(status: ComponentStatus) {
    return await componentStatusSupabaseService.getByStatus(status);
  },

  async upsert(input: ComponentStatusInput) {
    return await componentStatusSupabaseService.upsert(input);
  },

  async updateStatus(componentId: string, status: ComponentStatus, message?: string) {
    return await componentStatusSupabaseService.updateStatus(componentId, status, message);
  },

  async remove(id: string) {
    return await componentStatusSupabaseService.remove(id);
  },

  async getHealthMetrics(componentId: string) {
    return await componentStatusSupabaseService.getHealthMetrics(componentId);
  },

  async getOverallStatistics() {
    return await componentStatusSupabaseService.getOverallStatistics();
  },

  async search(query: string, filters?: {
    status?: ComponentStatus;
    equipmentId?: string;
    hasErrors?: boolean;
  }) {
    return await componentStatusSupabaseService.search(query, filters);
  }
};