/**
 * Operations Service - Обновлено для работы с реальным API
 * Замена для operationsService.ts с поддержкой как mock, так и API данных
 */

import { apiConfigService } from './apiConfigService';
import { OperationsBusinessLogic } from './operationsBusinessLogic';
import { Operation, OperationType, OperationStatus, PaymentMethod, OperationInput } from './operationsTypes';
import { httpClient } from './httpClients';

// Фильтры для операций
export interface OperationFilters {
  operationType?: OperationType;
  status?: OperationStatus;
  tradingPointId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  customerId?: string;
  operatorName?: string;
}

// Параметры пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Результат с пагинацией
export interface PaginatedOperations {
  data: Operation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary?: {
    totalOperations: number;
    completedOperations: number;
    totalAmount: number;
    averageOperationValue: number;
  };
}

class OperationsServiceUpdated {
  private apiUrl = apiConfigService.getCurrentApiUrl();
  
  /**
   * Получить список операций с фильтрацией и пагинацией
   */
  async getOperations(
    filters: OperationFilters = {}, 
    pagination: PaginationParams = {}
  ): Promise<PaginatedOperations> {
    try {
      // Если в режиме моков - используем старую логику
      const isMockMode = apiConfigService.isMockMode();
      const currentConnection = apiConfigService.getCurrentConnection();
      const currentApiUrl = apiConfigService.getCurrentApiUrl();
      
      if (isMockMode) {
        return this.getMockOperations(filters, pagination);
      }
      
      
      // Используем реальный API
      const queryParams = this.buildQueryParams(filters, pagination);
      const response = await httpClient.get(`/operations?${queryParams}`);
      
      return this.transformOperationsResponse(response);
      
    } catch (error) {
      console.error('Operations API error:', error);
      
      // Fallback на mock данные при ошибке API
      // Falling back to mock operations due to API error
      return this.getMockOperations(filters, pagination);
    }
  }
  
  /**
   * Получить все операции (упрощенный метод без фильтров)
   */
  async getAll(): Promise<Operation[]> {
    try {
      const result = await this.getOperations({}, { limit: 10000 });
      return result.data;
    } catch (error) {
      console.error('❌ OperationsService.getAll() error:', error);
      throw error;
    }
  }

  /**
   * Принудительная перезагрузка данных
   */
  async forceReload(): Promise<void> {
    // Очищаем кэш если есть
    localStorage.removeItem('tradeframe_operations');
    localStorage.removeItem('operations');
  }

