/**
 * Сервис для работы с торговыми сетями
 * Использует только Supabase базу данных
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { httpClient } from './universalHttpClient';
import { supabaseClientBrowser } from './supabaseClientBrowser';

// API сервис только с Supabase - никакого localStorage!
export const networksService = {
  // СУПЕРСКОРОСТНАЯ загрузка сетей с подсчетом торговых точек
  async getAll(): Promise<Network[]> {
    try {
      console.log('⚡ СУПЕРСКОРОСТНАЯ загрузка сетей...');
      
      // Прямой HTTP запрос к Supabase как в операциях
      const response = await fetch('https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/networks?select=*&order=name', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const networksData = await response.json();
      console.log(`⚡ Загружено ${networksData.length} сетей`);
      
      // Подсчитаем торговые точки для каждой сети через прямые запросы
      const networksWithCount = await Promise.all(
        networksData.map(async (network) => {
          try {
            // Прямой HTTP запрос для подсчета точек
            const pointsResponse = await fetch(`https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/trading_points?select=id&network_id=eq.${network.id}`, {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'
              }
            });
            
            const points = await pointsResponse.json();
            const count = Array.isArray(points) ? points.length : 0;
            
            return {
              id: network.id,
              external_id: network.external_id,
              name: network.name,
              description: network.description || '',
              type: 'АЗС',
              pointsCount: count,
              code: network.code,
              status: network.status,
              settings: network.settings,
              created_at: network.created_at,
              updated_at: network.updated_at
            };
          } catch (pointError) {
            console.error(`❌ Ошибка подсчета точек для сети ${network.name}:`, pointError);
            return {
              id: network.id,
              external_id: network.external_id,
              name: network.name,
              description: network.description || '',
              type: 'АЗС',
              pointsCount: 0,
              code: network.code,
              status: network.status,
              settings: network.settings,
              created_at: network.created_at,
              updated_at: network.updated_at
            };
          }
        })
      );
      
      console.log(`✅ Загружено ${networksWithCount.length} сетей с подсчетом точек`);
      return networksWithCount;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки сетей:', error);
      throw error;
    }
  },

  // Получить сеть по ID (только из Supabase)
  async getById(id: NetworkId): Promise<Network | null> {
    try {
      const response = await httpClient.get('/rest/v1/networks', {
        destination: 'supabase',
        queryParams: {
          select: 'id,name,description,code,status,external_id,settings,created_at,updated_at',
          id: `eq.${id}`
        }
      });
      
      if (!response.success || !response.data) {
        console.error('❌ Error loading network by ID:', response.error);
        return null;
      }

      const data = Array.isArray(response.data) ? response.data[0] : response.data;
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
      
      const response = await httpClient.post('/rest/v1/networks', {
        name: input.name,
        code: input.code || input.name.toLowerCase().replace(/\s+/g, '_'),
        description: input.description,
        status: input.status || 'active',
        external_id: input.external_id
      }, {
        destination: 'supabase',
        headers: {
          'Prefer': 'return=representation'
        }
      });
      
      if (!response.success) {
        console.error('❌ Supabase error creating network:', response.error);
        throw new Error(`Ошибка создания сети: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Нет данных после создания сети');
      }

      const data = response.data[0];
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
      
      const response = await httpClient.patch(`/rest/v1/networks?id=eq.${id}`, {
        name: input.name,
        code: input.code,
        description: input.description,
        status: input.status,
        external_id: input.external_id,
        updated_at: new Date().toISOString()
      }, {
        destination: 'supabase',
        headers: {
          'Prefer': 'return=representation'
        }
      });
      
      if (!response.success) {
        console.error('❌ Supabase error updating network:', response.error);
        throw new Error(`Ошибка обновления сети: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.warn('⚠️ No data returned after network update');
        return null;
      }

      const data = response.data[0];
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
      
      const response = await httpClient.delete(`/rest/v1/networks?id=eq.${id}`, {
        destination: 'supabase'
      });
      
      if (!response.success) {
        console.error('❌ Supabase error deleting network:', response.error);
        throw new Error(`Ошибка удаления сети: ${response.error}`);
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
      
      const response = await httpClient.get('/rest/v1/networks', {
        destination: 'supabase',
        queryParams: {
          select: 'id,name,description,code,status,external_id,settings,created_at,updated_at',
          or: `name.ilike.%${query}%,description.ilike.%${query}%,code.ilike.%${query}%`,
          order: 'name'
        }
      });
      
      if (!response.success) {
        console.error('❌ Supabase error searching networks:', response.error);
        throw new Error(`Ошибка поиска сетей: ${response.error}`);
      }

      if (!response.data || !Array.isArray(response.data)) return [];

      return response.data.map(row => ({
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