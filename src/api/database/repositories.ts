/**
 * Database Repositories
 * Для АГЕНТА 1: Инфраструктура
 */

import { supabase, Database, handleDatabaseError } from './supabase';
import { Operation, OperationType, OperationStatus } from '../../services/operationsTypes';

type NetworkRow = Database['public']['Tables']['networks']['Row'];
type NetworkInsert = Database['public']['Tables']['networks']['Insert'];
type NetworkUpdate = Database['public']['Tables']['networks']['Update'];

type FuelTypeRow = Database['public']['Tables']['fuel_types']['Row'];
type FuelTypeInsert = Database['public']['Tables']['fuel_types']['Insert'];
type FuelTypeUpdate = Database['public']['Tables']['fuel_types']['Update'];

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

type OperationRow = Database['public']['Tables']['operations']['Row'];
type OperationInsert = Database['public']['Tables']['operations']['Insert'];
type OperationUpdate = Database['public']['Tables']['operations']['Update'];

type PriceHistoryRow = Database['public']['Tables']['price_history']['Row'];
type PriceHistoryInsert = Database['public']['Tables']['price_history']['Insert'];
type PriceHistoryUpdate = Database['public']['Tables']['price_history']['Update'];

type FuelStockRow = Database['public']['Tables']['fuel_stocks']['Row'];
type FuelStockInsert = Database['public']['Tables']['fuel_stocks']['Insert'];
type FuelStockUpdate = Database['public']['Tables']['fuel_stocks']['Update'];

type FuelMeasurementRow = Database['public']['Tables']['fuel_measurement_history']['Row'];
type FuelMeasurementInsert = Database['public']['Tables']['fuel_measurement_history']['Insert'];

type EquipmentLogRow = Database['public']['Tables']['equipment_log']['Row'];
type EquipmentLogInsert = Database['public']['Tables']['equipment_log']['Insert'];
type EquipmentLogUpdate = Database['public']['Tables']['equipment_log']['Update'];

type TankRow = Database['public']['Tables']['tanks']['Row'];
type TankInsert = Database['public']['Tables']['tanks']['Insert'];
type TankUpdate = Database['public']['Tables']['tanks']['Update'];

type TankEventRow = Database['public']['Tables']['tank_events']['Row'];
type TankEventInsert = Database['public']['Tables']['tank_events']['Insert'];

/**
 * Базовый репозиторий с общими методами
 */
abstract class BaseRepository<TRow, TInsert, TUpdate> {
  protected tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  protected handleError(error: any) {
    const handled = handleDatabaseError(error);
    throw new Error(JSON.stringify(handled));
  }
}

/**
 * Репозиторий для работы с сетями
 */
export class NetworksRepository extends BaseRepository<NetworkRow, NetworkInsert, NetworkUpdate> {
  constructor() {
    super('networks');
  }
  
