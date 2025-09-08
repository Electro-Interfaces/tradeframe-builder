/**
 * Сервис для работы с торговыми точками
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией из раздела "Обмен данными"
 * Использует SupabaseConnectionHelper для проверки подключений
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput, TradingPointUpdateInput } from '@/types/tradingpoint';
import { httpClient } from './universalHttpClient';
import { SupabaseConnectionHelper, executeSupabaseOperation } from './supabaseConnectionHelper';

// API сервис с централизованной конфигурацией
export const tradingPointsService = {
  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    await SupabaseConnectionHelper.initialize();
  },

  /**
   * Получить все торговые точки (только из Supabase)
   */
  async getAll(): Promise<TradingPoint[]> {
    return executeSupabaseOperation(
      'Загрузка торговых точек',
      async () => {
        const response = await httpClient.get('/rest/v1/trading_points', {
          destination: 'supabase',
          queryParams: {
            select: '*',
            order: 'name'
          }
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Ошибка загрузки торговых точек');
        }
        
        const result = { data: response.data, error: null };
        return result;
      }
    ).then(data => {
      if (!data || data.length === 0) {
        console.warn('⚠️ No trading points data returned from Supabase');
        return [];
      }

      console.log('✅ Loaded trading points from Supabase:', data.length, 'points');
      console.log('🔍 Sample trading point data:', data[0]); // Показываем первую точку для отладки
      
      // Преобразуем данные из Supabase в формат TradingPoint
      return data.map(row => ({
        id: row.id,
        external_id: row.external_id, // ID для синхронизации с торговым API
        networkId: row.network_id,
        name: row.name,
        description: row.description || '',
        geolocation: row.geolocation || {},
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        isBlocked: row.is_blocked || false,
        blockReason: row.block_reason || '',
        schedule: row.schedule || {},
        services: row.services || {},
        externalCodes: row.external_codes || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    });
  },

  // СУПЕРСКОРОСТНАЯ загрузка торговых точек по ID сети
  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    try {
      console.log('⚡ СУПЕРСКОРОСТНАЯ загрузка точек для сети:', networkId);
      
      // Прямой HTTP запрос к Supabase
      const response = await fetch(`https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/trading_points?select=*&network_id=eq.${networkId}&order=name`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data)) {
        console.log(`⚠️ Нет торговых точек для сети ${networkId}`);
        return [];
      }

      console.log(`⚡ Загружено ${data.length} торговых точек для сети ${networkId}`);
      
      // Преобразуем данные в формат TradingPoint
      return data.map(row => ({
        id: row.id,
        external_id: row.external_id,
        networkId: row.network_id,
        name: row.name,
        description: row.description || '',
        geolocation: row.geolocation || {},
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        isBlocked: row.is_blocked || false,
        blockReason: row.block_reason || '',
        schedule: row.schedule || {},
        services: row.services || {},
        externalCodes: row.external_codes || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
      
    } catch (error) {
      console.error(`❌ Ошибка загрузки торговых точек для сети ${networkId}:`, error);
      throw error;
    }
  },

  // Получить торговую точку по ID (только из Supabase)
  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    try {
      console.log(`🔍 [TradingPointsService] Загружаем торговую точку по ID: ${id}`);
      
      const response = await httpClient.get('/rest/v1/trading_points', {
        destination: 'supabase',
        queryParams: {
          select: '*',
          id: `eq.${id}`
        }
      });
      
      if (!response.success) {
        console.error('❌ [TradingPointsService] Ошибка загрузки торговой точки:', response.error);
        return null;
      }
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.log(`⚠️ [TradingPointsService] Торговая точка ${id} не найдена`);
        return null;
      }
      
      const data = response.data[0];
      console.log(`✅ [TradingPointsService] Торговая точка найдена:`, data);

      return {
        id: data.id,
        external_id: data.external_id,
        networkId: data.network_id,
        name: data.name,
        description: data.description || '',
        geolocation: data.geolocation || {},
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        isBlocked: data.is_blocked || false,
        blockReason: data.block_reason || '',
        schedule: data.schedule || {},
        services: data.services || {},
        externalCodes: data.external_codes || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error loading trading point by ID:', error);
      return null;
    }
  },

  // Создать новую торговую точку (только в Supabase)
  async create(input: TradingPointInput): Promise<TradingPoint> {
    try {
      console.log('🔄 Creating trading point in Supabase:', input);
      
      const { data, error } = await supabase
        .from('trading_points')
        .insert({
          network_id: input.networkId,
          name: input.name,
          description: input.description || null,
          geolocation: input.geolocation || {},
          phone: input.phone || null,
          email: input.email || null,
          website: input.website || null,
          is_blocked: input.isBlocked || false,
          schedule: input.schedule || {},
          services: input.services || {},
          external_codes: [],
          settings: {}
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error creating trading point:', error);
        throw new Error(`Ошибка создания торговой точки: ${error.message}`);
      }

      if (!data) {
        throw new Error('Нет данных после создания торговой точки');
      }

      console.log('✅ Trading point created in Supabase:', data);
      
      return {
        id: data.id,
        external_id: data.external_id,
        networkId: data.network_id,
        name: data.name,
        description: data.description || '',
        geolocation: data.geolocation || {},
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        isBlocked: data.is_blocked || false,
        blockReason: data.block_reason || '',
        schedule: data.schedule || {},
        services: data.services || {},
        externalCodes: data.external_codes || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error creating trading point:', error);
      throw error;
    }
  },

  // Обновить торговую точку (только в Supabase)
  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint | null> {
    try {
      console.log('🔄 Updating trading point in Supabase:', id, input);
      
      const { data, error } = await supabase
        .from('trading_points')
        .update({
          network_id: input.networkId,
          name: input.name,
          description: input.description || null,
          external_id: input.external_id || null,
          geolocation: input.geolocation || {},
          phone: input.phone || null,
          email: input.email || null,
          website: input.website || null,
          is_blocked: input.isBlocked || false,
          block_reason: input.blockReason || null,
          schedule: input.schedule || {},
          services: input.services || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error updating trading point:', error);
        throw new Error(`Ошибка обновления торговой точки: ${error.message}`);
      }

      if (!data) {
        console.warn('⚠️ No data returned after trading point update');
        return null;
      }

      console.log('✅ Trading point updated in Supabase:', data);
      
      return {
        id: data.id,
        external_id: data.external_id,
        networkId: data.network_id,
        name: data.name,
        description: data.description || '',
        geolocation: data.geolocation || {},
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        isBlocked: data.is_blocked || false,
        blockReason: data.block_reason || '',
        schedule: data.schedule || {},
        services: data.services || {},
        externalCodes: data.external_codes || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error updating trading point:', error);
      throw error;
    }
  },

  // Удалить торговую точку (только в Supabase)
  async remove(id: TradingPointId): Promise<boolean> {
    try {
      console.log('🔄 Deleting trading point in Supabase:', id);
      
      const { error } = await supabase
        .from('trading_points')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Supabase error deleting trading point:', error);
        throw new Error(`Ошибка удаления торговой точки: ${error.message}`);
      }

      console.log('✅ Trading point deleted from Supabase:', id);
      return true;
    } catch (error) {
      console.error('💥 Critical error deleting trading point:', error);
      throw error;
    }
  },

  // Алиас для remove (для совместимости)
  async delete(id: TradingPointId): Promise<boolean> {
    return this.remove(id);
  },

  // Поиск торговых точек (только в Supabase)
  async search(query: string): Promise<TradingPoint[]> {
    if (!query.trim()) {
      return this.getAll();
    }
    
    try {
      console.log('🔍 Searching trading points in Supabase:', query);
      
      const { data, error } = await supabase
        .from('trading_points')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('name');
      
      if (error) {
        console.error('❌ Supabase error searching trading points:', error);
        throw new Error(`Ошибка поиска торговых точек: ${error.message}`);
      }

      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        external_id: row.external_id, // ID для синхронизации с торговым API
        networkId: row.network_id,
        name: row.name,
        description: row.description || '',
        geolocation: row.geolocation || {},
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        isBlocked: row.is_blocked || false,
        blockReason: row.block_reason || '',
        schedule: row.schedule || {},
        services: row.services || {},
        externalCodes: row.external_codes || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('💥 Critical error searching trading points:', error);
      throw error;
    }
  },

  // Получить торговые точки с информацией о сети (JOIN)
  async getAllWithNetworks(): Promise<(TradingPoint & { networkName: string })[]> {
    try {
      console.log('🔄 Loading trading points with networks from Supabase...');
      
      const { data, error } = await supabase
        .from('trading_points')
        .select(`
          *,
          networks!inner (
            id,
            name,
            external_id
          )
        `)
        .order('name');
      
      if (error) {
        console.error('❌ Supabase error loading trading points with networks:', error);
        throw new Error(`Ошибка загрузки торговых точек с сетями: ${error.message}`);
      }

      if (!data) return [];

      console.log('✅ Loaded trading points with networks:', data.length);
      
      return data.map(row => ({
        id: row.id,
        external_id: row.external_id, // ID для синхронизации с торговым API
        networkId: row.network_id,
        name: row.name,
        description: row.description || '',
        geolocation: row.geolocation || {},
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        isBlocked: row.is_blocked || false,
        blockReason: row.block_reason || '',
        schedule: row.schedule || {},
        services: row.services || {},
        externalCodes: row.external_codes || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        networkName: row.networks?.name || 'Неизвестная сеть'
      }));
      
    } catch (error) {
      console.error('💥 Critical error loading trading points with networks:', error);
      throw error;
    }
  },

  // Получить статистику по торговым точкам (только из Supabase)
  async getStatistics(): Promise<{
    totalPoints: number;
    activePoints: number;
    blockedPoints: number;
    pointsByNetwork: Record<string, number>;
  }> {
    try {
      const points = await this.getAllWithNetworks();
      
      const totalPoints = points.length;
      const activePoints = points.filter(point => !point.isBlocked).length;
      const blockedPoints = points.filter(point => point.isBlocked).length;
      
      const pointsByNetwork: Record<string, number> = {};
      points.forEach(point => {
        pointsByNetwork[point.networkName] = (pointsByNetwork[point.networkName] || 0) + 1;
      });
      
      return {
        totalPoints,
        activePoints,
        blockedPoints,
        pointsByNetwork
      };
    } catch (error) {
      console.error('💥 Critical error getting statistics:', error);
      throw error;
    }
  }
};

// Экспорт для обратной совместимости
export default tradingPointsService;