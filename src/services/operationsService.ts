/**
 * Operations Service - Только прямая работа с Supabase
 * НИКАКИХ MOCK-ДАННЫХ ИЛИ FALLBACK МЕХАНИЗМОВ!
 */

import { operationsSupabaseService } from './operationsSupabaseService';
import { Operation, OperationType, OperationStatus, PaymentMethod } from './operationsTypes';

export interface OperationFilters {
  operationType?: OperationType;
  status?: OperationStatus;
  tradingPointId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  fuelType?: string;
}

class OperationsService {
  /**
   * Получить все операции с фильтрацией
   */
  async getOperations(filters?: OperationFilters): Promise<Operation[]> {
    return await operationsSupabaseService.getOperations(filters);
  }

  /**
   * Получить операцию по ID
   */
  async getOperationById(id: string): Promise<Operation | null> {
    return await operationsSupabaseService.getOperationById(id);
  }

  /**
   * Создать новую операцию
   */
  async createOperation(operationData: Partial<Operation>): Promise<Operation> {
    return await operationsSupabaseService.createOperation(operationData);
  }

  /**
   * Обновить операцию
   */
  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation> {
    return await operationsSupabaseService.updateOperation(id, updates);
  }

  /**
   * Получить статистику операций
   */
  async getStatusStatistics(): Promise<Record<string, number>> {
    return await operationsSupabaseService.getStatusStatistics();
  }

  /**
   * Подписаться на обновления операций в реальном времени
   */
  subscribeToOperations(
    callback: (operations: Operation[]) => void,
    filters?: OperationFilters
  ): () => void {
    return operationsSupabaseService.subscribeToOperations(callback, filters);
  }
}

// Экспорт singleton экземпляра
export const operationsService = new OperationsService();

// Экспорт для обратной совместимости
export default operationsService;