  /**
   * Получить все сети
   */
  async findAll(options?: {
    status?: NetworkRow['status'];
    orderBy?: 'name' | 'code' | 'created_at';
    ascending?: boolean;
  }): Promise<NetworkRow[]> {
    try {
      let query = supabase.from('networks').select('*');
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      const orderBy = options?.orderBy || 'created_at';
      const ascending = options?.ascending ?? false;
      query = query.order(orderBy, { ascending });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }
  
  /**
   * Найти сеть по ID
   */
  async findById(id: string): Promise<NetworkRow | null> {
    try {
      const { data, error } = await supabase
        .from('networks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  /**
   * Найти сеть по коду
   */
  async findByCode(code: string): Promise<NetworkRow | null> {
    try {
      const { data, error } = await supabase
        .from('networks')
        .select('*')
        .eq('code', code)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  /**
   * Создать новую сеть
   */
  async create(network: NetworkInsert): Promise<NetworkRow> {
    try {
      const { data, error } = await supabase
        .from('networks')
        .insert(network)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Обновить сеть
   */
  async update(id: string, updates: NetworkUpdate): Promise<NetworkRow> {
    try {
      const { data, error } = await supabase
        .from('networks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Удалить сеть
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('networks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
  
  /**
   * Получить статистику по сетям
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  }> {
    try {
      const { data: total, error: totalError } = await supabase
        .from('networks')
        .select('count');
      
      const { data: active, error: activeError } = await supabase
        .from('networks')
        .select('count')
        .eq('status', 'active');
      
      const { data: inactive, error: inactiveError } = await supabase
        .from('networks')
        .select('count')
        .eq('status', 'inactive');
      
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('networks')
        .select('count')
        .eq('status', 'maintenance');
      
      if (totalError || activeError || inactiveError || maintenanceError) {
        throw new Error('Failed to get network statistics');
      }
      
      return {
        total: (total as any)[0]?.count || 0,
        active: (active as any)[0]?.count || 0,
        inactive: (inactive as any)[0]?.count || 0,
        maintenance: (maintenance as any)[0]?.count || 0
      };
    } catch (error) {
      console.error('Failed to get network stats:', error);
      return { total: 0, active: 0, inactive: 0, maintenance: 0 };
    }
  }
}

/**
 * Репозиторий для работы с типами топлива
 */
export class FuelTypesRepository extends BaseRepository<FuelTypeRow, FuelTypeInsert, FuelTypeUpdate> {
  constructor() {
    super('fuel_types');
  }
  
  async findAll(activeOnly: boolean = true): Promise<FuelTypeRow[]> {
    try {
      let query = supabase.from('fuel_types').select('*');
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }
  
  async findById(id: string): Promise<FuelTypeRow | null> {
    try {
      const { data, error } = await supabase
        .from('fuel_types')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  async findByCode(code: string): Promise<FuelTypeRow | null> {
    try {
      const { data, error } = await supabase
        .from('fuel_types')
        .select('*')
        .eq('code', code)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  async create(fuelType: FuelTypeInsert): Promise<FuelTypeRow> {
    try {
      const { data, error } = await supabase
        .from('fuel_types')
        .insert(fuelType)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  async update(id: string, updates: FuelTypeUpdate): Promise<FuelTypeRow> {
    try {
      const { data, error } = await supabase
        .from('fuel_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fuel_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
}

/**
 * Репозиторий для работы с пользователями
 */
export class UsersRepository extends BaseRepository<UserRow, UserInsert, UserUpdate> {
  constructor() {
    super('users');
  }
  
  async findByEmail(email: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  async findByUsername(username: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
  
  async create(user: UserInsert): Promise<UserRow> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  async updateLastLogin(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }
}

/**
 * Operations Repository
 */
class OperationsRepository extends BaseRepository<OperationRow, OperationInsert, OperationUpdate> {
  constructor() {
    super('operations');
  }

  /**
   * Найти все операции с фильтрацией
   */
  async findAllWithFilters(filters: any = {}, pagination: { page: number; limit: number }) {
    try {
      let query = supabase
        .from('operations')
        .select('*', { count: 'exact' });

      // Применение фильтров
      if (filters.operationType) {
        query = query.eq('operation_type', filters.operationType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('start_time', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('start_time', filters.dateRange.end.toISOString());
        }
      }

      // Сортировка и пагинация
      const offset = (pagination.page - 1) * pagination.limit;
      query = query
        .order('start_time', { ascending: false })
        .range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / pagination.limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
  }

  /**
   * Найти операцию по ID
   */
  async findById(id: string): Promise<OperationRow | null> {
    try {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Создать операцию
   */
  async create(operationData: any): Promise<OperationRow> {
    try {
      const { data, error } = await supabase
        .from('operations')
        .insert({
          id: operationData.id,
          operation_type: operationData.operationType,
          status: operationData.status,
          start_time: operationData.startTime,
          end_time: operationData.endTime,
          duration: operationData.duration,
          trading_point_id: operationData.tradingPointId,
          trading_point_name: operationData.tradingPointName,
          device_id: operationData.deviceId,
          transaction_id: operationData.transactionId,
          fuel_type: operationData.fuelType,
          quantity: operationData.quantity,
          price: operationData.price,
          total_cost: operationData.totalCost,
          payment_method: operationData.paymentMethod,
          details: operationData.details,
          progress: operationData.progress,
          operator_name: operationData.operatorName,
          customer_id: operationData.customerId,
          vehicle_number: operationData.vehicleNumber,
          metadata: operationData.metadata,
          network_id: operationData.networkId,
          created_by: operationData.createdBy
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Обновить операцию
   */
  async update(id: string, updates: any): Promise<OperationRow> {
    try {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.details !== undefined) updateData.details = updates.details;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.totalCost !== undefined) updateData.total_cost = updates.totalCost;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('operations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Получить статистику
   */
  async getStats(period: string, filters: any = {}): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      let query = supabase
        .from('operations')
        .select('*')
        .gte('start_time', startDate.toISOString());

      // Применение фильтров
      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const operations = data || [];
      const stats = {
        totalOperations: operations.length,
        completedOperations: operations.filter(op => op.status === 'completed').length,
        inProgressOperations: operations.filter(op => op.status === 'in_progress').length,
        failedOperations: operations.filter(op => op.status === 'failed').length,
        totalRevenue: operations
          .filter(op => op.status === 'completed' && op.total_cost)
          .reduce((sum, op) => sum + (op.total_cost || 0), 0),
        averageOperationValue: 0,
        operationsByType: {} as Record<string, number>,
        operationsByHour: {} as Record<string, number>
      };

      // Группировка по типам
      operations.forEach(op => {
        stats.operationsByType[op.operation_type] = 
          (stats.operationsByType[op.operation_type] || 0) + 1;

        // Группировка по часам
        const hour = new Date(op.start_time).getHours();
        stats.operationsByHour[hour] = (stats.operationsByHour[hour] || 0) + 1;
      });

      // Средняя стоимость
      const completedSales = operations.filter(op => 
        op.status === 'completed' && op.operation_type === 'sale' && op.total_cost
      );
      
      if (completedSales.length > 0) {
        const totalSalesAmount = completedSales.reduce((sum, op) => sum + (op.total_cost || 0), 0);
        stats.averageOperationValue = totalSalesAmount / completedSales.length;
      }

      return stats;
    } catch (error) {
      this.handleError(error);
      return {
        totalOperations: 0,
        completedOperations: 0,
        inProgressOperations: 0,
        failedOperations: 0,
        totalRevenue: 0,
        averageOperationValue: 0,
        operationsByType: {},
        operationsByHour: {}
      };
    }
  }

  /**
   * Получить краткую статистику
   */
  async getStatsSummary(filters: any = {}): Promise<any> {
    try {
      let query = supabase
        .from('operations')
        .select('status, total_cost, operation_type');

      // Применение фильтров
      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const operations = data || [];
      
      return {
        totalOperations: operations.length,
        completedOperations: operations.filter(op => op.status === 'completed').length,
        totalAmount: operations
          .filter(op => op.status === 'completed' && op.total_cost)
          .reduce((sum, op) => sum + (op.total_cost || 0), 0),
        averageOperationValue: operations.length > 0 
          ? operations.reduce((sum, op) => sum + (op.total_cost || 0), 0) / operations.length 
          : 0
      };
    } catch (error) {
      this.handleError(error);
      return {
        totalOperations: 0,
        completedOperations: 0,
        totalAmount: 0,
        averageOperationValue: 0
      };
    }
  }

  /**
   * Экспорт операций
   */
  async exportOperations(filters: any, format: string): Promise<any> {
    try {
      const operations = await this.findAllWithFilters(filters, { page: 1, limit: 10000 });
      
      if (format === 'json') {
        return JSON.stringify(operations.data, null, 2);
      }
      
      if (format === 'csv') {
        const headers = [
          'ID', 'Type', 'Status', 'Start Time', 'End Time', 'Trading Point', 
          'Fuel Type', 'Quantity', 'Price', 'Total Cost', 'Payment Method', 'Details'
        ];
        
        let csv = headers.join(',') + '\n';
        
        operations.data.forEach(op => {
          const row = [
            op.id,
            op.operation_type,
            op.status,
            op.start_time,
            op.end_time || '',
            op.trading_point_name || '',
            op.fuel_type || '',
            op.quantity || '',
            op.price || '',
            op.total_cost || '',
            op.payment_method || '',
            `"${(op.details || '').replace(/"/g, '""')}"`
          ];
          csv += row.join(',') + '\n';
        });
        
        return csv;
      }
      
      return operations.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }
}

/**
 * Price History Repository
 */
class PriceHistoryRepository extends BaseRepository<PriceHistoryRow, PriceHistoryInsert, PriceHistoryUpdate> {
  constructor() {
    super('price_history');
  }

  async findAllWithFilters(filters: any = {}, pagination: { page: number; limit: number }) {
    try {
      let query = supabase
        .from('price_history')
        .select(`
          *,
          fuel_types!inner(name, code),
          trading_points!inner(name, code),
          networks!inner(name, code)
        `, { count: 'exact' });

      // Применение фильтров
      if (filters.fuelTypeId) {
        query = query.eq('fuel_type_id', filters.fuelTypeId);
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      if (filters.priceType) {
        query = query.eq('price_type', filters.priceType);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('effective_from', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('effective_from', filters.dateRange.end.toISOString());
        }
      }

      // Сортировка и пагинация
      const offset = (pagination.page - 1) * pagination.limit;
      query = query
        .order('effective_from', { ascending: false })
        .range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / pagination.limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
  }

  async findById(id: string): Promise<PriceHistoryRow | null> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          *,
          fuel_types(name, code),
          trading_points(name, code),
          networks(name, code)
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async create(priceData: any): Promise<PriceHistoryRow> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .insert({
          fuel_type_id: priceData.fuel_type_id,
          trading_point_id: priceData.trading_point_id,
          network_id: priceData.network_id,
          price: priceData.price,
          price_type: priceData.price_type,
          effective_from: priceData.effective_from,
          effective_to: priceData.effective_to,
          is_active: priceData.is_active,
          created_by: priceData.created_by,
          reason: priceData.reason,
          metadata: priceData.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async update(id: string, updates: any): Promise<PriceHistoryRow> {
    try {
      const updateData: any = {};
      
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.effective_to !== undefined) updateData.effective_to = updates.effective_to;
      if (updates.reason !== undefined) updateData.reason = updates.reason;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.updated_by !== undefined) updateData.updated_by = updates.updated_by;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('price_history')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async deactivatePreviousPrices(fuelTypeId: string, tradingPointId: string, effectiveFrom: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('price_history')
        .update({
          is_active: false,
          effective_to: effectiveFrom,
          updated_at: new Date().toISOString()
        })
        .eq('fuel_type_id', fuelTypeId)
        .eq('trading_point_id', tradingPointId)
        .eq('is_active', true)
        .lt('effective_from', effectiveFrom);

      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCurrentPrices(filters: any = {}): Promise<any[]> {
    try {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('price_history')
        .select(`
          *,
          fuel_types(name, code, category),
          trading_points(name, code)
        `)
        .eq('is_active', true)
        .lte('effective_from', now)
        .or(`effective_to.is.null,effective_to.gte.${now}`);

      if (filters.fuelTypeId) {
        query = query.eq('fuel_type_id', filters.fuelTypeId);
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async getPriceChanges(days: number, filters: any = {}): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let query = supabase
        .from('price_history')
        .select(`
          *,
          fuel_types(name, code),
          trading_points(name, code)
        `)
        .gte('effective_from', startDate.toISOString());

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query
        .order('effective_from', { ascending: false });

      if (error) throw error;

      // Группировка изменений по топливу и торговой точке
      const changes = (data || []).reduce((acc: any[], item: any) => {
        const key = `${item.fuel_type_id}-${item.trading_point_id}`;
        
        if (!acc.find(change => change.key === key)) {
          acc.push({
            key,
            fuel_type_id: item.fuel_type_id,
            fuel_type_name: item.fuel_types?.name,
            trading_point_id: item.trading_point_id,
            trading_point_name: item.trading_points?.name,
            current_price: item.price,
            change_date: item.effective_from,
            reason: item.reason
          });
        }
        
        return acc;
      }, []);

      return changes;
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }
}

// Экспорт singleton экземпляров
export const networksRepository = new NetworksRepository();
export const fuelTypesRepository = new FuelTypesRepository();
export const usersRepository = new UsersRepository();
export const operationsRepository = new OperationsRepository();
export const priceHistoryRepository = new PriceHistoryRepository();

/**
 * Репозиторий для работы с остатками топлива
 */
export class FuelStocksRepository extends BaseRepository<FuelStockRow, FuelStockInsert, FuelStockUpdate> {
  constructor() {
    super('fuel_stocks');
  }

  async findAllWithFilters(filters: any = {}, pagination: { page: number; limit: number }): Promise<{
    data: FuelStockRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let query = supabase
        .from('fuel_stocks')
        .select(`
          *,
          fuel_types(id, name, code, category),
          trading_points(id, name, code, address),
          tanks(id, name, type, capacity)
        `, { count: 'exact' });

      // Фильтры
      if (filters.fuelTypeId) {
        query = query.eq('fuel_type_id', filters.fuelTypeId);
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      if (filters.tankId) {
        query = query.eq('tank_id', filters.tankId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.hasAlerts) {
        query = query.not('alerts', 'is', null)
              .neq('alerts', '[]');
      }

      // Пагинация
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await query
        .order('last_measurement', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  }

  async findById(id: string): Promise<FuelStockRow | null> {
    try {
      const { data, error } = await supabase
        .from('fuel_stocks')
        .select(`
          *,
          fuel_types(id, name, code, category),
          trading_points(id, name, code, address),
          tanks(id, name, type, capacity, location)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async updateMeasurement(id: string, measurementData: any): Promise<FuelStockRow> {
    try {
      // Определяем статус на основе уровня топлива
      const stock = await this.findById(id);
      if (!stock) throw new Error('Stock not found');

      const fillLevel = (measurementData.current_volume / stock.capacity) * 100;
      let status: string = 'normal';
      let alerts: string[] = [];

      if (fillLevel <= (stock.minimum_level || 10)) {
        if (fillLevel <= 5) {
          status = 'critical';
          alerts.push('Critical fuel level - immediate refill required');
        } else {
          status = 'low_level';
          alerts.push('Low fuel level - refill recommended');
        }
      } else if (fillLevel >= (stock.maximum_level || 95)) {
        status = 'high_level';
        alerts.push('High fuel level - check for overflow risk');
      }

      // Проверка на наличие воды
      if (measurementData.water_level && measurementData.water_level > 5) {
        alerts.push('Water contamination detected');
        if (status === 'normal') status = 'maintenance';
      }

      const updateData = {
        ...measurementData,
        status,
        alerts: alerts.length > 0 ? alerts : null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('fuel_stocks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async createMeasurementHistory(historyData: any): Promise<FuelMeasurementRow> {
    try {
      const insertData: FuelMeasurementInsert = {
        tank_id: historyData.tank_id,
        fuel_type_id: historyData.fuel_type_id,
        volume: historyData.volume,
        temperature: historyData.temperature,
        density: historyData.density,
        water_level: historyData.water_level,
        measurement_method: historyData.measurement_method || 'manual',
        measured_by: historyData.measured_by,
        notes: historyData.notes,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('fuel_measurement_history')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getStockAlerts(filters: any = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('fuel_stocks')
        .select(`
          id,
          tank_id,
          fuel_type_id,
          trading_point_id,
          current_volume,
          capacity,
          status,
          alerts,
          last_measurement,
          fuel_types(name, code),
          trading_points(name, code),
          tanks(name, type)
        `)
        .neq('status', 'normal')
        .not('alerts', 'is', null);

      if (filters.severity) {
        const severityMap: Record<string, string[]> = {
          'critical': ['critical'],
          'high': ['high_level', 'critical'],
          'medium': ['low_level', 'maintenance'],
          'low': ['normal']
        };
        
        if (severityMap[filters.severity]) {
          query = query.in('status', severityMap[filters.severity]);
        }
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query
        .order('status', { ascending: false })
        .order('last_measurement', { ascending: false });

      if (error) throw error;

      return (data || []).map(stock => ({
        ...stock,
        severity: this.getSeverityFromStatus(stock.status),
        fill_level: (stock.current_volume / stock.capacity) * 100
      }));
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async getMeasurementHistory(filters: any = {}, pagination: { page: number; limit: number }): Promise<{
    data: FuelMeasurementRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let query = supabase
        .from('fuel_measurement_history')
        .select(`
          *,
          fuel_types(name, code),
          tanks(name, trading_point_id),
          users(full_name)
        `, { count: 'exact' });

      if (filters.tankId) {
        query = query.eq('tank_id', filters.tankId);
      }

      if (filters.fuelTypeId) {
        query = query.eq('fuel_type_id', filters.fuelTypeId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        // Фильтр по торговым точкам через подзапрос к резервуарам
        const { data: tanksData } = await supabase
          .from('tanks')
          .select('id')
          .in('trading_point_id', filters.tradingPointIds);
        
        if (tanksData && tanksData.length > 0) {
          const tankIds = tanksData.map(tank => tank.id);
          query = query.in('tank_id', tankIds);
        }
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('created_at', filters.dateRange.end.toISOString());
        }
      }

      // Пагинация
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return {
        data: [],
        pagination: { page: 1, limit: 100, total: 0, pages: 0 }
      };
    }
  }

  async exportStocks(filters: any = {}, options: { format: 'csv' | 'xlsx' | 'json'; includeHistory?: boolean }): Promise<string> {
    try {
      const stocksResult = await this.findAllWithFilters(filters, { page: 1, limit: 10000 });
      const stocks = stocksResult.data;

      if (options.format === 'json') {
        const exportData: any = { stocks };
        
        if (options.includeHistory) {
          const historyResult = await this.getMeasurementHistory(filters, { page: 1, limit: 10000 });
          exportData.measurement_history = historyResult.data;
        }
        
        return JSON.stringify(exportData, null, 2);
      }

      // CSV format
      const headers = [
        'ID', 'Tank Name', 'Fuel Type', 'Trading Point', 'Current Volume', 'Capacity',
        'Fill Level %', 'Status', 'Temperature', 'Density', 'Water Level', 'Last Measurement', 'Alerts'
      ];
      
      let csv = headers.join(',') + '\n';
      
      stocks.forEach(stock => {
        const fillLevel = stock.capacity > 0 ? ((stock.current_volume || 0) / stock.capacity * 100).toFixed(2) : '0';
        const alerts = Array.isArray(stock.alerts) ? stock.alerts.join('; ') : '';
        
        const row = [
          stock.id,
          `"${(stock as any).tanks?.name || ''}"`,
          `"${(stock as any).fuel_types?.name || ''}"`,
          `"${(stock as any).trading_points?.name || ''}"`,
          stock.current_volume || 0,
          stock.capacity || 0,
          fillLevel,
          stock.status || '',
          stock.temperature || '',
          stock.density || '',
          stock.water_level || '',
          stock.last_measurement || '',
          `"${alerts}"`
        ];
        csv += row.join(',') + '\n';
      });
      
      return csv;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private getSeverityFromStatus(status: string): string {
    const severityMap: Record<string, string> = {
      'critical': 'critical',
      'low_level': 'medium',
      'high_level': 'medium',
      'maintenance': 'medium',
      'normal': 'low'
    };
    return severityMap[status] || 'low';
  }
}

export const fuelStocksRepository = new FuelStocksRepository();

/**
 * Репозиторий для работы с журналом оборудования
 */
export class EquipmentLogRepository extends BaseRepository<EquipmentLogRow, EquipmentLogInsert, EquipmentLogUpdate> {
  constructor() {
    super('equipment_log');
  }

  async findAllWithFilters(filters: any = {}, pagination: { page: number; limit: number }): Promise<{
    data: EquipmentLogRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let query = supabase
        .from('equipment_log')
        .select(`
          *,
          equipment(id, name, type, model, serial_number),
          trading_points(id, name, code, address),
          networks(name),
          users!performed_by(full_name, email)
        `, { count: 'exact' });

      // Фильтры
      if (filters.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters.eventCategory) {
        query = query.eq('event_category', filters.eventCategory);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.performedBy) {
        query = query.eq('performed_by', filters.performedBy);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('start_time', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('start_time', filters.dateRange.end.toISOString());
        }
      }

      // Пагинация
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await query
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  }

  async findById(id: string): Promise<EquipmentLogRow | null> {
    try {
      const { data, error } = await supabase
        .from('equipment_log')
        .select(`
          *,
          equipment(id, name, type, model, serial_number, installation_date),
          trading_points(id, name, code, address),
          networks(name),
          users!performed_by(full_name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async create(logData: any): Promise<EquipmentLogRow> {
    try {
      const insertData: EquipmentLogInsert = {
        equipment_id: logData.equipment_id,
        trading_point_id: logData.trading_point_id,
        network_id: logData.network_id,
        event_type: logData.event_type,
        event_category: logData.event_category || 'scheduled',
        severity: logData.severity || 'medium',
        status: logData.status || 'pending',
        title: logData.title,
        description: logData.description,
        performed_by: logData.performed_by,
        start_time: logData.start_time || new Date().toISOString(),
        end_time: logData.end_time,
        duration_minutes: logData.duration_minutes,
        cost: logData.cost,
        parts_used: logData.parts_used || [],
        notes: logData.notes,
        attachments: logData.attachments || [],
        next_scheduled_date: logData.next_scheduled_date,
        metadata: logData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('equipment_log')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async update(id: string, updates: any): Promise<EquipmentLogRow> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('equipment_log')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getScheduledMaintenance(filters: any = {}): Promise<any[]> {
    try {
      const daysAhead = filters.daysAhead || 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      let query = supabase
        .from('equipment_log')
        .select(`
          *,
          equipment(id, name, type, model),
          trading_points(name, code)
        `)
        .eq('event_category', 'scheduled')
        .in('status', ['pending', 'in_progress'])
        .not('next_scheduled_date', 'is', null)
        .lte('next_scheduled_date', futureDate.toISOString().split('T')[0]);

      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      if (filters.equipmentType) {
        // Фильтр по типу оборудования через JOIN
        const { data: equipmentIds } = await supabase
          .from('equipment')
          .select('id')
          .eq('type', filters.equipmentType);
        
        if (equipmentIds && equipmentIds.length > 0) {
          const ids = equipmentIds.map(eq => eq.id);
          query = query.in('equipment_id', ids);
        }
      }

      const { data, error } = await query
        .order('next_scheduled_date', { ascending: true });

      if (error) throw error;

      // Добавляем расчетные поля
      const now = new Date();
      return (data || []).map(task => {
        const scheduledDate = new Date(task.next_scheduled_date);
        const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...task,
          days_until: daysUntil,
          is_overdue: daysUntil < 0,
          urgency: daysUntil < 0 ? 'overdue' : 
                  daysUntil <= 3 ? 'urgent' : 
                  daysUntil <= 7 ? 'soon' : 'scheduled'
        };
      });
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async getMaintenanceStatistics(filters: any = {}): Promise<any> {
    try {
      const startDate = filters.startDate || new Date(new Date().getFullYear(), 0, 1); // Начало года
      const endDate = filters.endDate || new Date();

      let query = supabase
        .from('equipment_log')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        query = query.eq('network_id', filters.networkId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const logs = data || [];
      
      return {
        totalTasks: logs.length,
        completedTasks: logs.filter(log => log.status === 'completed').length,
        pendingTasks: logs.filter(log => log.status === 'pending').length,
        inProgressTasks: logs.filter(log => log.status === 'in_progress').length,
        failedTasks: logs.filter(log => log.status === 'failed').length,
        totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
        averageDuration: logs.length > 0 
          ? logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / logs.length 
          : 0,
        tasksByType: this.groupByField(logs, 'event_type'),
        tasksByCategory: this.groupByField(logs, 'event_category'),
        tasksBySeverity: this.groupByField(logs, 'severity'),
        monthlyStats: this.getMonthlyStats(logs)
      };
    } catch (error) {
      this.handleError(error);
      return {};
    }
  }

  async exportLog(filters: any = {}, options: { format: 'csv' | 'xlsx' | 'json' }): Promise<string> {
    try {
      const result = await this.findAllWithFilters(filters, { page: 1, limit: 10000 });
      const logs = result.data;

      if (options.format === 'json') {
        return JSON.stringify(logs, null, 2);
      }

      // CSV format
      const headers = [
        'ID', 'Equipment Name', 'Trading Point', 'Event Type', 'Category', 'Severity',
        'Status', 'Title', 'Description', 'Performed By', 'Start Time', 'End Time',
        'Duration (min)', 'Cost', 'Notes'
      ];
      
      let csv = headers.join(',') + '\n';
      
      logs.forEach(log => {
        const row = [
          log.id,
          `"${(log as any).equipment?.name || ''}"`,
          `"${(log as any).trading_points?.name || ''}"`,
          log.event_type,
          log.event_category,
          log.severity,
          log.status,
          `"${log.title}"`,
          `"${log.description.replace(/"/g, '""')}"`,
          `"${(log as any).users?.full_name || ''}"`,
          log.start_time,
          log.end_time || '',
          log.duration_minutes || '',
          log.cost || '',
          `"${(log.notes || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });
      
      return csv;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      const value = item[field] || 'unknown';
      grouped[value] = (grouped[value] || 0) + 1;
    });
    return grouped;
  }

  private getMonthlyStats(logs: any[]): any[] {
    const monthlyData: Record<string, any> = {};
    
    logs.forEach(log => {
      const date = new Date(log.start_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalTasks: 0,
          completedTasks: 0,
          totalCost: 0,
          averageDuration: 0
        };
      }
      
      monthlyData[monthKey].totalTasks++;
      if (log.status === 'completed') monthlyData[monthKey].completedTasks++;
      monthlyData[monthKey].totalCost += (log.cost || 0);
    });
    
    // Вычисляем средние значения
    Object.values(monthlyData).forEach((month: any) => {
      month.averageDuration = month.totalTasks > 0 
        ? logs.filter(log => log.start_time.startsWith(month.month))
              .reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / month.totalTasks
        : 0;
    });
    
    return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }
}

export const equipmentLogRepository = new EquipmentLogRepository();

/**
 * Репозиторий для работы с резервуарами
 */
export class TanksRepository extends BaseRepository<TankRow, TankInsert, TankUpdate> {
  constructor() {
    super('tanks');
  }

  async findAllWithFilters(filters: any = {}, pagination: { page: number; limit: number }): Promise<{
    data: TankRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let query = supabase
        .from('tanks')
        .select(`
          *,
          fuel_types(id, name, code, category),
          trading_points(id, name, code, address),
          equipment(id, name, serial_number, status)
        `, { count: 'exact' });

      // Фильтры
      if (filters.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters.tradingPointIds && filters.tradingPointIds.length > 0) {
        query = query.in('trading_point_id', filters.tradingPointIds);
      }

      if (filters.networkId) {
        // Фильтр через торговые точки
        const { data: tradingPointsData } = await supabase
          .from('trading_points')
          .select('id')
          .eq('network_id', filters.networkId);
        
        if (tradingPointsData && tradingPointsData.length > 0) {
          const pointIds = tradingPointsData.map(tp => tp.id);
          query = query.in('trading_point_id', pointIds);
        }
      }

      if (filters.fuelTypeId) {
        query = query.eq('fuel_type_id', filters.fuelTypeId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.hasAlerts) {
        // Фильтр резервуаров с предупреждениями (низкий уровень, переполнение)
        query = query.or('current_volume.lt.min_volume,current_volume.gt.max_volume');
      }

      // Пагинация
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Добавляем вычисляемые поля
      const enrichedData = (data || []).map(tank => ({
        ...tank,
        fill_percentage: tank.capacity > 0 ? (tank.current_volume / tank.capacity) * 100 : 0,
        alerts: this.generateTankAlerts(tank),
        sensors: this.generateTankSensors(tank)
      }));

      return {
        data: enrichedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  }

  async findById(id: string): Promise<TankRow | null> {
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select(`
          *,
          fuel_types(id, name, code, category),
          trading_points(id, name, code, address, network_id),
          equipment(id, name, serial_number, status, installation_date)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Добавляем вычисляемые поля
      const enrichedTank = {
        ...data,
        fill_percentage: data.capacity > 0 ? (data.current_volume / data.capacity) * 100 : 0,
        alerts: this.generateTankAlerts(data),
        sensors: this.generateTankSensors(data),
        network_id: (data as any).trading_points?.network_id
      };

      return enrichedTank;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async create(tankData: any): Promise<TankRow> {
    try {
      const insertData: TankInsert = {
        trading_point_id: tankData.trading_point_id,
        equipment_id: tankData.equipment_id,
        fuel_type_id: tankData.fuel_type_id,
        name: tankData.name,
        code: tankData.code,
        capacity: tankData.capacity,
        current_volume: tankData.current_volume || 0,
        min_volume: tankData.min_volume || 0,
        max_volume: tankData.max_volume || tankData.capacity,
        status: tankData.status || 'active',
        settings: tankData.settings || {},
        metadata: tankData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tanks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async update(id: string, updates: any): Promise<TankRow> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tanks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async updateCalibration(id: string, calibrationData: any): Promise<TankRow> {
    try {
      const updateData = {
        current_volume: calibrationData.current_volume,
        last_calibration: calibrationData.last_calibration,
        metadata: calibrationData.metadata,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tanks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async createTankEvent(eventData: any): Promise<TankEventRow> {
    try {
      const insertData: TankEventInsert = {
        tank_id: eventData.tank_id,
        event_type: eventData.event_type,
        title: eventData.title,
        description: eventData.description,
        performed_by: eventData.performed_by,
        severity: eventData.severity || 'info',
        metadata: eventData.metadata || {},
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tank_events')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getTankEvents(filters: any = {}, pagination: { page: number; limit: number }): Promise<{
    data: TankEventRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let query = supabase
        .from('tank_events')
        .select(`
          *,
          users!performed_by(full_name, email),
          tanks(name, code)
        `, { count: 'exact' });

      if (filters.tankId) {
        query = query.eq('tank_id', filters.tankId);
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('created_at', filters.dateRange.end.toISOString());
        }
      }

      // Пагинация
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      this.handleError(error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  }

  async exportTanks(filters: any = {}, options: { format: 'csv' | 'xlsx' | 'json'; includeEvents?: boolean }): Promise<string> {
    try {
      const tanksResult = await this.findAllWithFilters(filters, { page: 1, limit: 10000 });
      const tanks = tanksResult.data;

      if (options.format === 'json') {
        const exportData: any = { tanks };
        
        if (options.includeEvents) {
          const eventsResult = await this.getTankEvents(filters, { page: 1, limit: 10000 });
          exportData.tank_events = eventsResult.data;
        }
        
        return JSON.stringify(exportData, null, 2);
      }

      // CSV format
      const headers = [
        'ID', 'Name', 'Code', 'Trading Point', 'Fuel Type', 'Capacity (L)', 'Current Volume (L)',
        'Fill Level %', 'Min Volume (L)', 'Max Volume (L)', 'Status', 'Last Calibration', 'Alerts'
      ];
      
      let csv = headers.join(',') + '\n';
      
      tanks.forEach(tank => {
        const fillLevel = tank.capacity > 0 ? ((tank.current_volume || 0) / tank.capacity * 100).toFixed(2) : '0';
        const alerts = Array.isArray(tank.alerts) ? tank.alerts.join('; ') : '';
        
        const row = [
          tank.id,
          `"${tank.name}"`,
          tank.code,
          `"${(tank as any).trading_points?.name || ''}"`,
          `"${(tank as any).fuel_types?.name || ''}"`,
          tank.capacity || 0,
          tank.current_volume || 0,
          fillLevel,
          tank.min_volume || 0,
          tank.max_volume || 0,
          tank.status || '',
          tank.last_calibration || '',
          `"${alerts}"`
        ];
        csv += row.join(',') + '\n';
      });
      
      return csv;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private generateTankAlerts(tank: any): string[] {
    const alerts: string[] = [];
    
    if (!tank.capacity || tank.capacity <= 0) return alerts;
    
    const fillPercentage = (tank.current_volume || 0) / tank.capacity * 100;
    const minPercentage = ((tank.min_volume || 0) / tank.capacity) * 100;
    const maxPercentage = ((tank.max_volume || tank.capacity) / tank.capacity) * 100;
    
    // Проверка критических уровней
    if (fillPercentage <= 5) {
      alerts.push('Критический уровень топлива');
    } else if (fillPercentage <= minPercentage) {
      alerts.push('Низкий уровень топлива');
    }
    
    if (fillPercentage >= maxPercentage) {
      alerts.push('Превышен максимальный уровень');
    }
    
    // Проверка статуса
    if (tank.status === 'maintenance') {
      alerts.push('Резервуар на обслуживании');
    } else if (tank.status === 'error') {
      alerts.push('Ошибка резервуара');
    } else if (tank.status === 'offline') {
      alerts.push('Резервуар отключен');
    }
    
    // Проверка калибровки (старше 90 дней)
    if (tank.last_calibration) {
      const lastCalibration = new Date(tank.last_calibration);
      const daysSinceCalibration = Math.floor((Date.now() - lastCalibration.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCalibration > 90) {
        alerts.push('Требуется калибровка');
      }
    } else {
      alerts.push('Калибровка не выполнялась');
    }
    
    return alerts;
  }

  private generateTankSensors(tank: any): Array<{ name: string; status: string; value?: string }> {
    // Базовые датчики для всех резервуаров
    const sensors = [
      {
        name: 'Уровень топлива',
        status: tank.current_volume !== undefined ? 'ok' : 'error',
        value: tank.current_volume ? `${tank.current_volume}L` : undefined
      },
      {
        name: 'Система измерения',
        status: tank.status === 'active' ? 'ok' : 'error'
      }
    ];
    
    // Дополнительные датчики из метаданных
    if (tank.metadata?.temperature !== undefined) {
      sensors.push({
        name: 'Температура',
        status: 'ok',
        value: `${tank.metadata.temperature}°C`
      });
    }
    
    if (tank.metadata?.water_level !== undefined) {
      sensors.push({
        name: 'Уровень воды',
        status: tank.metadata.water_level > 10 ? 'warning' : 'ok',
        value: `${tank.metadata.water_level}mm`
      });
    }
    
    return sensors;
  }
}

// ===============================================
// EQUIPMENT REPOSITORY
// ===============================================

export interface EquipmentData {
  id?: string;
  trading_point_id: string;
  template_id: string;
  name: string;
  system_type: string;
  display_name: string;
  serial_number?: string;
  external_id?: string;
  status: 'online' | 'offline' | 'error' | 'disabled' | 'archived' | 'maintenance';
  installation_date: string;
  params?: Record<string, any>;
  bindings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateEquipmentData {
  trading_point_id: string;
  template_id: string;
  display_name: string;
  serial_number?: string;
  external_id?: string;
  installation_date: string;
  custom_params?: Record<string, any>;
  bindings?: Record<string, any>;
}

export interface UpdateEquipmentData {
  display_name?: string;
  serial_number?: string;
  external_id?: string;
  installation_date?: string;
  params?: Record<string, any>;
  bindings?: Record<string, any>;
}

export interface EquipmentFilters {
  trading_point_id: string;
  search?: string;
  template_id?: string;
  system_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface EquipmentEvent {
  id: string;
  equipment_id: string;
  event_type: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  details: Record<string, any>;
}

export class EquipmentRepository {
  /**
   * Получить список оборудования с фильтрацией и пагинацией
   */
  async list(filters: EquipmentFilters, networkId?: string): Promise<PaginatedResponse<EquipmentData>> {
    const { data, error, count } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_templates(name, system_type),
        trading_points!inner(network_id)
      `, { count: 'exact' })
      .eq('trading_points.network_id', networkId || '')
      .eq('trading_point_id', filters.trading_point_id)
      .ilike('display_name', filters.search ? `%${filters.search}%` : '%')
      .eq('template_id', filters.template_id || filters.template_id)
      .eq('system_type', filters.system_type || filters.system_type)
      .eq('status', filters.status || filters.status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(
        ((filters.page || 1) - 1) * (filters.limit || 50),
        (filters.page || 1) * (filters.limit || 50) - 1
      );

    if (error) {
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    // Добавляем количество компонентов для каждого оборудования
    const equipmentWithComponents = await Promise.all(
      (data || []).map(async (equipment: any) => {
        const { count: componentsCount } = await supabase
          .from('components')
          .select('*', { count: 'exact', head: true })
          .eq('equipment_id', equipment.id)
          .is('deleted_at', null);

        return {
          ...equipment,
          componentsCount: componentsCount || 0
        };
      })
    );

    return {
      data: equipmentWithComponents,
      total: count || 0,
      page: filters.page || 1,
      limit: filters.limit || 50,
      has_more: ((filters.page || 1) * (filters.limit || 50)) < (count || 0)
    };
  }

  /**
   * Создать новое оборудование
   */
  async create(data: CreateEquipmentData, userId?: string): Promise<EquipmentData> {
    // Получаем шаблон оборудования
    const { data: template, error: templateError } = await supabase
      .from('equipment_templates')
      .select('*')
      .eq('id', data.template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Equipment template not found');
    }

    // Создаем оборудование с параметрами из шаблона
    const equipmentData = {
      trading_point_id: data.trading_point_id,
      template_id: data.template_id,
      name: template.name,
      system_type: template.system_type,
      display_name: data.display_name,
      serial_number: data.serial_number,
      external_id: data.external_id,
      status: 'offline' as const,
      installation_date: data.installation_date,
      params: {
        ...template.default_params,
        ...data.custom_params
      },
      bindings: data.bindings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: equipment, error } = await supabase
      .from('equipment')
      .insert(equipmentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create equipment: ${error.message}`);
    }

    // Логируем событие создания
    await this.logEvent(equipment.id, 'created', userId, { initial_status: 'offline' });

    return equipment;
  }

  /**
   * Получить оборудование по ID
   */
  async getById(id: string, networkId?: string): Promise<EquipmentData | null> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_templates(name, system_type, technical_code),
        trading_points!inner(network_id, name)
      `)
      .eq('id', id)
      .eq('trading_points.network_id', networkId || '')
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Обновить оборудование
   */
  async update(id: string, data: UpdateEquipmentData, networkId?: string, userId?: string): Promise<EquipmentData | null> {
    const { data: equipment, error } = await supabase
      .from('equipment')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        trading_points!inner(network_id)
      `)
      .eq('trading_points.network_id', networkId || '')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update equipment: ${error.message}`);
    }

    if (equipment) {
      // Логируем событие обновления
      await this.logEvent(id, 'updated', userId, { updated_fields: Object.keys(data) });
    }

    return equipment || null;
  }

  /**
   * Изменить статус оборудования
   */
  async setStatus(id: string, action: 'enable' | 'disable' | 'archive', networkId?: string, userId?: string): Promise<boolean> {
    const statusMap = {
      enable: 'online',
      disable: 'disabled',
      archive: 'archived'
    } as const;

    const updateData: any = {
      status: statusMap[action],
      updated_at: new Date().toISOString()
    };

    if (action === 'archive') {
      updateData.deleted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        trading_points!inner(network_id)
      `)
      .eq('trading_points.network_id', networkId || '')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update equipment status: ${error.message}`);
    }

    if (data) {
      // Логируем событие изменения статуса
      await this.logEvent(id, 'status_changed', userId, { 
        action,
        new_status: statusMap[action]
      });
      return true;
    }

    return false;
  }

  /**
   * Удалить оборудование (физическое удаление)
   */
  async delete(id: string, networkId?: string, userId?: string): Promise<boolean> {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)
      .select(`
        trading_points!inner(network_id)
      `)
      .eq('trading_points.network_id', networkId || '');

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }

    // Логируем событие удаления
    await this.logEvent(id, 'deleted', userId, {});

    return true;
  }

  /**
   * Получить события оборудования
   */
  async getEvents(equipmentId: string, networkId?: string, pagination: PaginationParams = {}): Promise<PaginatedResponse<EquipmentEvent>> {
    const { page = 1, limit = 50 } = pagination;

    const { data, error, count } = await supabase
      .from('equipment_events')
      .select(`
        *,
        equipment!inner(
          trading_points!inner(network_id)
        )
      `, { count: 'exact' })
      .eq('equipment_id', equipmentId)
      .eq('equipment.trading_points.network_id', networkId || '')
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(`Failed to fetch equipment events: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      has_more: (page * limit) < (count || 0)
    };
  }

  /**
   * Получить компоненты оборудования
   */
  async getComponents(equipmentId: string, networkId?: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('components')
      .select(`
        *,
        equipment!inner(
          trading_points!inner(network_id)
        )
      `)
      .eq('equipment_id', equipmentId)
      .eq('equipment.trading_points.network_id', networkId || '')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch equipment components: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Проверить доступ к торговой точке
   */
  async checkTradingPointAccess(tradingPointId: string, networkId?: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('trading_points')
      .select('id')
      .eq('id', tradingPointId)
      .eq('network_id', networkId || '')
      .single();

    return !error && !!data;
  }

  /**
   * Логирование событий оборудования
   */
  private async logEvent(equipmentId: string, eventType: string, userId?: string, details: Record<string, any> = {}) {
    try {
      await supabase
        .from('equipment_events')
        .insert({
          equipment_id: equipmentId,
          event_type: eventType,
          user_id: userId,
          timestamp: new Date().toISOString(),
          details
        });
    } catch (error) {
      console.error('Failed to log equipment event:', error);
      // Не прерываем основной процесс при ошибке логирования
    }
  }

  /**
   * Получить статистику оборудования
   */
  async getStatistics(networkId?: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        status,
        system_type,
        trading_points!inner(network_id)
      `)
      .eq('trading_points.network_id', networkId || '')
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to fetch equipment statistics: ${error.message}`);
    }

    // Агрегируем статистику
    const stats = {
      total: data.length,
      by_status: {},
      by_type: {}
    } as any;

    data.forEach((item: any) => {
      stats.by_status[item.status] = (stats.by_status[item.status] || 0) + 1;
      stats.by_type[item.system_type] = (stats.by_type[item.system_type] || 0) + 1;
    });

    return stats;
  }
}

// ===============================================
// TRADING POINTS REPOSITORY
// ===============================================

export interface TradingPointData {
  id?: string;
  network_id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  schedule?: Record<string, any>;
  services?: Record<string, boolean>;
  external_codes?: Array<{ system: string; code: string }>;
  is_blocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTradingPointData {
  network_id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  schedule?: Record<string, any>;
  services?: Record<string, boolean>;
  external_codes?: Array<{ system: string; code: string }>;
  is_blocked?: boolean;
}

export interface UpdateTradingPointData {
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  schedule?: Record<string, any>;
  services?: Record<string, boolean>;
  external_codes?: Array<{ system: string; code: string }>;
  is_blocked?: boolean;
}

export interface TradingPointFilters {
  network_id?: string;
  search?: string;
  is_blocked?: boolean;
  page?: number;
  limit?: number;
}

export class TradingPointsRepository {
  /**
   * Получить список торговых точек с фильтрацией и пагинацией
   */
  async list(filters: TradingPointFilters): Promise<PaginatedResponse<TradingPointData>> {
    const { data, error, count } = await supabase
      .from('trading_points')
      .select(`
        *,
        networks!inner(name)
      `, { count: 'exact' })
      .eq('network_id', filters.network_id || filters.network_id)
      .eq('is_blocked', filters.is_blocked ?? filters.is_blocked)
      .or(filters.search ? `name.ilike.%${filters.search}%,address.ilike.%${filters.search}%` : '1=1')
      .order('created_at', { ascending: false })
      .range(
        ((filters.page || 1) - 1) * (filters.limit || 50),
        (filters.page || 1) * (filters.limit || 50) - 1
      );

    if (error) {
      throw new Error(`Failed to fetch trading points: ${error.message}`);
    }

    // Добавляем количество оборудования для каждой торговой точки
    const pointsWithEquipment = await Promise.all(
      (data || []).map(async (point: any) => {
        const { count: equipmentCount } = await supabase
          .from('equipment')
          .select('*', { count: 'exact', head: true })
          .eq('trading_point_id', point.id)
          .is('deleted_at', null);

        return {
          ...point,
          equipmentCount: equipmentCount || 0
        };
      })
    );

    return {
      data: pointsWithEquipment,
      total: count || 0,
      page: filters.page || 1,
      limit: filters.limit || 50,
      has_more: ((filters.page || 1) * (filters.limit || 50)) < (count || 0)
    };
  }

  /**
   * Создать новую торговую точку
   */
  async create(data: CreateTradingPointData, userId?: string): Promise<TradingPointData> {
    const pointData = {
      ...data,
      is_blocked: data.is_blocked || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: tradingPoint, error } = await supabase
      .from('trading_points')
      .insert(pointData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trading point: ${error.message}`);
    }

    return tradingPoint;
  }

  /**
   * Получить торговую точку по ID
   */
  async getById(id: string, networkId?: string): Promise<TradingPointData | null> {
    let query = supabase
      .from('trading_points')
      .select(`
        *,
        networks(name)
      `)
      .eq('id', id);

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch trading point: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Обновить торговую точку
   */
  async update(id: string, data: UpdateTradingPointData, networkId?: string, userId?: string): Promise<TradingPointData | null> {
    let query = supabase
      .from('trading_points')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { data: tradingPoint, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update trading point: ${error.message}`);
    }

    return tradingPoint || null;
  }

  /**
   * Удалить торговую точку
   */
  async delete(id: string, networkId?: string, userId?: string): Promise<boolean> {
    // Проверяем наличие оборудования
    const { count: equipmentCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('trading_point_id', id)
      .is('deleted_at', null);

    if (equipmentCount && equipmentCount > 0) {
      throw new Error('Cannot delete trading point: equipment exists');
    }

    let query = supabase
      .from('trading_points')
      .delete()
      .eq('id', id);

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { error } = await query;

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to delete trading point: ${error.message}`);
    }

    return true;
  }

  /**
   * Переключить статус блокировки торговой точки
   */
  async toggleBlock(id: string, networkId?: string, userId?: string): Promise<TradingPointData | null> {
    // Сначала получаем текущий статус
    const current = await this.getById(id, networkId);
    if (!current) return null;

    const { data: tradingPoint, error } = await supabase
      .from('trading_points')
      .update({
        is_blocked: !current.is_blocked,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('network_id', networkId || current.network_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle trading point block status: ${error.message}`);
    }

    return tradingPoint;
  }

  /**
   * Получить оборудование торговой точки
   */
  async getEquipment(tradingPointId: string, networkId?: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        trading_points!inner(network_id)
      `)
      .eq('trading_point_id', tradingPointId)
      .eq('trading_points.network_id', networkId || '')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trading point equipment: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить статистику торговых точек
   */
  async getStatistics(networkId?: string): Promise<Record<string, any>> {
    let query = supabase
      .from('trading_points')
      .select('is_blocked, network_id');

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch trading points statistics: ${error.message}`);
    }

    // Агрегируем статистику
    const stats = {
      total: data.length,
      active: data.filter(p => !p.is_blocked).length,
      blocked: data.filter(p => p.is_blocked).length
    };

    return stats;
  }

  /**
   * Получить торговые точки по сети
   */
  async getByNetworkId(networkId: string): Promise<TradingPointData[]> {
    const { data, error } = await supabase
      .from('trading_points')
      .select('*')
      .eq('network_id', networkId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch trading points by network: ${error.message}`);
    }

    return data || [];
  }
}

// ===============================================
// USERS REPOSITORY
// ===============================================

export interface UserData {
  id?: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  position?: string;
  role: 'operator' | 'manager' | 'network_admin' | 'system_admin';
  network_id?: string;
  trading_point_ids?: string[];
  is_active: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  position?: string;
  role: 'operator' | 'manager' | 'network_admin' | 'system_admin';
  network_id?: string;
  trading_point_ids?: string[];
  is_active?: boolean;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  position?: string;
  role?: 'operator' | 'manager' | 'network_admin' | 'system_admin';
  network_id?: string;
  trading_point_ids?: string[];
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  network_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}


// ===============================================
// ROLES REPOSITORY
// ===============================================

export interface RoleData {
  id?: string;
  name: string;
  code: string;
  description?: string;
  permissions: Array<{
    resource: string;
    action: string;
    scope?: 'global' | 'network' | 'trading_point';
    conditions?: Record<string, any>;
  }>;
  scope: 'global' | 'network' | 'trading_point';
  scope_values?: string[];
  network_id?: string;
  tenant_id: string;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateRoleData {
  name: string;
  code: string;
  description?: string;
  permissions: Array<{
    resource: string;
    action: string;
    scope?: 'global' | 'network' | 'trading_point';
    conditions?: Record<string, any>;
  }>;
  scope: 'global' | 'network' | 'trading_point';
  scope_values?: string[];
  network_id?: string;
  tenant_id: string;
  is_active?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    action: string;
    scope?: 'global' | 'network' | 'trading_point';
    conditions?: Record<string, any>;
  }>;
  scope?: 'global' | 'network' | 'trading_point';
  scope_values?: string[];
  is_active?: boolean;
}

export interface RoleFilters {
  search?: string;
  scope?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export class RolesRepository {
  /**
   * Получить список ролей с фильтрацией и пагинацией
   */
  async list(filters: RoleFilters, networkId?: string): Promise<PaginatedResponse<RoleData>> {
    let query = supabase
      .from('roles')
      .select('*', { count: 'exact' });

    // Системные роли видны всем, пользовательские - только в своей сети
    if (networkId) {
      query = query.or(`is_system.eq.true,network_id.eq.${networkId}`);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
    }

    if (filters.scope) {
      query = query.eq('scope', filters.scope);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    query = query
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(
        ((filters.page || 1) - 1) * (filters.limit || 50),
        (filters.page || 1) * (filters.limit || 50) - 1
      );

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page: filters.page || 1,
      limit: filters.limit || 50,
      has_more: ((filters.page || 1) * (filters.limit || 50)) < (count || 0)
    };
  }

  /**
   * Создать новую роль
   */
  async create(data: CreateRoleData, createdBy?: string): Promise<RoleData> {
    // Проверяем уникальность кода
    const { count } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('code', data.code)
      .is('deleted_at', null);

    if (count && count > 0) {
      throw new Error('Role with this code already exists');
    }

    const roleData = {
      ...data,
      is_system: false,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: role, error } = await supabase
      .from('roles')
      .insert(roleData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    return role;
  }

  /**
   * Получить роль по ID
   */
  async getById(id: string, networkId?: string): Promise<RoleData | null> {
    let query = supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null);

    if (networkId) {
      query = query.or(`is_system.eq.true,network_id.eq.${networkId}`);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Обновить роль
   */
  async update(id: string, data: UpdateRoleData, networkId?: string, updatedBy?: string): Promise<RoleData | null> {
    let query = supabase
      .from('roles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_system', false) // Нельзя обновлять системные роли
      .is('deleted_at', null)
      .select();

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    const { data: role, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    return role || null;
  }

  /**
   * Удалить роль
   */
  async delete(id: string, deletedBy?: string): Promise<boolean> {
    // Проверяем, не используется ли роль
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id);

    if (count && count > 0) {
      throw new Error('Cannot delete role: role is in use');
    }

    const { error } = await supabase
      .from('roles')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_system', false); // Нельзя удалять системные роли

    return !error;
  }

  /**
   * Назначить роль пользователю
   */
  async assignToUser(roleId: string, userId: string, networkId?: string, assignedBy?: string): Promise<boolean> {
    // Проверяем существование роли и пользователя
    const role = await this.getById(roleId, networkId);
    if (!role) return false;

    // Проверяем, не назначена ли уже роль
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (count && count > 0) {
      throw new Error('Role already assigned to user');
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Отозвать роль у пользователя
   */
  async unassignFromUser(roleId: string, userId: string, networkId?: string, unassignedBy?: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    return !error;
  }

  /**
   * Получить доступные разрешения
   */
  async getAvailablePermissions(): Promise<Record<string, any>> {
    // Возвращаем структуру разрешений
    return {
      users: {
        name: 'Пользователи',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      roles: {
        name: 'Роли',
        actions: ['create', 'read', 'update', 'delete', 'assign']
      },
      networks: {
        name: 'Сети',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      trading_points: {
        name: 'Торговые точки',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      equipment: {
        name: 'Оборудование',
        actions: ['create', 'read', 'update', 'delete', 'control']
      },
      operations: {
        name: 'Операции',
        actions: ['read', 'create', 'update', 'delete', 'approve']
      },
      reports: {
        name: 'Отчеты',
        actions: ['read', 'create', 'export']
      }
    };
  }
}

// ===============================================
// FUEL STOCK SNAPSHOTS REPOSITORY
// ===============================================

export interface FuelStockSnapshotData {
  id?: string;
  tank_id: string;
  fuel_stock_id?: string;
  trading_point_id: string;
  fuel_type_id: string;
  snapshot_time: string;
  current_level_liters: number;
  capacity_liters: number;
  level_percent?: number;
  temperature?: number;
  water_level_mm?: number;
  density?: number;
  tank_status?: 'active' | 'maintenance' | 'offline';
  operation_mode?: 'normal' | 'filling' | 'draining' | 'maintenance';
  consumption_rate?: number;
  fill_rate?: number;
  checksum?: string;
  data_source?: 'sensor' | 'manual' | 'generated';
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface FuelStockSnapshotFilters {
  tank_id?: string;
  trading_point_id?: string;
  fuel_type_id?: string;
  start_date?: string;
  end_date?: string;
  tank_status?: string;
  operation_mode?: string;
  data_source?: string;
  limit?: number;
  offset?: number;
}

export interface FuelStockSnapshotAnalytics {
  total_snapshots: number;
  unique_tanks: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  averages: {
    level_percent: number;
    temperature: number;
    consumption_rate: number;
  };
  status_distribution: Record<string, number>;
  operation_mode_distribution: Record<string, number>;
}

export class FuelStockSnapshotsRepository {
  
  /**
   * Получить снимки с фильтрацией
   */
  async findMany(options: {
    where?: Partial<FuelStockSnapshotData>;
    orderBy?: { [key: string]: 'asc' | 'desc' };
    take?: number;
    skip?: number;
    include?: { tank?: boolean; fuel_type?: boolean; trading_point?: boolean };
  } = {}): Promise<FuelStockSnapshotData[]> {
    let query = supabase
      .from('fuel_stock_snapshots')
      .select(`
        *,
        ${options.include?.tank ? 'tanks!inner(*),' : ''}
        ${options.include?.fuel_type ? 'fuel_types!inner(*),' : ''}
        ${options.include?.trading_point ? 'trading_points!inner(*)' : ''}
      `.replace(/,\s*$/, '')); // Убираем последнюю запятую

    // Применяем условия where
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key.includes('gte') || key.includes('lte')) {
            // Для диапазонов дат
            if (key === 'snapshot_time' && typeof value === 'object') {
              if ((value as any).gte) query = query.gte('snapshot_time', (value as any).gte);
              if ((value as any).lte) query = query.lte('snapshot_time', (value as any).lte);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    // Сортировка
    if (options.orderBy) {
      Object.entries(options.orderBy).forEach(([field, direction]) => {
        query = query.order(field, { ascending: direction === 'asc' });
      });
    } else {
      query = query.order('snapshot_time', { ascending: false });
    }

    // Пагинация
    if (options.take || options.skip) {
      const skip = options.skip || 0;
      const take = options.take || 100;
      query = query.range(skip, skip + take - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch fuel stock snapshots: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить снимок по ID
   */
  async findById(id: string, options?: { include?: { tank?: boolean; fuel_type?: boolean; trading_point?: boolean } }): Promise<FuelStockSnapshotData | null> {
    let selectClause = '*';
    if (options?.include) {
      const joins = [];
      if (options.include.tank) joins.push('tanks!inner(*)');
      if (options.include.fuel_type) joins.push('fuel_types!inner(*)');
      if (options.include.trading_point) joins.push('trading_points!inner(*)');
      if (joins.length > 0) {
        selectClause = `*, ${joins.join(', ')}`;
      }
    }

    const { data, error } = await supabase
      .from('fuel_stock_snapshots')
      .select(selectClause)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch fuel stock snapshot: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Получить первый снимок по условию
   */
  async findFirst(options: {
    where?: Partial<FuelStockSnapshotData>;
    orderBy?: { [key: string]: 'asc' | 'desc' };
    include?: { tank?: boolean; fuel_type?: boolean; trading_point?: boolean };
  }): Promise<FuelStockSnapshotData | null> {
    const results = await this.findMany({ ...options, take: 1 });
    return results[0] || null;
  }

  /**
   * Создать снимок
   */
  async create(data: Omit<FuelStockSnapshotData, 'id' | 'created_at'>): Promise<FuelStockSnapshotData> {
    const { data: snapshot, error } = await supabase
      .from('fuel_stock_snapshots')
      .insert({
        ...data,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create fuel stock snapshot: ${error.message}`);
    }

    return snapshot;
  }

  /**
   * Создать много снимков
   */
  async createMany(snapshots: Omit<FuelStockSnapshotData, 'id' | 'created_at'>[]): Promise<FuelStockSnapshotData[]> {
    const snapshotsWithTimestamp = snapshots.map(snapshot => ({
      ...snapshot,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('fuel_stock_snapshots')
      .insert(snapshotsWithTimestamp)
      .select();

    if (error) {
      throw new Error(`Failed to create fuel stock snapshots: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить аналитическую сводку
   */
  async getAnalyticsSummary(filters: {
    tradingPointId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FuelStockSnapshotAnalytics> {
    let query = supabase
      .from('fuel_stock_snapshots')
      .select('*');

    if (filters.tradingPointId) {
      query = query.eq('trading_point_id', filters.tradingPointId);
    }
    if (filters.startDate) {
      query = query.gte('snapshot_time', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('snapshot_time', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get analytics summary: ${error.message}`);
    }

    const snapshots = data || [];

    // Подсчет статистики
    const uniqueTanks = new Set(snapshots.map(s => s.tank_id)).size;
    const dates = snapshots.map(s => new Date(s.snapshot_time).getTime()).filter(Boolean);
    
    const avgLevelPercent = snapshots.length > 0 
      ? snapshots.reduce((sum, s) => sum + (s.level_percent || 0), 0) / snapshots.length 
      : 0;
    
    const avgTemperature = snapshots.filter(s => s.temperature).length > 0
      ? snapshots.filter(s => s.temperature).reduce((sum, s) => sum + (s.temperature || 0), 0) / snapshots.filter(s => s.temperature).length
      : 0;
    
    const avgConsumptionRate = snapshots.filter(s => s.consumption_rate).length > 0
      ? snapshots.filter(s => s.consumption_rate).reduce((sum, s) => sum + (s.consumption_rate || 0), 0) / snapshots.filter(s => s.consumption_rate).length
      : 0;

    // Распределения по статусам
    const statusDistribution: Record<string, number> = {};
    const operationModeDistribution: Record<string, number> = {};

    snapshots.forEach(s => {
      const status = s.tank_status || 'unknown';
      const mode = s.operation_mode || 'unknown';
      
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      operationModeDistribution[mode] = (operationModeDistribution[mode] || 0) + 1;
    });

    return {
      total_snapshots: snapshots.length,
      unique_tanks: uniqueTanks,
      date_range: {
        earliest: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : '',
        latest: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : ''
      },
      averages: {
        level_percent: Math.round(avgLevelPercent * 100) / 100,
        temperature: Math.round(avgTemperature * 100) / 100,
        consumption_rate: Math.round(avgConsumptionRate * 100) / 100
      },
      status_distribution: statusDistribution,
      operation_mode_distribution: operationModeDistribution
    };
  }
}

// ===============================================
// LEGAL DOCUMENTS REPOSITORY
// ===============================================

export interface DocumentTypeInfo {
  code: 'tos' | 'privacy' | 'pdn';
  title: string;
  current_version?: {
    id: string;
    version: string;
    published_at: string;
  };
}

export interface DocumentVersion {
  id: string;
  doc_type_id: string;
  doc_type_code: 'tos' | 'privacy' | 'pdn';
  version: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  archived_at?: string;
  checksum: string;
  editor_id?: string;
  editor_name?: string;
  changelog: string;
  content_html?: string;
  content_md: string;
  locale: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDocumentAcceptance {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  doc_version_id: string;
  doc_type_code: 'tos' | 'privacy' | 'pdn';
  doc_version: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  source: 'web' | 'mobile' | 'api';
  immutable: boolean;
  created_at: string;
}

export interface UserConsentRequirement {
  user_id: string;
  requires_consent: boolean;
  pending_documents: Array<{
    type: 'tos' | 'privacy' | 'pdn';
    version_id: string;
    version: string;
    title: string;
  }>;
  current_acceptances: Array<{
    type: 'tos' | 'privacy' | 'pdn';
    version_id?: string;
    version?: string;
    accepted_at?: string;
  }>;
}

export interface DocumentStatistics {
  doc_type_code: 'tos' | 'privacy' | 'pdn';
  current_version: string;
  published_at: string;
  total_users: number;
  accepted_users: number;
  pending_users: number;
  acceptance_percentage: number;
}

export class LegalDocumentsRepository {
  
  /**
   * Получить типы документов
   */
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    // Получаем все типы документов с их текущими версиями
    const { data: types, error: typesError } = await supabase
      .from('document_types')
      .select('*')
      .order('code');

    if (typesError) {
      throw new Error(`Failed to fetch document types: ${typesError.message}`);
    }

    const result: DocumentTypeInfo[] = [];

    for (const type of types || []) {
      // Получаем текущую версию для каждого типа
      const { data: currentVersion, error: versionError } = await supabase
        .from('document_versions')
        .select('id, version, published_at')
        .eq('doc_type_code', type.code)
        .eq('is_current', true)
        .eq('status', 'published')
        .single();

      if (versionError && versionError.code !== 'PGRST116') {
        console.warn(`No current version found for ${type.code}:`, versionError.message);
      }

      result.push({
        code: type.code as 'tos' | 'privacy' | 'pdn',
        title: type.title,
        current_version: currentVersion || undefined
      });
    }

    return result;
  }

  /**
   * Получить версии документов
   */
  async getDocumentVersions(docTypeCode?: 'tos' | 'privacy' | 'pdn'): Promise<DocumentVersion[]> {
    let query = supabase
      .from('document_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (docTypeCode) {
      query = query.eq('doc_type_code', docTypeCode);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch document versions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить версию документа по ID
   */
  async getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch document version: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Получить текущую версию документа
   */
  async getCurrentDocumentVersion(docTypeCode: 'tos' | 'privacy' | 'pdn'): Promise<DocumentVersion | null> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('doc_type_code', docTypeCode)
      .eq('is_current', true)
      .eq('status', 'published')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch current document version: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Создать черновик документа
   */
  async createDocumentDraft(input: {
    doc_type_code: 'tos' | 'privacy' | 'pdn';
    version: string;
    changelog: string;
    content_md: string;
    locale?: string;
  }): Promise<DocumentVersion> {
    // Генерируем checksum
    const checksum = require('crypto')
      .createHash('sha256')
      .update(input.content_md)
      .digest('hex');

    const { data, error } = await supabase
      .from('document_versions')
      .insert({
        doc_type_code: input.doc_type_code,
        version: input.version,
        status: 'draft',
        checksum: `sha256:${checksum}`,
        changelog: input.changelog,
        content_md: input.content_md,
        locale: input.locale || 'ru',
        is_current: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create document draft: ${error.message}`);
    }

    return data;
  }

  /**
   * Обновить версию документа
   */
  async updateDocumentVersion(versionId: string, update: {
    version?: string;
    changelog?: string;
    content_md?: string;
    locale?: string;
  }): Promise<DocumentVersion | null> {
    const updateData: any = { ...update };

    // Если обновляется контент, пересчитываем checksum
    if (update.content_md) {
      const checksum = require('crypto')
        .createHash('sha256')
        .update(update.content_md)
        .digest('hex');
      updateData.checksum = `sha256:${checksum}`;
    }

    const { data, error } = await supabase
      .from('document_versions')
      .update(updateData)
      .eq('id', versionId)
      .eq('status', 'draft') // Можно обновлять только черновики
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update document version: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Опубликовать версию документа
   */
  async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    // Сначала получаем версию
    const version = await this.getDocumentVersion(versionId);
    if (!version || version.status !== 'draft') {
      throw new Error('Document version not found or not in draft status');
    }

    // Снимаем флаг is_current с предыдущих версий
    await supabase
      .from('document_versions')
      .update({ is_current: false })
      .eq('doc_type_code', version.doc_type_code)
      .eq('is_current', true);

    // Публикуем новую версию
    const { data, error } = await supabase
      .from('document_versions')
      .update({
        status: 'published',
        is_current: true,
        published_at: new Date().toISOString()
      })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish document version: ${error.message}`);
    }

    return data;
  }

  /**
   * Принять документ
   */
  async acceptDocument(versionId: string, userId: string, source: 'web' | 'mobile' | 'api' = 'web'): Promise<UserDocumentAcceptance> {
    // Проверяем, не было ли уже принятия этой версии
    const { count } = await supabase
      .from('user_document_acceptances')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('doc_version_id', versionId);

    if (count && count > 0) {
      // Если уже принимал, возвращаем существующую запись
      const { data } = await supabase
        .from('user_document_acceptances')
        .select('*')
        .eq('user_id', userId)
        .eq('doc_version_id', versionId)
        .single();
      
      return data as UserDocumentAcceptance;
    }

    // Получаем версию документа
    const version = await this.getDocumentVersion(versionId);
    if (!version || version.status !== 'published') {
      throw new Error('Document version not found or not published');
    }

    // Создаем запись о принятии
    const { data, error } = await supabase
      .from('user_document_acceptances')
      .insert({
        user_id: userId,
        doc_version_id: versionId,
        doc_type_code: version.doc_type_code,
        doc_version: version.version,
        accepted_at: new Date().toISOString(),
        source,
        immutable: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to accept document: ${error.message}`);
    }

    // Обновляем статус пользователя
    await this.updateUserLegalStatus(userId, version.doc_type_code, versionId);

    return data;
  }

  /**
   * Обновить правовой статус пользователя
   */
  private async updateUserLegalStatus(userId: string, docType: 'tos' | 'privacy' | 'pdn', versionId: string): Promise<void> {
    const now = new Date().toISOString();
    const fieldMap = {
      'tos': { version_field: 'tos_version_id', date_field: 'tos_accepted_at' },
      'privacy': { version_field: 'privacy_version_id', date_field: 'privacy_accepted_at' },
      'pdn': { version_field: 'pdn_version_id', date_field: 'pdn_accepted_at' }
    };

    const fields = fieldMap[docType];
    
    const { error } = await supabase
      .from('user_legal_statuses')
      .upsert({
        user_id: userId,
        [fields.version_field]: versionId,
        [fields.date_field]: now,
        updated_at: now
      });

    if (error) {
      throw new Error(`Failed to update user legal status: ${error.message}`);
    }
  }

  /**
   * Получить согласия пользователя
   */
  async getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    const { data, error } = await supabase
      .from('user_document_acceptances')
      .select('*')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user acceptances: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить требования согласий для пользователя
   */
  async getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    // Получаем текущие версии всех документов
    const currentVersions = await Promise.all([
      this.getCurrentDocumentVersion('tos'),
      this.getCurrentDocumentVersion('privacy'),
      this.getCurrentDocumentVersion('pdn')
    ]);

    // Получаем статус пользователя
    const { data: userStatus } = await supabase
      .from('user_legal_statuses')
      .select('*')
      .eq('user_id', userId)
      .single();

    const pendingDocuments = [];
    const currentAcceptances = [];

    const docTypes: Array<{ type: 'tos' | 'privacy' | 'pdn'; title: string }> = [
      { type: 'tos', title: 'Пользовательское соглашение' },
      { type: 'privacy', title: 'Политика конфиденциальности' },
      { type: 'pdn', title: 'Политика защиты персональных данных' }
    ];

    for (let i = 0; i < docTypes.length; i++) {
      const docInfo = docTypes[i];
      const currentVersion = currentVersions[i];
      
      if (!currentVersion) continue;

      const statusFieldMap = {
        'tos': { version: userStatus?.tos_version_id, date: userStatus?.tos_accepted_at },
        'privacy': { version: userStatus?.privacy_version_id, date: userStatus?.privacy_accepted_at },
        'pdn': { version: userStatus?.pdn_version_id, date: userStatus?.pdn_accepted_at }
      };

      const userVersionInfo = statusFieldMap[docInfo.type];
      const hasAcceptedCurrent = userVersionInfo.version === currentVersion.id;

      if (!hasAcceptedCurrent) {
        pendingDocuments.push({
          type: docInfo.type,
          version_id: currentVersion.id,
          version: currentVersion.version,
          title: docInfo.title
        });
      }

      currentAcceptances.push({
        type: docInfo.type,
        version_id: userVersionInfo.version,
        version: userVersionInfo.version ? 
          currentVersions.find(v => v?.id === userVersionInfo.version)?.version : undefined,
        accepted_at: userVersionInfo.date
      });
    }

    return {
      user_id: userId,
      requires_consent: pendingDocuments.length > 0,
      pending_documents: pendingDocuments,
      current_acceptances: currentAcceptances
    };
  }

  /**
   * Получить журнал принятия документов
   */
  async getAcceptanceJournal(filters: {
    doc_type?: 'tos' | 'privacy' | 'pdn';
    version_id?: string;
    user_id?: string;
    user_email?: string;
    date_from?: string;
    date_to?: string;
    source?: 'web' | 'mobile' | 'api';
    limit?: number;
    offset?: number;
  } = {}): Promise<UserDocumentAcceptance[]> {
    let query = supabase
      .from('user_document_acceptances')
      .select('*')
      .order('accepted_at', { ascending: false });

    if (filters.doc_type) query = query.eq('doc_type_code', filters.doc_type);
    if (filters.version_id) query = query.eq('doc_version_id', filters.version_id);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.user_email) query = query.ilike('user_email', `%${filters.user_email}%`);
    if (filters.date_from) query = query.gte('accepted_at', filters.date_from);
    if (filters.date_to) query = query.lte('accepted_at', filters.date_to);
    if (filters.source) query = query.eq('source', filters.source);

    if (filters.limit || filters.offset) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch acceptance journal: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получить статистику по документам
   */
  async getDocumentStatistics(): Promise<DocumentStatistics[]> {
    // Получаем текущие версии всех документов
    const { data: currentVersions, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('is_current', true)
      .eq('status', 'published');

    if (error) {
      throw new Error(`Failed to fetch current versions: ${error.message}`);
    }

    const statistics: DocumentStatistics[] = [];

    for (const version of currentVersions || []) {
      // Считаем количество принятий для этой версии
      const { count: acceptedCount } = await supabase
        .from('user_document_acceptances')
        .select('*', { count: 'exact', head: true })
        .eq('doc_version_id', version.id);

      // Общее количество пользователей (примерное)
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const accepted = acceptedCount || 0;
      const total = totalUsers || 0;
      const pending = Math.max(0, total - accepted);
      const percentage = total > 0 ? Math.round((accepted / total) * 100) : 0;

      statistics.push({
        doc_type_code: version.doc_type_code as 'tos' | 'privacy' | 'pdn',
        current_version: version.version,
        published_at: version.published_at || version.created_at,
        total_users: total,
        accepted_users: accepted,
        pending_users: pending,
        acceptance_percentage: percentage
      });
    }

    return statistics;
  }
}

export const tanksRepository = new TanksRepository();
export const equipmentRepository = new EquipmentRepository();
export const tradingPointsRepository = new TradingPointsRepository();
export const rolesRepository = new RolesRepository();
export const fuelStockSnapshotsRepository = new FuelStockSnapshotsRepository();
export const legalDocumentsRepository = new LegalDocumentsRepository();