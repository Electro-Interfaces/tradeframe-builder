/**
 * Сервис для работы с торговыми сетями
 * Использует только Supabase базу данных
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { supabaseService as supabase } from './supabaseServiceClient';
import { networksStore } from '@/mock/networksStore';

// API сервис только с Supabase - никакого localStorage!
export const networksService = {
  // Получить все сети с подсчетом торговых точек (используем mock данные)
  async getAll(userRole?: string): Promise<Network[]> {
    try {
      let networks = networksStore.getAll();

      // Фильтрация для МенеджерБТО - только сеть БТО
      if (userRole === 'bto_manager') {
        networks = networks.filter(network => network.id === '15'); // Только БТО сеть
      }

      return networks;
    } catch (error) {
      throw error;
    }
  },

  // Получить сеть по ID (используем mock данные)
  async getById(id: NetworkId): Promise<Network | null> {
    try {
      
      const network = networksStore.getById(id);

      if (!network) {
        return null;
      }
      
      return network;
    } catch (error) {
      console.error('💥 Critical error loading network by ID:', error);
      return null;
    }
  },

  // Создать новую сеть (только в Supabase)
  async create(input: NetworkInput): Promise<Network> {
    try {
      
      const { data, error } = await supabase
        .from('networks')
        .insert({
          name: input.name,
          code: input.code || input.name.toLowerCase().replace(/\s+/g, '_'),
          description: input.description,
          status: input.status || 'active',
          external_id: input.external_id
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
        external_id: data.external_id,
        name: data.name,
        description: data.description || '',
        type: input.type || 'АЗС',
        pointsCount: 0,
        code: data.code,
        status: data.status,
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error creating network:', error);
      throw error;
    }
  },

  // Обновить сеть (только в Supabase)
  async update(id: NetworkId, input: NetworkInput): Promise<Network | null> {
    try {
      
      const { data, error } = await supabase
        .from('networks')
        .update({
          name: input.name,
          code: input.code,
          description: input.description,
          status: input.status,
          external_id: input.external_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
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
        external_id: data.external_id,
        name: data.name,
        description: data.description || '',
        type: input.type || 'АЗС',
        pointsCount: 0, // Будет вычисляться отдельно
        code: data.code,
        status: data.status,
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error updating network:', error);
      throw error;
    }
  },

  // Удалить сеть (только в Supabase)
  async remove(id: NetworkId): Promise<boolean> {
    try {
      
      const { error } = await supabase
        .from('networks')
        .delete()
        .eq('id', id);

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

  // Поиск сетей (только в Supabase)
  async search(query: string): Promise<Network[]> {
    if (!query.trim()) {
      return this.getAll();
    }

    try {
      
      const { data, error } = await supabase
        .from('networks')
        .select('id, name, description, code, status, external_id, settings, created_at, updated_at')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,code.ilike.%${query}%`)
        .order('name');

      if (error) {
        console.error('❌ Supabase error searching networks:', error);
        throw new Error(`Ошибка поиска сетей: ${error.message}`);
      }

      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        external_id: row.external_id,
        name: row.name,
        description: row.description || '',
        type: 'АЗС',
        pointsCount: 0,
        code: row.code,
        status: row.status,
        settings: row.settings,
        created_at: row.created_at,
        updated_at: row.updated_at
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