  /**
   * Получить операцию по ID
   */
  async getOperationById(id: string): Promise<Operation | null> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.getMockOperationById(id);
      }
      
      const response = await httpClient.get(`/operations/${id}`);
      return this.transformOperationFromApi(response);
      
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      
      console.error(`Operation ${id} API error:`, error);
      return this.getMockOperationById(id);
    }
  }
  
  /**
   * Создать новую операцию
   */
  async createOperation(operationInput: OperationInput): Promise<Operation> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.createMockOperation(operationInput);
      }
      
      const response = await httpClient.post('/operations', operationInput);
      
      return this.transformOperationFromApi(response);
      
    } catch (error) {
      console.error('Create operation API error:', error);
      throw new Error(`Failed to create operation: ${error}`);
    }
  }
  
  /**
   * Обновить статус операции
   */
  async updateOperationStatus(
    id: string, 
    status: OperationStatus,
    progress?: number,
    details?: string
  ): Promise<Operation> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.updateMockOperationStatus(id, status, progress, details);
      }
      
      const updateData: any = { status };
      if (progress !== undefined) updateData.progress = progress;
      if (details) updateData.details = details;
      if (status === 'completed') updateData.endTime = new Date().toISOString();
      
      const response = await httpClient.patch(`/operations/${id}/status`, updateData);
      
      return this.transformOperationFromApi(response);
      
    } catch (error) {
      console.error(`Update operation ${id} status API error:`, error);
      throw new Error(`Failed to update operation status: ${error}`);
    }
  }
  
  /**
   * Получить статистику операций
   */
  async getOperationsStats(period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<{
    totalOperations: number;
    completedOperations: number;
    inProgressOperations: number;
    failedOperations: number;
    totalRevenue: number;
    averageOperationValue: number;
    operationsByType: Record<string, number>;
    operationsByHour: Record<string, number>;
  }> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.getMockOperationsStats();
      }
      
      const response = await httpClient.get(`/operations/stats?period=${period}`);
      return response;
      
    } catch (error) {
      console.error('Operations stats API error:', error);
      return this.getMockOperationsStats();
    }
  }
  
  /**
   * Экспорт операций
   */
  async exportOperations(
    filters: OperationFilters = {}, 
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<Blob | string> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.exportMockOperations(filters, format);
      }
      
      const queryParams = this.buildQueryParams(filters, { format });
      // Используем httpClient для запроса экспорта (возможно потребуется дополнительная настройка для Blob)
      const response = await httpClient.get(`/operations/export?${queryParams}`);
      
      if (format === 'json') {
        return JSON.stringify(response);
      } else {
        // Для CSV/Excel форматов возвращаем как строку (может потребоваться доработка)
        return JSON.stringify(response);
      }
      
    } catch (error) {
      console.error('Export operations API error:', error);
      return this.exportMockOperations(filters, format);
    }
  }
  
  /**
   * Отмена операции
   */
  async cancelOperation(id: string, reason: string): Promise<Operation> {
    try {
      const operation = await this.getOperationById(id);
      if (!operation) {
        throw new Error('Operation not found');
      }
      
      if (!OperationsBusinessLogic.canCancelOperation(operation)) {
        throw new Error('Operation cannot be cancelled');
      }
      
      return this.updateOperationStatus(id, 'cancelled', 0, `Cancelled: ${reason}`);
      
    } catch (error) {
      console.error(`Cancel operation ${id} error:`, error);
      throw error;
    }
  }
  
  /**
   * Получить операции в реальном времени (polling)
   */
  async startRealTimeOperations(
    filters: OperationFilters,
    callback: (operations: Operation[]) => void,
    intervalMs: number = 5000
  ): Promise<() => void> {
    let isRunning = true;
    
    const poll = async () => {
      if (!isRunning) return;
      
      try {
        const result = await this.getOperations(filters, { page: 1, limit: 50 });
        callback(result.data);
      } catch (error) {
        console.error('Real-time operations polling error:', error);
      }
      
      if (isRunning) {
        setTimeout(poll, intervalMs);
      }
    };
    
    // Начальная загрузка
    poll();
    
    // Возвращаем функцию для остановки polling
    return () => {
      isRunning = false;
    };
  }
  
  // ============================================
  // PRIVATE API HELPERS
  // ============================================
  
  private buildQueryParams(filters: OperationFilters & any, pagination: PaginationParams & any): string {
    const params = new URLSearchParams();
    
    if (filters.operationType) params.append('operationType', filters.operationType);
    if (filters.status) params.append('status', filters.status);
    if (filters.tradingPointId) params.append('tradingPointId', filters.tradingPointId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (pagination.format) params.append('format', pagination.format);
    
    return params.toString();
  }
  
  
  private transformOperationsResponse(apiResponse: any): PaginatedOperations {
    const result = {
      data: apiResponse.data.map((item: any) => this.transformOperationFromApi(item)),
      pagination: apiResponse.pagination,
      summary: apiResponse.summary
    };
    
    return result;
  }
  
  private transformOperationFromApi(apiData: any): Operation {
    return {
      id: apiData.id,
      operationType: apiData.operation_type || apiData.operationType,
      status: apiData.status,
      startTime: apiData.start_time || apiData.startTime,
      endTime: apiData.end_time || apiData.endTime,
      duration: apiData.duration,
      tradingPointId: apiData.trading_point_id || apiData.tradingPointId,
      tradingPointName: apiData.trading_point_name || apiData.tradingPointName,
      deviceId: apiData.device_id || apiData.deviceId,
      transactionId: apiData.transaction_id || apiData.transactionId,
      fuelType: apiData.fuel_type || apiData.fuelType,
      quantity: apiData.quantity,
      price: apiData.price,
      totalCost: apiData.total_cost || apiData.totalCost,
      paymentMethod: apiData.payment_method || apiData.paymentMethod,
      details: apiData.details,
      progress: apiData.progress,
      lastUpdated: apiData.updated_at || apiData.lastUpdated || new Date().toISOString(),
      operatorName: apiData.operator_name || apiData.operatorName,
      customerId: apiData.customer_id || apiData.customerId,
      vehicleNumber: apiData.vehicle_number || apiData.vehicleNumber,
      metadata: apiData.metadata,
      createdAt: new Date(apiData.created_at || apiData.createdAt),
      updatedAt: new Date(apiData.updated_at || apiData.updatedAt)
    };
  }
  

  // ============================================
  // MOCK DATA METHODS (для совместимости)
  // ============================================
  
  private async getMockOperations(filters: OperationFilters, pagination: PaginationParams): Promise<PaginatedOperations> {

    // Простые mock данные без БД зависимостей
    const mockOperations: Operation[] = [
      {
        id: 'OP-001',
        operationType: 'sale',
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 120,
        tradingPointId: 'TP-001',
        tradingPointName: 'Test Trading Point',
        deviceId: 'DEV-001',
        transactionId: 'TXN-001',
        fuelType: 'АИ-95',
        quantity: 30,
        price: 50.5,
        totalCost: 1515,
        paymentMethod: 'bank_card',
        details: 'Test sale operation',
        progress: 100,
        lastUpdated: new Date().toISOString(),
        operatorName: 'Test Operator',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Применяем фильтры если нужно
    let filteredOperations = mockOperations;
    if (filters.operationType) {
      filteredOperations = filteredOperations.filter(op => op.operationType === filters.operationType);
    }
    if (filters.status) {
      filteredOperations = filteredOperations.filter(op => op.status === filters.status);
    }
    if (filters.tradingPointId) {
      filteredOperations = filteredOperations.filter(op => op.tradingPointId === filters.tradingPointId);
    }

    // Пагинация
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredOperations.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: filteredOperations.length,
        pages: Math.ceil(filteredOperations.length / limit)
      },
      summary: {
        totalOperations: filteredOperations.length,
        completedOperations: filteredOperations.filter(op => op.status === 'completed').length,
        totalAmount: filteredOperations.reduce((sum, op) => sum + (op.totalCost || 0), 0),
        averageOperationValue: filteredOperations.length > 0
          ? filteredOperations.reduce((sum, op) => sum + (op.totalCost || 0), 0) / filteredOperations.length
          : 0
      }
    };
  }
  
  private async getMockOperationById(id: string): Promise<Operation | null> {

    // Простая mock реализация
    if (id === 'OP-001') {
      return {
        id: 'OP-001',
        operationType: 'sale',
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 120,
        tradingPointId: 'TP-001',
        tradingPointName: 'Test Trading Point',
        deviceId: 'DEV-001',
        transactionId: 'TXN-001',
        fuelType: 'АИ-95',
        quantity: 30,
        price: 50.5,
        totalCost: 1515,
        paymentMethod: 'bank_card',
        details: 'Test sale operation',
        progress: 100,
        lastUpdated: new Date().toISOString(),
        operatorName: 'Test Operator',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return null;
  }
  
  private async createMockOperation(input: OperationInput): Promise<Operation> {
    // Mock implementation
    return OperationsBusinessLogic.createOperation(input);
  }
  
  private async updateMockOperationStatus(id: string, status: OperationStatus, progress?: number, details?: string): Promise<Operation> {
    // Mock implementation
    const operation = await this.getMockOperationById(id);
    if (!operation) throw new Error('Operation not found');
    
    return OperationsBusinessLogic.updateOperationStatus(operation, status, progress, details);
  }
  
  private async getMockOperationsStats(): Promise<any> {

    // Простые mock данные без БД зависимостей
    return {
      totalOperations: 100,
      completedOperations: 85,
      inProgressOperations: 10,
      failedOperations: 5,
      totalRevenue: 150000,
      averageOperationValue: 1500,
      operationsByType: {
        'sale': 80,
        'refund': 15,
        'maintenance': 5
      },
      operationsByHour: {
        '8': 10,
        '9': 15,
        '10': 12,
        '11': 8,
        '12': 20
      }
    };
  }
  
  private async exportMockOperations(filters: OperationFilters, format: string): Promise<string> {
    const operations = await this.getMockOperations(filters, { limit: 10000 });
    
    if (format === 'json') {
      return JSON.stringify(operations.data, null, 2);
    }
    
    // CSV format
    const headers = ['ID', 'Type', 'Status', 'Start Time', 'Total Cost', 'Details'];
    let csv = headers.join(',') + '\n';
    
    operations.data.forEach(op => {
      const row = [
        op.id,
        op.operationType,
        op.status,
        op.startTime,
        op.totalCost || 0,
        `"${(op.details || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

}

// Экспорт singleton экземпляра
export const operationsService = new OperationsServiceUpdated();

/**
 * ИНСТРУКЦИЯ ПО МИГРАЦИИ:
 * 
 * 1. Переименовать оригинальный файл:
 *    mv src/services/operationsService.ts src/services/operationsService.old.ts
 * 
 * 2. Переименовать этот файл:
 *    mv src/services/operationsService.updated.ts src/services/operationsService.ts
 * 
 * 3. Обновить импорты в компонентах:
 *    import { operationsService } from '@/services/operationsService';
 * 
 * 4. Протестировать переключение между mock и API режимами
 * 
 * 5. Настроить переменные окружения для API URL
 * 
 * 6. Добавить Operations routes в API server:
 *    import { operationsRouter } from './routes/operations';
 *    app.use('/api/v1/operations', operationsRouter);
 */