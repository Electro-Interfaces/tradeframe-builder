/**
 * Supabase-based prices service
 * Заменяет localStorage mock данные на реальную работу с БД
 */

import { supabaseService } from './supabaseServiceClient';

// Типы данных для работы с БД
export interface FuelPrice {
  id: string;
  package_id?: string;
  trading_point_id: string;
  fuel_type_id: string;
  nomenclature_id?: string;
  price_net: number; // в копейках
  vat_rate: number;
  price_gross: number; // в копейках
  source: 'manual' | 'import' | 'api' | 'package' | 'system';
  currency: string;
  unit: string;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  created_by: string;
  reason?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  
  // Joined data
  fuel_types?: {
    name: string;
    code: string;
    category: string;
  };
  trading_points?: {
    name: string;
  };
  nomenclature?: {
    name: string;
    internal_code: string;
  };
  users?: {
    name: string;
  };
}

export interface PricePackage {
  id: string;
  network_id: string;
  name: string;
  code: string;
  description?: string;
  trading_point_ids: string[];
  status: 'draft' | 'pending' | 'approved' | 'active' | 'archived' | 'cancelled';
  valid_from: string;
  valid_to?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  
  // Joined data
  networks?: {
    name: string;
    code: string;
  };
  users?: {
    name: string;
  };
}

export interface PriceHistoryEntry {
  id: string;
  trading_point_id: string;
  fuel_type_id: string;
  price: number;
  effective_date: string;
  reason?: string;
  set_by?: string;
  metadata: any;
  created_at: string;
  
  // Joined data
  fuel_types?: {
    name: string;
    code: string;
  };
  trading_points?: {
    name: string;
  };
  users?: {
    name: string;
  };
}

class PricesSupabaseService {
  private client = supabaseService;
  
  constructor() {
    // Используем готовый service клиент
    console.log('🔧 PricesSupabaseService initialized with service client');
  }

  /**
   * Получить текущие активные цены
   */
  async getCurrentPrices(params: {
    tradingPointId?: string;
    networkId?: string;
    fuelTypeId?: string;
  } = {}): Promise<FuelPrice[]> {
    try {
      let query = this.client.from('prices');
      
      // Добавляем связанные данные
      query = query.select(`
        *,
        fuel_types(name, code, category),
        trading_points(name),
        nomenclature(name, internal_code),
        users(name)
      `);
      
      // Фильтры
      if (params.tradingPointId) {
        query = query.eq('trading_point_id', params.tradingPointId);
      }
      
      if (params.fuelTypeId) {
        query = query.eq('fuel_type_id', params.fuelTypeId);
      }
      
      // Только активные цены
      query = query.eq('is_active', true);
      
      // Только актуальные по времени
      const now = new Date().toISOString();
      query = query.lte('valid_from', now);
      
      // Сортировка
      query = query.order('valid_from', { ascending: false });
      query = query.limit(100);
      
      const result = await query;
      
      if (result.error) {
        console.error('Error fetching current prices:', result.error);
        return [];
      }
      
      return result.data as FuelPrice[];
      
    } catch (error) {
      console.error('Exception in getCurrentPrices:', error);
      return [];
    }
  }

  /**
   * Получить активную цену для топлива на торговой точке
   */
  async getActivePrice(tradingPointId: string, fuelTypeId: string): Promise<FuelPrice | null> {
    try {
      // Используем функцию из БД
      const result = await this.client.select('get_active_price', {
        limit: 1
      });
      
      // Пока функция не работает, используем обычный запрос
      const query = this.client
        .from('prices')
        .select(`
          *,
          fuel_types(name, code, category),
          trading_points(name)
        `)
        .eq('trading_point_id', tradingPointId)
        .eq('fuel_type_id', fuelTypeId)
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .order('valid_from', { ascending: false })
        .limit(1);
      
      const queryResult = await query;
      
      if (queryResult.error) {
        console.error('Error fetching active price:', queryResult.error);
        return null;
      }
      
      return queryResult.data?.[0] as FuelPrice || null;
      
    } catch (error) {
      console.error('Exception in getActivePrice:', error);
      return null;
    }
  }

  /**
   * Создать или обновить цену
   */
  async upsertPrice(priceData: {
    trading_point_id: string;
    fuel_type_id: string;
    nomenclature_id?: string;
    price_net: number;
    vat_rate?: number;
    source?: 'manual' | 'import' | 'api' | 'package' | 'system';
    valid_from: string;
    valid_to?: string;
    created_by: string;
    reason?: string;
    metadata?: any;
  }): Promise<FuelPrice | null> {
    try {
      // Рассчитываем цену с НДС если не указана
      const vatRate = priceData.vat_rate || 20;
      const priceGross = Math.round(priceData.price_net * (1 + vatRate / 100));
      
      const insertData = {
        trading_point_id: priceData.trading_point_id,
        fuel_type_id: priceData.fuel_type_id,
        nomenclature_id: priceData.nomenclature_id,
        price_net: priceData.price_net,
        vat_rate: vatRate,
        price_gross: priceGross,
        source: priceData.source || 'manual',
        currency: 'RUB',
        unit: 'L',
        valid_from: priceData.valid_from,
        valid_to: priceData.valid_to,
        is_active: true,
        created_by: priceData.created_by,
        reason: priceData.reason,
        metadata: priceData.metadata || {}
      };
      
      // Деактивируем старые цены для этого топлива и точки
      await this.client.update('prices', 
        { is_active: false }, 
        { 
          trading_point_id: priceData.trading_point_id,
          fuel_type_id: priceData.fuel_type_id,
          is_active: true
        }
      );
      
      // Вставляем новую цену
      const result = await this.client.insert('prices', insertData);
      
      if (result.error) {
        console.error('Error inserting price:', result.error);
        return null;
      }
      
      return result.data?.[0] as FuelPrice || null;
      
    } catch (error) {
      console.error('Exception in upsertPrice:', error);
      return null;
    }
  }

