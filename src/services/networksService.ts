/**
 * Сервис для работы с торговыми сетями
 * Использует таблицу tenants (type='network') в Supabase
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { supabaseService as supabase } from './supabaseServiceClient';

// API сервис только с Supabase - используем tenants с type='network'
export const networksService = {
  // Получить все сети с подсчетом торговых точек
  async getAll(userRole?: string): Promise<Network[]> {
    try {
      // Получаем tenants с type='network'
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('type', 'network')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Supabase error loading networks:', error);
        throw new Error(`Ошибка загрузки сетей: ${error.message}`);
      }

      if (!data) return [];

      // Преобразуем tenants в Network формат
      let networks = data.map(tenant => ({
        id: tenant.id,
        external_id: tenant.settings?.external_id || tenant.code,
        name: tenant.name,
        description: tenant.settings?.description || '',
        type: 'АЗС' as const,
        pointsCount: Array.isArray(tenant.settings?.stations) ? tenant.settings.stations.length : 0,
        code: tenant.code,
        status: tenant.is_active ? 'active' as const : 'inactive' as const,
        settings: tenant.settings,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at
      }));

      // Фильтрация для МенеджерБТО - только сеть БТО
      if (userRole === 'bto_manager') {
        networks = networks.filter(network => network.code === 'bto');
      }

      return networks;
    } catch (error) {
      console.error('💥 Critical error loading networks:', error);
      throw error;
    }
  },

  // Получить сеть по ID
  async getById(id: NetworkId): Promise<Network | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .eq('type', 'network')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Запись не найдена
          return null;
        }
        console.error('❌ Supabase error loading network by ID:', error);
        throw new Error(`Ошибка загрузки сети: ${error.message}`);
      }

      if (!data) return null;

      return {
        id: data.id,
        external_id: data.settings?.external_id || data.code,
        name: data.name,
        description: data.settings?.description || '',
        type: 'АЗС',
        pointsCount: Array.isArray(data.settings?.stations) ? data.settings.stations.length : 0,
        code: data.code,
        status: data.is_active ? 'active' : 'inactive',
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error loading network by ID:', error);
      return null;
    }
  },

  // Создать новую сеть (создает tenant с type='network')
  async create(input: NetworkInput): Promise<Network> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: input.name,
          code: input.code || input.name.toLowerCase().replace(/\s+/g, '_'),
          type: 'network',
          is_active: input.status === 'active' || true,
          settings: {
            description: input.description || '',
            external_id: input.external_id || '',
            stations: [] // Пустой массив торговых точек при создании
          }
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating network:', error);
        throw new Error(`Ошибка создания сети: ${error.message}`);
      }

      if (!data) {
        throw new Error('Нет данных после создания сети');
      }

      return {
        id: data.id,
        external_id: data.settings?.external_id || data.code,
        name: data.name,
        description: data.settings?.description || '',
        type: input.type || 'АЗС',
        pointsCount: 0,
        code: data.code,
        status: data.is_active ? 'active' : 'inactive',
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error creating network:', error);
      throw error;
    }
  },

  // Обновить сеть (обновляет tenant)
  async update(id: NetworkId, input: NetworkInput): Promise<Network | null> {
    try {
      // Сначала получаем текущие данные для сохранения stations
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Сеть не найдена');
      }

      const { data, error } = await supabase
        .from('tenants')
        .update({
          name: input.name,
          code: input.code,
          is_active: input.status === 'active',
          settings: {
            ...current.settings,
            description: input.description || '',
            external_id: input.external_id || current.settings?.external_id || ''
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('type', 'network')
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error updating network:', error);
        throw new Error(`Ошибка обновления сети: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        external_id: data.settings?.external_id || data.code,
        name: data.name,
        description: data.settings?.description || '',
        type: input.type || 'АЗС',
        pointsCount: Array.isArray(data.settings?.stations) ? data.settings.stations.length : 0,
        code: data.code,
        status: data.is_active ? 'active' : 'inactive',
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error updating network:', error);
      throw error;
    }
  },

  // Удалить сеть (удаляет tenant - soft delete через is_active)
  async remove(id: NetworkId): Promise<boolean> {
    try {
      // Используем soft delete через is_active вместо физического удаления
      const { error } = await supabase
        .from('tenants')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('type', 'network');

      if (error) {
        console.error('❌ Supabase error deleting network:', error);
        throw new Error(`Ошибка удаления сети: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('💥 Critical error deleting network:', error);
      throw error;
    }
  },

  // Алиас для remove (для совместимости)
  async delete(id: NetworkId): Promise<boolean> {
    return this.remove(id);
  },

  // Поиск сетей
  async search(query: string): Promise<Network[]> {
    if (!query.trim()) {
      return this.getAll();
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('type', 'network')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .order('name');

      if (error) {
        console.error('❌ Supabase error searching networks:', error);
        throw new Error(`Ошибка поиска сетей: ${error.message}`);
      }

      if (!data) return [];

      return data.map(tenant => ({
        id: tenant.id,
        external_id: tenant.settings?.external_id || tenant.code,
        name: tenant.name,
        description: tenant.settings?.description || '',
        type: 'АЗС' as const,
        pointsCount: Array.isArray(tenant.settings?.stations) ? tenant.settings.stations.length : 0,
        code: tenant.code,
        status: tenant.is_active ? 'active' as const : 'inactive' as const,
        settings: tenant.settings,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at
      }));
    } catch (error) {
      console.error('💥 Critical error searching networks:', error);
      throw error;
    }
  },

  // Получить статистику по сетям (только из Supabase)
  async getStatistics(): Promise<{
    totalNetworks: number;
    totalPoints: number;
    averagePointsPerNetwork: number;
    networksByType: Record<string, number>;
  }> {
    try {
      const networks = await this.getAll();
      
      const totalNetworks = networks.length;
      const totalPoints = networks.reduce((sum, network) => sum + (network.pointsCount || 0), 0);
      const averagePointsPerNetwork = totalNetworks > 0 ? Math.round(totalPoints / totalNetworks * 100) / 100 : 0;
      
      const networksByType: Record<string, number> = {};
      networks.forEach(network => {
        networksByType[network.type] = (networksByType[network.type] || 0) + 1;
      });
      
      return {
        totalNetworks,
        totalPoints,
        averagePointsPerNetwork,
        networksByType
      };
    } catch (error) {
      console.error('💥 Critical error getting statistics:', error);
      throw error;
    }
  }
};