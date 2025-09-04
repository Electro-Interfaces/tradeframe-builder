/**
 * Сервис для работы с остатками топлива на Supabase
 */

import { supabaseService as supabase } from './supabaseServiceClient';

export interface FuelStock {
  id: string;
  trading_point_id: string;
  fuel_type_id: string;
  tank_id: string;
  current_volume: number;
  reserved_volume: number;
  available_volume: number;
  last_updated: string;
  alerts: Array<{
    type: string;
    message: string;
    level: 'info' | 'warning' | 'critical';
  }>;
  metadata: {
    temperature?: number;
    density?: number;
    tankName?: string;
    fuelType?: string;
    capacity?: number;
    percentage?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface FuelStockSnapshot {
  id: string;
  tankId: string;
  tankName: string;
  fuelType: string;
  tradingPointId: string;
  timestamp: string;
  currentLevelLiters: number;
  capacityLiters: number;
  levelPercent: number;
  temperature: number;
  density: number;
  status: 'normal' | 'low' | 'critical' | 'overfill';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Маппинг из Supabase в формат FuelStockSnapshot для компонентов
 */
const mapToSnapshot = (stock: FuelStock, tankData?: any, fuelTypeData?: any): FuelStockSnapshot => {
  const capacity = stock.metadata?.capacity || tankData?.capacity || 50000;
  const percentage = Math.round((stock.current_volume / capacity) * 100);
  
  let status: 'normal' | 'low' | 'critical' | 'overfill' = 'normal';
  if (percentage > 95) status = 'overfill';
  else if (percentage < 10) status = 'critical';
  else if (percentage < 25) status = 'low';
  
  return {
    id: stock.id,
    tankId: stock.tank_id,
    tankName: stock.metadata?.tankName || `Резервуар ${stock.tank_id.slice(0, 8)}`,
    fuelType: stock.metadata?.fuelType || fuelTypeData?.name || 'Неизвестно',
    tradingPointId: stock.trading_point_id,
    timestamp: stock.last_updated,
    currentLevelLiters: stock.current_volume,
    capacityLiters: capacity,
    levelPercent: percentage,
    temperature: stock.metadata?.temperature || 18.0,
    density: stock.metadata?.density || 0.755,
    status
  };
};

export const fuelStocksSupabaseService = {
  /**
   * Получить все остатки топлива
   */
  async getFuelStocks(tradingPointId?: string): Promise<FuelStockSnapshot[]> {
    console.log('🔄 Loading fuel stocks from Supabase...');
    await delay(300);
    
    try {
      let query = supabase.from('fuel_stocks').select(`
        *,
        fuel_types:fuel_type_id (
          id,
          name,
          code,
          density
        ),
        tanks:tank_id (
          id,
          name,
          capacity,
          metadata
        ),
        trading_points:trading_point_id (
          id,
          name
        )
      `).order('last_updated', { ascending: false });
      
      if (tradingPointId) {
        query = query.eq('trading_point_id', tradingPointId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Ошибка получения остатков топлива:', error);
        throw error;
      }
      
      const snapshots = (data || []).map(item => {
        // Дополняем metadata данными из связанных таблиц
        const enhancedStock: FuelStock = {
          ...item,
          metadata: {
            ...item.metadata,
            fuelType: item.fuel_types?.name,
            tankName: item.tanks?.name,
            capacity: item.tanks?.capacity,
            temperature: item.tanks?.metadata?.temperature,
            density: item.fuel_types?.density || item.tanks?.metadata?.density
          }
        };
        
        return mapToSnapshot(enhancedStock, item.tanks, item.fuel_types);
      });
      
      console.log('✅ Loaded fuel stocks from Supabase:', snapshots.length, 'items');
      return snapshots;
      
    } catch (error) {
      console.error('❌ Ошибка в fuelStocksService.getFuelStocks:', error);
      throw error;
    }
  },

  /**
   * Получить остатки топлива по конкретному резервуару
   */
  async getFuelStockByTank(tankId: string): Promise<FuelStockSnapshot | null> {
    console.log('🔍 Getting fuel stock for tank:', tankId);
    await delay(200);
    
    try {
      const { data, error } = await supabase
        .from('fuel_stocks')
        .select(`
          *,
          fuel_types:fuel_type_id (
            id,
            name,
            code,
            density
          ),
          tanks:tank_id (
            id,
            name,
            capacity,
            metadata
          )
        `)
        .eq('tank_id', tankId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Не найден
        }
        throw error;
      }

      const enhancedStock: FuelStock = {
        ...data,
        metadata: {
          ...data.metadata,
          fuelType: data.fuel_types?.name,
          tankName: data.tanks?.name,
          capacity: data.tanks?.capacity,
          temperature: data.tanks?.metadata?.temperature,
          density: data.fuel_types?.density || data.tanks?.metadata?.density
        }
      };

      const snapshot = mapToSnapshot(enhancedStock, data.tanks, data.fuel_types);
      console.log('✅ Fuel stock found for tank:', snapshot.tankName);
      return snapshot;

    } catch (error) {
      console.error('❌ Ошибка в fuelStocksService.getFuelStockByTank:', error);
      return null;
    }
  },

  /**
   * Создать или обновить остатки топлива
   */
  async createOrUpdateFuelStock(fuelStock: Partial<FuelStock>): Promise<FuelStock> {
    console.log('💾 Creating/updating fuel stock for tank:', fuelStock.tank_id);
    await delay(300);
    
    try {
      // Проверяем, есть ли уже запись для этого резервуара
      const { data: existing } = await supabase
        .from('fuel_stocks')
        .select('id')
        .eq('tank_id', fuelStock.tank_id)
        .single();

      let result;
      
      if (existing) {
        // Обновляем существующую запись
        const { data, error } = await supabase
          .from('fuel_stocks')
          .update({
            current_volume: fuelStock.current_volume,
            available_volume: fuelStock.available_volume || fuelStock.current_volume,
            reserved_volume: fuelStock.reserved_volume || 0,
            metadata: fuelStock.metadata,
            last_updated: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        console.log('✅ Fuel stock updated');
      } else {
        // Создаем новую запись
        const { data, error } = await supabase
          .from('fuel_stocks')
          .insert([{
            trading_point_id: fuelStock.trading_point_id,
            fuel_type_id: fuelStock.fuel_type_id,
            tank_id: fuelStock.tank_id,
            current_volume: fuelStock.current_volume,
            available_volume: fuelStock.available_volume || fuelStock.current_volume,
            reserved_volume: fuelStock.reserved_volume || 0,
            metadata: fuelStock.metadata || {},
            alerts: fuelStock.alerts || [],
            last_updated: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('✅ Fuel stock created');
      }
      
      return result;

    } catch (error) {
      console.error('❌ Ошибка в fuelStocksService.createOrUpdateFuelStock:', error);
      throw error;
    }
  },

  /**
   * Удалить запись об остатках топлива
   */
  async deleteFuelStock(id: string): Promise<boolean> {
    console.log('🗑️ Deleting fuel stock:', id);
    await delay(200);
    
    try {
      const { error } = await supabase
        .from('fuel_stocks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      console.log('✅ Fuel stock deleted');
      return true;

    } catch (error) {
      console.error('❌ Ошибка в fuelStocksService.deleteFuelStock:', error);
      throw error;
    }
  }
};

// Экспорт основного API
export const fuelStocksService = fuelStocksSupabaseService;