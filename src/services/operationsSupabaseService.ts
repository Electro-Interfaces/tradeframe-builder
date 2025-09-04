/**
 * Operations Supabase Service - Прямая работа с базой данных
 * Заменяет mock-данные реальными данными из Supabase
 */

import { supabaseClientBrowser } from './supabaseClientBrowser';
import { Operation, OperationType, OperationStatus, PaymentMethod } from './operationsTypes';

// Интерфейсы для работы с Supabase
interface SupabaseOperation {
  id: string;
  operation_type: OperationType;
  status: OperationStatus;
  start_time: string;
  end_time?: string;
  duration?: number;
  trading_point_id?: string;
  trading_point_name?: string;
  device_id?: string;
  transaction_id?: string;
  fuel_type?: string;
  quantity?: number;
  price?: number;
  total_cost?: number;
  payment_method?: PaymentMethod;
  details: string;
  progress?: number;
  operator_name?: string;
  customer_id?: string;
  vehicle_number?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface OperationFilters {
  operationType?: OperationType;
  status?: OperationStatus;
  tradingPointId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  fuelType?: string;
}

class OperationsSupabaseService {
  /**
   * Получить все операции с фильтрацией
   */
  async getOperations(filters?: OperationFilters): Promise<Operation[]> {
    console.log('🔍 OperationsSupabaseService.getOperations() called with filters:', filters);
    try {
      console.log('🔍 OperationsSupabaseService.getOperations - filters:', filters);
      
      let query = supabaseClientBrowser
        .from('operations')
        .select('*')
        .order('start_time', { ascending: false });

      // Применение фильтров
      if (filters?.operationType) {
        query = query.eq('operation_type', filters.operationType);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.tradingPointId) {
        query = query.eq('trading_point_id', filters.tradingPointId);
      }

      if (filters?.fuelType) {
        query = query.eq('fuel_type', filters.fuelType);
      }

      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      if (filters?.startDate) {
        query = query.gte('start_time', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('start_time', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded operations from Supabase:', data?.length || 0);
      
      // Преобразуем данные из Supabase в формат Operation
      return (data || []).map(this.transformSupabaseToOperation);
    } catch (error) {
      console.error('❌ OperationsSupabaseService.getOperations error:', error);
      throw error;
    }
  }

  /**
   * Получить операцию по ID
   */
  async getOperationById(id: string): Promise<Operation | null> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('operations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Запись не найдена
        }
        throw error;
      }

      return this.transformSupabaseToOperation(data);
    } catch (error) {
      console.error(`❌ OperationsSupabaseService.getOperationById(${id}) error:`, error);
      return null;
    }
  }

  /**
   * Создать новую операцию
   */
  async createOperation(operationData: Partial<Operation>): Promise<Operation> {
    try {
      const supabaseData = this.transformOperationToSupabase(operationData);
      
      const { data, error } = await supabaseClientBrowser
        .from('operations')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      return this.transformSupabaseToOperation(data);
    } catch (error) {
      console.error('❌ OperationsSupabaseService.createOperation error:', error);
      throw error;
    }
  }

  /**
   * Обновить операцию
   */
  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation> {
    try {
      const supabaseUpdates = this.transformOperationToSupabase(updates);
      
      const { data, error } = await supabaseClientBrowser
        .from('operations')
        .update({
          ...supabaseUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return this.transformSupabaseToOperation(data);
    } catch (error) {
      console.error(`❌ OperationsSupabaseService.updateOperation(${id}) error:`, error);
      throw error;
    }
  }

  /**
   * Получить статистику операций
   */
  async getStatusStatistics(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabaseClientBrowser
        .from('operations')
        .select('status');

      if (error) throw error;

      const stats: Record<string, number> = {};
      (data || []).forEach(operation => {
        stats[operation.status] = (stats[operation.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ OperationsSupabaseService.getStatusStatistics error:', error);
      return {};
    }
  }

  /**
   * Получить операции в реальном времени
   */
  subscribeToOperations(
    callback: (operations: Operation[]) => void,
    filters?: OperationFilters
  ): () => void {
    const channel = supabaseClientBrowser
      .channel('operations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operations' },
        async () => {
          // При любом изменении перезагружаем все операции
          try {
            const operations = await this.getOperations(filters);
            callback(operations);
          } catch (error) {
            console.error('❌ Real-time operations update error:', error);
          }
        }
      )
      .subscribe();

    // Возвращаем функцию для отписки
    return () => {
      supabaseClientBrowser.removeChannel(channel);
    };
  }

  // Приватные методы для трансформации данных

  private transformSupabaseToOperation(data: SupabaseOperation): Operation {
    return {
      id: data.id,
      operationType: data.operation_type,
      status: data.status,
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      tradingPointId: data.trading_point_id,
      tradingPointName: data.trading_point_name,
      deviceId: data.device_id,
      transactionId: data.transaction_id,
      fuelType: data.fuel_type,
      quantity: data.quantity,
      price: data.price,
      totalCost: data.total_cost,
      paymentMethod: data.payment_method,
      details: data.details,
      progress: data.progress,
      lastUpdated: data.updated_at,
      operatorName: data.operator_name,
      customerId: data.customer_id,
      vehicleNumber: data.vehicle_number,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private transformOperationToSupabase(operation: Partial<Operation>): Partial<SupabaseOperation> {
    const result: Partial<SupabaseOperation> = {};

    if (operation.id) result.id = operation.id;
    if (operation.operationType) result.operation_type = operation.operationType;
    if (operation.status) result.status = operation.status;
    if (operation.startTime) result.start_time = operation.startTime;
    if (operation.endTime) result.end_time = operation.endTime;
    if (operation.duration !== undefined) result.duration = operation.duration;
    if (operation.tradingPointId) result.trading_point_id = operation.tradingPointId;
    if (operation.tradingPointName) result.trading_point_name = operation.tradingPointName;
    if (operation.deviceId) result.device_id = operation.deviceId;
    if (operation.transactionId) result.transaction_id = operation.transactionId;
    if (operation.fuelType) result.fuel_type = operation.fuelType;
    if (operation.quantity !== undefined) result.quantity = operation.quantity;
    if (operation.price !== undefined) result.price = operation.price;
    if (operation.totalCost !== undefined) result.total_cost = operation.totalCost;
    if (operation.paymentMethod) result.payment_method = operation.paymentMethod;
    if (operation.details) result.details = operation.details;
    if (operation.progress !== undefined) result.progress = operation.progress;
    if (operation.operatorName) result.operator_name = operation.operatorName;
    if (operation.customerId) result.customer_id = operation.customerId;
    if (operation.vehicleNumber) result.vehicle_number = operation.vehicleNumber;
    if (operation.metadata) result.metadata = operation.metadata;

    return result;
  }
}

// Экспорт singleton экземпляра
export const operationsSupabaseService = new OperationsSupabaseService();