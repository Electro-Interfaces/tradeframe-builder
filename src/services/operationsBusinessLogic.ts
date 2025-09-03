/**
 * Бизнес-логика операций и транзакций
 * Извлечена из operationsService.ts для упрощения миграции
 */

import { Operation, OperationType, OperationStatus, PaymentMethod, OperationInput } from './operationsTypes';

/**
 * Бизнес-логика для создания операций
 */
export class OperationsBusinessLogic {
  
  /**
   * Генерирует уникальный ID для операции
   */
  static generateOperationId(): string {
    return `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Генерирует ID транзакции
   */
  static generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Валидирует данные операции перед созданием
   */
  static validateOperationInput(input: OperationInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.operationType) {
      errors.push('Тип операции обязателен');
    }

    if (!input.details || input.details.trim().length === 0) {
      errors.push('Описание операции обязательно');
    }

    if (input.operationType === 'sale' && !input.fuelType) {
      errors.push('Для продажи необходимо указать тип топлива');
    }

    if (input.operationType === 'sale' && (!input.quantity || input.quantity <= 0)) {
      errors.push('Для продажи необходимо указать корректное количество');
    }

    if (input.operationType === 'sale' && (!input.price || input.price <= 0)) {
      errors.push('Для продажи необходимо указать корректную цену');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Рассчитывает общую стоимость операции
   */
  static calculateTotalCost(quantity: number, price: number): number {
    return Math.round(quantity * price * 100) / 100;
  }

  /**
   * Рассчитывает продолжительность операции
   */
  static calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / 1000 / 60); // в минутах
  }

  /**
   * Создает новую операцию из входных данных
   */
  static createOperation(input: OperationInput): Operation {
    const validation = this.validateOperationInput(input);
    if (!validation.isValid) {
      throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
    }

    const now = new Date();
    const id = this.generateOperationId();

    const operation: Operation = {
      id,
      operationType: input.operationType,
      status: 'pending',
      startTime: now.toISOString(),
      duration: 0,
      tradingPointId: input.tradingPointId,
      tradingPointName: input.tradingPointName,
      deviceId: input.deviceId,
      transactionId: input.operationType === 'sale' ? this.generateTransactionId() : undefined,
      fuelType: input.fuelType,
      quantity: input.quantity,
      price: input.price,
      totalCost: input.quantity && input.price ? this.calculateTotalCost(input.quantity, input.price) : undefined,
      paymentMethod: input.paymentMethod,
      details: input.details,
      progress: 0,
      lastUpdated: now.toISOString(),
      operatorName: input.operatorName,
      customerId: input.customerId,
      vehicleNumber: input.vehicleNumber,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    return operation;
  }

  /**
   * Обновляет статус операции
   */
  static updateOperationStatus(
    operation: Operation, 
    status: OperationStatus, 
    progress?: number
  ): Operation {
    const now = new Date();
    const updatedOperation: Operation = {
      ...operation,
      status,
      progress: progress !== undefined ? progress : operation.progress,
      lastUpdated: now.toISOString(),
      updatedAt: now
    };

    // Если операция завершена, устанавливаем endTime и рассчитываем duration
    if (status === 'completed' && !operation.endTime) {
      updatedOperation.endTime = now.toISOString();
      updatedOperation.duration = this.calculateDuration(operation.startTime, updatedOperation.endTime);
      updatedOperation.progress = 100;
    }

    return updatedOperation;
  }

  /**
   * Проверяет возможность отмены операции
   */
  static canCancelOperation(operation: Operation): boolean {
    return operation.status === 'pending' || operation.status === 'in_progress';
  }

  /**
   * Получает доступные методы оплаты для типа операции
   */
  static getAvailablePaymentMethods(operationType: OperationType): PaymentMethod[] {
    switch (operationType) {
      case 'sale':
        return ['bank_card', 'cash', 'corporate_card', 'fuel_card', 'online_order'];
      case 'refund':
        return ['bank_card', 'cash'];
      case 'maintenance':
      case 'tank_loading':
      case 'diagnostics':
      case 'sensor_calibration':
        return []; // Технические операции не требуют оплаты
      default:
        return ['cash'];
    }
  }

  /**
   * Форматирует операцию для отображения
   */
  static formatOperationForDisplay(operation: Operation): {
    title: string;
    subtitle: string;
    statusText: string;
    amountText?: string;
  } {
    const statusMap: Record<OperationStatus, string> = {
      'pending': 'Ожидает',
      'in_progress': 'В процессе',
      'completed': 'Завершена',
      'failed': 'Ошибка',
      'cancelled': 'Отменена'
    };

    const typeMap: Record<OperationType, string> = {
      'sale': 'Продажа',
      'refund': 'Возврат',
      'correction': 'Коррекция',
      'maintenance': 'Обслуживание',
      'tank_loading': 'Загрузка резервуара',
      'diagnostics': 'Диагностика',
      'sensor_calibration': 'Калибровка датчиков'
    };

    let title = typeMap[operation.operationType] || operation.operationType;
    if (operation.fuelType) {
      title += ` ${operation.fuelType}`;
    }

    let subtitle = operation.details;
    if (operation.tradingPointName) {
      subtitle = `${operation.tradingPointName} - ${subtitle}`;
    }

    const amountText = operation.totalCost 
      ? `${operation.totalCost.toFixed(2)} ₽`
      : undefined;

    return {
      title,
      subtitle,
      statusText: statusMap[operation.status],
      amountText
    };
  }

  /**
   * Группирует операции по дате
   */
  static groupOperationsByDate(operations: Operation[]): Record<string, Operation[]> {
    const grouped: Record<string, Operation[]> = {};

    operations.forEach(operation => {
      const date = new Date(operation.startTime).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(operation);
    });

    return grouped;
  }

  /**
   * Фильтрует операции по критериям
   */
  static filterOperations(
    operations: Operation[],
    filters: {
      status?: OperationStatus;
      operationType?: OperationType;
      tradingPointId?: string;
      dateFrom?: string;
      dateTo?: string;
      paymentMethod?: PaymentMethod;
    }
  ): Operation[] {
    return operations.filter(operation => {
      if (filters.status && operation.status !== filters.status) {
        return false;
      }

      if (filters.operationType && operation.operationType !== filters.operationType) {
        return false;
      }

      if (filters.tradingPointId && operation.tradingPointId !== filters.tradingPointId) {
        return false;
      }

      if (filters.paymentMethod && operation.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      if (filters.dateFrom) {
        const operationDate = new Date(operation.startTime);
        const fromDate = new Date(filters.dateFrom);
        if (operationDate < fromDate) {
          return false;
        }
      }

      if (filters.dateTo) {
        const operationDate = new Date(operation.startTime);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Конец дня
        if (operationDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Сортирует операции
   */
  static sortOperations(
    operations: Operation[],
    sortBy: 'date' | 'amount' | 'status' = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): Operation[] {
    const sorted = [...operations].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'amount':
          const aAmount = a.totalCost || 0;
          const bAmount = b.totalCost || 0;
          comparison = aAmount - bAmount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Вычисляет статистику операций
   */
  static calculateOperationsStatistics(operations: Operation[]): {
    total: number;
    byStatus: Record<OperationStatus, number>;
    byType: Record<OperationType, number>;
    totalRevenue: number;
    averageAmount: number;
    todayOperations: number;
  } {
    const stats = {
      total: operations.length,
      byStatus: {} as Record<OperationStatus, number>,
      byType: {} as Record<OperationType, number>,
      totalRevenue: 0,
      averageAmount: 0,
      todayOperations: 0
    };

    const today = new Date().toISOString().split('T')[0];
    let totalAmount = 0;
    let salesCount = 0;

    operations.forEach(operation => {
      // Счетчики по статусу
      stats.byStatus[operation.status] = (stats.byStatus[operation.status] || 0) + 1;
      
      // Счетчики по типу
      stats.byType[operation.operationType] = (stats.byType[operation.operationType] || 0) + 1;

      // Подсчет выручки (только завершенные продажи)
      if (operation.status === 'completed' && operation.operationType === 'sale' && operation.totalCost) {
        stats.totalRevenue += operation.totalCost;
        totalAmount += operation.totalCost;
        salesCount++;
      }

      // Операции сегодня
      const operationDate = new Date(operation.startTime).toISOString().split('T')[0];
      if (operationDate === today) {
        stats.todayOperations++;
      }
    });

    stats.averageAmount = salesCount > 0 ? totalAmount / salesCount : 0;

    return stats;
  }
}