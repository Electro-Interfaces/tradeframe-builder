/**
 * Operations Supabase Service - Прямая работа с базой данных
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией из раздела "Обмен данными"
 * Использует SupabaseConnectionHelper для проверки подключений
 * Заменяет mock-данные реальными данными из Supabase
 */

import { supabaseClientBrowser, getSupabaseClient } from './supabaseClientBrowser';
import { supabaseConfigManager } from './supabaseConfigManager';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { Operation, OperationType, OperationStatus, PaymentMethod } from './operationsTypes';
import { SupabaseConnectionHelper, executeSupabaseOperation } from './supabaseConnectionHelper';
import { httpClient } from './universalHttpClient';

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
    console.log('🚀 ОПЕРАЦИИ: Начинаем getOperations with filters:', filters);
    console.log('🔍 OperationsSupabaseService.getOperations() called with filters:', filters);
    try {
      console.log('🔄 Получаем настройки подключения из системы конфигурации...');
      
      // Получаем настройки подключения из раздела "Обмен данными"
      const connection = await apiConfigServiceDB.getCurrentConnection();
      
      if (!connection) {
        throw new Error('Нет активного подключения к базе данных. Настройте подключение в разделе "Обмен данными".');
      }
      
      if (connection.type !== 'supabase') {
        throw new Error(`Неподдерживаемый тип подключения: ${connection.type}. Ожидается "supabase".`);
      }
      
      const supabaseUrl = connection.url;
      const serviceKey = connection.settings?.serviceRoleKey || connection.settings?.apiKey;
      
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Отсутствуют URL или ключи доступа в настройках подключения. Проверьте конфигурацию в разделе "Обмен данными".');
      }
      
      console.log('🌐 Supabase URL из конфигурации:', supabaseUrl);
      console.log('🔑 Service Key length:', serviceKey.length);
      console.log('🔑 Service Key preview:', serviceKey.substring(0, 50) + '...');
      console.log('🔑 Key type:', serviceKey.includes('service_role') ? 'service_role' : 'anon');
      
      let endpoint = `${supabaseUrl}/rest/v1/operations?select=*&order=start_time.desc&limit=10000`;
      
      // Применение фильтров к URL
      const params = new URLSearchParams();
      if (filters?.operationType) {
        params.append('operation_type', `eq.${filters.operationType}`);
      }
      if (filters?.status) {
        params.append('status', `eq.${filters.status}`);
      }
      if (filters?.tradingPointId) {
        params.append('trading_point_id', `eq.${filters.tradingPointId}`);
        console.log('🎯 КРИТИЧНО: Фильтруем по торговой точке в Supabase:', filters.tradingPointId);
      }
      if (filters?.fuelType) {
        params.append('fuel_type', `eq.${filters.fuelType}`);
      }
      if (filters?.paymentMethod) {
        params.append('payment_method', `eq.${filters.paymentMethod}`);
      }
      if (filters?.startDate) {
        // Добавляем начальное время дня (00:00:00) для корректной фильтрации
        const startDateTime = filters.startDate.includes('T') 
          ? filters.startDate 
          : `${filters.startDate}T00:00:00`;
        params.append('start_time', `gte.${startDateTime}`);
        console.log('📅 Фильтр по начальной дате:', startDateTime);
      }
      if (filters?.endDate) {
        // Добавляем конечное время дня (23:59:59) для корректной фильтрации
        const endDateTime = filters.endDate.includes('T') 
          ? filters.endDate 
          : `${filters.endDate}T23:59:59`;
        params.append('start_time', `lte.${endDateTime}`);
        console.log('📅 Фильтр по конечной дате:', endDateTime);
      }
      
      if (params.toString()) {
        endpoint += '&' + params.toString();
      }
      
      console.log('🔍 КРИТИЧНО: Финальный URL запроса к Supabase:', endpoint);
      
      // Парсим URL чтобы получить endpoint и query parameters
      const url = new URL(endpoint);
      const supabaseEndpoint = url.pathname + url.search;
      
      console.log('🚀 Отправляем запрос через универсальный HTTP клиент...');
      console.log('🔑 DEBUG: About to make Supabase request via universalHttpClient');
      const response = await httpClient.get(supabaseEndpoint, {
        destination: 'supabase',
        useAuth: true
      });
      
      console.log('📡 Получен ответ:', {
        success: response.success,
        status: response.status,
        responseTime: response.responseTime
      });
      
      if (!response.success) {
        console.error('❌ Ошибка HTTP:', {
          status: response.status,
          error: response.error
        });
        throw new Error(`HTTP ${response.status}: ${response.error}`);
      }
      
      const data = response.data;
      console.log('✅ КРИТИЧНО: Загружено операций из Supabase:', data?.length || 0);
      
      if (filters?.tradingPointId) {
        console.log('🎯 КРИТИЧНО: Операции отфильтрованы по точке:', filters.tradingPointId);
        console.log('🎯 КРИТИЧНО: Первые 3 операции после фильтра:', data?.slice(0, 3)?.map(op => ({
          id: op.id,
          trading_point_id: op.trading_point_id,
          total_cost: op.total_cost,
          quantity: op.quantity
        })));
      }
      
      // ВРЕМЕННАЯ ОТЛАДКА: показываем первые несколько операций для проверки источника данных
      if (data && data.length > 0) {
        console.log('🔍 ПЕРВЫЕ 3 ОПЕРАЦИИ ИЗ БАЗЫ (RAW):', data.slice(0, 3).map(op => ({
          id: op.id,
          trading_point_id: op.trading_point_id,
          start_time: op.start_time,
          fuel_type: op.fuel_type,
          total_cost: op.total_cost
        })));
      }
      
      // Преобразуем данные из Supabase в формат Operation
      return (data || []).map(this.transformSupabaseToOperation);
    } catch (error) {
      console.error('❌ OperationsSupabaseService.getOperations error:', error);
      
      // Детальная диагностика ошибок
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🌐 ОШИБКА СЕТИ: Нет подключения к интернету или Supabase недоступен');
        console.error('   - Проверьте подключение к интернету');
        console.error('   - Проверьте доступность Supabase проекта в настройках');
        throw new Error('Нет подключения к серверу данных. Проверьте интернет-соединение.');
      }
      
      if (error.message.includes('HTTP 401')) {
        console.error('🔑 ОШИБКА АВТОРИЗАЦИИ: Неверные ключи доступа к Supabase');
        throw new Error('Ошибка доступа к данным. Обратитесь к администратору.');
      }
      
      if (error.message.includes('HTTP 404')) {
        console.error('🗂️ ОШИБКА СТРУКТУРЫ: Таблица operations не найдена в Supabase');
        throw new Error('Таблица операций не найдена в базе данных.');
      }
      
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
      console.log('📝 [SUPABASE] Creating operation with data:', operationData);
      const supabaseData = this.transformOperationToSupabase(operationData);
      console.log('🔄 [SUPABASE] Transformed to Supabase format:', supabaseData);
      
      // ИСПРАВЛЕНО: Используем настоящий Supabase клиент
      const client = await getSupabaseClient();
      console.log('✅ [SUPABASE] Got real client, inserting operation...');
      
      const { data, error } = await client
        .from('operations')
        .insert(supabaseData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ [SUPABASE] Insert error:', error);
        throw new Error(`Supabase insert failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from Supabase insert');
      }

      console.log('✅ [SUPABASE] Operation created successfully:', data);

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

  /**
   * Получить операции через конфигурацию из настроек
   */
  private async getOperationsViaConfig(filters?: OperationFilters): Promise<Operation[]> {
    try {
      // Строим URL с фильтрами
      let endpoint = '/rest/v1/operations?select=*&order=start_time.desc&limit=10000';
      
      if (filters) {
        const queryParams = new URLSearchParams();
        
        if (filters.operationType) {
          queryParams.append('operation_type', `eq.${filters.operationType}`);
        }
        if (filters.status) {
          queryParams.append('status', `eq.${filters.status}`);
        }
        if (filters.tradingPointId) {
          queryParams.append('trading_point_id', `eq.${filters.tradingPointId}`);
        }
        if (filters.fuelType) {
          queryParams.append('fuel_type', `eq.${filters.fuelType}`);
        }
        if (filters.paymentMethod) {
          queryParams.append('payment_method', `eq.${filters.paymentMethod}`);
        }
        if (filters.startDate) {
          queryParams.append('start_time', `gte.${filters.startDate}`);
        }
        if (filters.endDate) {
          queryParams.append('start_time', `lte.${filters.endDate}`);
        }
        
        if (queryParams.toString()) {
          endpoint += '&' + queryParams.toString();
        }
      }
      
      const data = await supabaseConfigManager.fetchFromSupabase(endpoint);
      console.log('✅ Loaded operations via config:', data?.length || 0);
      
      // Преобразуем данные из Supabase в формат Operation
      return (data || []).map(this.transformSupabaseToOperation);
      
    } catch (error) {
      console.error('❌ Error in getOperationsViaConfig:', error);
      throw error;
    }
  }

  // Приватные методы для трансформации данных

  private transformSupabaseToOperation(data: any): Operation {
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

  /**
   * СУПЕР-ПРОСТОЙ метод удаления операций (без сложной логики)
   */
  async clearTradingPointOperations(tradingPointId: string): Promise<{success: boolean, deletedCount: number, error?: string}> {
    console.log(`🗑️ Удаляем операции для: ${tradingPointId}`);

    try {
      // Используем прямой SQL через Supabase RPC
      const { data, error } = await supabaseClientBrowser
        .rpc('delete_operations_by_trading_point', {
          trading_point_id: tradingPointId
        });

      if (error) {
        console.error('❌ RPC ошибка:', error);
        // Если RPC не работает, пробуем обычный delete
        const { error: deleteError } = await supabaseClientBrowser
          .from('operations')
          .delete()
          .match({ trading_point_id: tradingPointId });
          
        if (deleteError) {
          throw deleteError;
        }
      }

      console.log('✅ Операции удалены');
      return { success: true, deletedCount: 0 };
      
    } catch (error: any) {
      console.error('❌ Ошибка удаления:', error.message);
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  /**
   * Очистить демо-данные операций за август 2025
   */
  async clearAugustDemoData(): Promise<{success: boolean, deletedCount: number, error?: string}> {
    try {
      console.log('🗑️ Начинаем очистку демо-данных за август 2025...');

      // Сначала проверим, сколько операций будет удалено
      const { data: operationsToDelete, error: checkError } = await supabaseClientBrowser
        .from('operations')
        .select('id, start_time, trading_point_id')
        .lt('start_time', '2025-09-02T00:00:00Z');

      if (checkError) {
        console.error('❌ Ошибка при проверке операций:', checkError);
        return { success: false, deletedCount: 0, error: checkError.message };
      }

      const countToDelete = operationsToDelete?.length || 0;
      console.log(`📊 Найдено операций для удаления: ${countToDelete}`);

      if (countToDelete === 0) {
        console.log('✅ Операций за август не найдено, база уже чистая');
        return { success: true, deletedCount: 0 };
      }

      // Удаляем операции до 2 сентября 2025
      const { data: deletedOps, error: deleteError } = await supabaseClientBrowser
        .from('operations')
        .delete()
        .lt('start_time', '2025-09-02T00:00:00Z')
        .select('id');

      if (deleteError) {
        console.error('❌ Ошибка при удалении операций:', deleteError);
        return { success: false, deletedCount: 0, error: deleteError.message };
      }

      const deletedCount = deletedOps?.length || 0;
      console.log(`✅ Успешно удалено операций: ${deletedCount}`);

      return { success: true, deletedCount };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('❌ Критическая ошибка при очистке операций:', errorMessage);
      return { success: false, deletedCount: 0, error: errorMessage };
    }
  }

  /**
   * Удалить все операции для АЗС №004 (станция 4)
   */
  async clearStation4Operations(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    try {
      // ID торговой точки для АЗС №004
      const station4TradingPointId = '6969b08d-1cbe-45c2-ae9c-8002c7022b59';
      
      console.log('🗑️ [CLEAR] Удаление всех операций для АЗС №004...');
      
      // Сначала получим все операции для подсчёта
      const { data: operationsToDelete, error: countError } = await supabaseClientBrowser
        .from('operations')
        .select('id')
        .eq('trading_point_id', station4TradingPointId);
      
      const beforeCount = operationsToDelete ? operationsToDelete.length : 0;

      if (countError) {
        throw countError;
      }

      console.log(`📊 [CLEAR] Найдено ${beforeCount} операций для удаления`);
      
      // Удаляем все операции для станции 4
      const { error } = await supabaseClientBrowser
        .from('operations')
        .delete()
        .eq('trading_point_id', station4TradingPointId);

      if (error) {
        throw error;
      }

      const deletedCount = beforeCount || 0;
      console.log(`✅ [CLEAR] Успешно удалено ${deletedCount} операций для АЗС №004`);
      
      return {
        success: true,
        deletedCount,
        message: `Удалено ${deletedCount} операций для АЗС №004`
      };
    } catch (error) {
      console.error('❌ [CLEAR] Ошибка удаления операций АЗС №004:', error);
      return {
        success: false,
        deletedCount: 0,
        message: `Ошибка удаления: ${error.message}`
      };
    }
  }
}

// Экспорт singleton экземпляра
export const operationsSupabaseService = new OperationsSupabaseService();

// АВТОВЫПОЛНЕНИЕ УДАЛЕНИЯ ОПЕРАЦИЙ ОТКЛЮЧЕНО

// Создаем совместимую обертку для старого API
export const operationsService = {
  async getAll() {
    return await operationsSupabaseService.getOperations();
  },

  async getStatusStatistics() {
    return await operationsSupabaseService.getStatusStatistics();
  },

  /**
   * Очистить все операции для торговой точки
   */
  async clearTradingPointOperations(tradingPointId: string) {
    return await operationsSupabaseService.clearTradingPointOperations(tradingPointId);
  },

  /**
   * Очистить все операции для станции 4 (для обратной совместимости)
   * @deprecated Используйте clearTradingPointOperations('6969b08d-1cbe-45c2-ae9c-8002c7022b59')
   */
  async clearStation4Operations() {
    return await operationsSupabaseService.clearTradingPointOperations('6969b08d-1cbe-45c2-ae9c-8002c7022b59');
  },

  /**
   * Очистить демо-данные операций за август 2025
   */
  async clearAugustDemoData() {
    return await operationsSupabaseService.clearAugustDemoData();
  }
};