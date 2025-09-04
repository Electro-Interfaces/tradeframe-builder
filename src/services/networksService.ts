/**
 * Сервис для работы с торговыми сетями
 * Использует только Supabase базу данных
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { supabase } from './supabaseClientBrowser';

// API сервис только с Supabase - никакого localStorage!
export const networksService = {
  // Получить все сети с подсчетом торговых точек (только из Supabase)
  async getAll(): Promise<Network[]> {
    try {
      console.log('🔄 Loading networks from Supabase with trading points count...');
      
      // Сначала загружаем все сети
      const { data: networksData, error: networksError } = await supabase
        .from('networks')
        .select('id, name, description, code, status, external_id, settings, created_at, updated_at')
        .order('name');
      
      if (networksError) {
        console.error('❌ Supabase networks error:', networksError);
        throw new Error(`Ошибка загрузки сетей: ${networksError.message}`);
      }

      if (!networksData) {
        console.warn('⚠️ No networks data returned from Supabase');
        return [];
      }

      console.log('✅ Loaded networks from Supabase:', networksData.length, 'networks');
      
      // Теперь для каждой сети подсчитываем количество торговых точек
      const networksWithCount = await Promise.all(
        networksData.map(async (network) => {
          const { count, error: countError } = await supabase
            .from('trading_points')
            .select('*', { count: 'exact', head: true })
            .eq('network_id', network.id);
          
          if (countError) {
            console.error(`❌ Error counting points for network ${network.name}:`, countError);
          }
          
          return {
            id: network.id,
            external_id: network.external_id,
            name: network.name,
            description: network.description || '',
            type: 'АЗС', // По умолчанию, можно добавить это поле в БД
            pointsCount: count || 0, // Используем точный подсчет из Supabase
            code: network.code,
            status: network.status,
            settings: network.settings,
            created_at: network.created_at,
            updated_at: network.updated_at
          };
        })
      );
      
      console.log('🔍 Sample network with points count:', networksWithCount[0]);
      return networksWithCount;
      
    } catch (error) {
      console.error('💥 Critical error loading networks:', error);
      throw error; // Пробрасываем ошибку выше, чтобы UI мог её обработать
    }
  },

  // Получить сеть по ID (только из Supabase)
  async getById(id: NetworkId): Promise<Network | null> {
    try {
      const { data, error } = await supabase
        .from('networks')
        .select('id, name, description, code, status, external_id, settings, created_at, updated_at')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ Error loading network by ID:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        external_id: data.external_id,
        name: data.name,
        description: data.description || '',
        type: 'АЗС',
        pointsCount: 0,
        code: data.code,
        status: data.status,
        settings: data.settings,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('💥 Critical error loading network by ID:', error);
      return null;
    }
  },

  // Создать новую сеть (только в Supabase)
  async create(input: NetworkInput): Promise<Network> {
    try {
      console.log('🔄 Creating network in Supabase:', input);
      
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

      console.log('✅ Network created in Supabase:', data);
      
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
      console.log('🔄 Updating network in Supabase:', id, input);
      
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
        console.warn('⚠️ No data returned after network update');
        return null;
      }

      console.log('✅ Network updated in Supabase:', data);
      
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
      console.log('🔄 Deleting network in Supabase:', id);
      
      const { error } = await supabase
        .from('networks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Supabase error deleting network:', error);
        throw new Error(`Ошибка удаления сети: ${error.message}`);
      }

      console.log('✅ Network deleted from Supabase:', id);
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
      console.log('🔍 Searching networks in Supabase:', query);
      
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