  /**
   * Получить пакеты цен
   */
  async getPricePackages(params: {
    networkId?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<PricePackage[]> {
    try {
      let query = this.client
        .from('price_packages')
        .select(`
          *,
          networks(name, code),
          users(name)
        `);
      
      if (params.networkId) {
        query = query.eq('network_id', params.networkId);
      }
      
      if (params.status) {
        query = query.eq('status', params.status);
      }
      
      query = query.order('created_at', { ascending: false });
      
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      const result = await query;
      
      if (result.error) {
        console.error('Error fetching price packages:', result.error);
        return [];
      }
      
      return result.data as PricePackage[];
      
    } catch (error) {
      console.error('Exception in getPricePackages:', error);
      return [];
    }
  }

  /**
   * Создать пакет цен
   */
  async createPricePackage(packageData: {
    network_id: string;
    name: string;
    code: string;
    description?: string;
    trading_point_ids: string[];
    valid_from: string;
    valid_to?: string;
    created_by: string;
  }): Promise<PricePackage | null> {
    try {
      const insertData = {
        ...packageData,
        status: 'draft',
        metadata: {}
      };
      
      const result = await this.client.insert('price_packages', insertData);
      
      if (result.error) {
        console.error('Error creating price package:', result.error);
        return null;
      }
      
      return result.data?.[0] as PricePackage || null;
      
    } catch (error) {
      console.error('Exception in createPricePackage:', error);
      return null;
    }
  }

  /**
   * Получить историю цен
   */
  async getPriceHistory(params: {
    tradingPointId?: string;
    fuelTypeId?: string;
    limit?: number;
  } = {}): Promise<PriceHistoryEntry[]> {
    try {
      let query = this.client
        .from('price_history')
        .select(`
          *,
          fuel_types(name, code),
          trading_points(name),
          users(name)
        `);
      
      if (params.tradingPointId) {
        query = query.eq('trading_point_id', params.tradingPointId);
      }
      
      if (params.fuelTypeId) {
        query = query.eq('fuel_type_id', params.fuelTypeId);
      }
      
      query = query.order('effective_date', { ascending: false });
      
      if (params.limit) {
        query = query.limit(params.limit);
      }
      
      const result = await query;
      
      if (result.error) {
        console.error('Error fetching price history:', result.error);
        return [];
      }
      
      return result.data as PriceHistoryEntry[];
      
    } catch (error) {
      console.error('Exception in getPriceHistory:', error);
      return [];
    }
  }

  /**
   * Добавить запись в историю цен (при изменении цены)
   */
  async addPriceHistoryEntry(historyData: {
    trading_point_id: string;
    fuel_type_id: string;
    price: number;
    effective_date: string;
    reason?: string;
    set_by?: string;
    metadata?: any;
  }): Promise<boolean> {
    try {
      const result = await this.client.insert('price_history', {
        ...historyData,
        metadata: historyData.metadata || {}
      });
      
      if (result.error) {
        console.error('Error adding price history entry:', result.error);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Exception in addPriceHistoryEntry:', error);
      return false;
    }
  }

  /**
   * Получить типы топлива
   */
  async getFuelTypes(): Promise<Array<{
    id: string;
    name: string;
    code: string;
    category: string;
    is_active: boolean;
  }>> {
    try {
      const result = await this.client
        .from('fuel_types')
        .select('id, name, code, category, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (result.error) {
        console.error('Error fetching fuel types:', result.error);
        return [];
      }
      
      return result.data || [];
      
    } catch (error) {
      console.error('Exception in getFuelTypes:', error);
      return [];
    }
  }

  /**
   * Получить торговые точки
   */
  async getTradingPoints(networkId?: string): Promise<Array<{
    id: string;
    name: string;
    network_id: string;
  }>> {
    try {
      let query = this.client
        .from('trading_points')
        .select('id, name, network_id')
        .eq('is_blocked', false);
      
      if (networkId) {
        query = query.eq('network_id', networkId);
      }
      
      query = query.order('name');
      
      const result = await query;
      
      if (result.error) {
        console.error('Error fetching trading points:', result.error);
        return [];
      }
      
      return result.data || [];
      
    } catch (error) {
      console.error('Exception in getTradingPoints:', error);
      return [];
    }
  }
}

// Экспортируем singleton
export const pricesSupabaseService = new PricesSupabaseService();