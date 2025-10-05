/**
 * Сервис для работы с торговыми точками
 * Использует только Supabase базу данных
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput } from '@/types/tradingpoint';
import { supabaseService as supabase } from './supabaseServiceClient';
import { tradingPointsStore } from '@/mock/tradingPointsStore';

// API сервис только с Supabase - никакого localStorage!
export const tradingPointsService = {
  // Получить все торговые точки (используем mock данные)
  async getAll(): Promise<TradingPoint[]> {
    try {
      const points = tradingPointsStore.getAll();
      return points;

    } catch (error) {
      console.error('💥 Critical error loading trading points:', error);
      throw error;
    }
  },

  // Получить торговые точки по ID сети (используем mock данные)
  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    try {
      const points = tradingPointsStore.getByNetworkId(networkId);
      return points;

    } catch (error) {
      console.error('💥 Critical error loading trading points by network:', error);
      throw error;
    }
  },

  // Получить торговую точку по ID (используем mock данные)
  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    try {
      const point = tradingPointsStore.getById(id);

      if (!point) {
        return null;
      }

      return point;
    } catch (error) {
      console.error('💥 Critical error loading trading point by ID:', error);
      return null;
    }
  },

  // Создать новую торговую точку (только в Supabase)
  async create(input: TradingPointInput): Promise<TradingPoint> {
    try {
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

      return {
        id: data.id,
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
  async update(id: TradingPointId, input: TradingPointInput): Promise<TradingPoint | null> {
    try {
      const { data, error } = await supabase
        .from('trading_points')
        .update({
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
        return null;
      }

      return {
        id: data.id,
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
      const { error } = await supabase
        .from('trading_points')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase error deleting trading point:', error);
        throw new Error(`Ошибка удаления торговой точки: ${error.message}`);
      }

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